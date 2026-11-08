// ═══════════════════════════════════════════════════════════════════════════
// Omnilector — Integración con Google Drive y OneDrive (EPUB + Cómics)
// ═══════════════════════════════════════════════════════════════════════════

window.OmnilectorCloud = (() => {
  const KEY = 'omnilector.cloud';
  const cfg = () => {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '{}');
    } catch (e) {
      return {};
    }
  };
  const saveCfg = (c) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(c));
    } catch (e) {}
  };
  const errText = async (r) => {
    try {
      const j = await r.json();
      return (j.error && (j.error.message || j.error)) || 'Error ' + r.status;
    } catch (e) {
      return 'Error ' + r.status;
    }
  };
  const loadScript = (src) =>
    new Promise((res, rej) => {
      if (document.querySelector(`script[src="${src}"]`)) return res();
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = res;
      s.onerror = () => rej(new Error('No se pudo cargar el inicio de sesión de Google. Revisa tu conexión.'));
      document.head.appendChild(s);
    });

  let gTok = null;
  async function googleToken() {
    const c = cfg();
    if (!c.gid) throw new Error('Falta el ID de cliente de Google.');
    if (gTok && gTok.exp > Date.now() + 30000) return gTok.token;
    await loadScript('https://accounts.google.com/gsi/client');
    return new Promise((res, rej) => {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: c.gid,
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        callback: (r) => {
          if (r.error) rej(new Error(r.error_description || r.error));
          else {
            gTok = { token: r.access_token, exp: Date.now() + (r.expires_in || 3600) * 1000 };
            res(r.access_token);
          }
        },
        error_callback: (e) =>
          rej(new Error(e && e.type === 'popup_closed' ? 'Se cerró la ventana de inicio de sesión.' : 'No se pudo iniciar sesión con Google.'))
      });
      client.requestAccessToken();
    });
  }

  const VALID_EXT = /\.(epub|cbz|cbr|cbt)$/i;

  async function googleList(q) {
    const t = await googleToken();
    const conds = [
      'trashed=false',
      "(mimeType='application/epub+zip' or name contains '.epub' or name contains '.cbz' or name contains '.cbr' or name contains '.cbt')"
    ];
    if (q) conds.push(`name contains '${q.replace(/['\\]/g, '')}'`);
    const url =
      'https://www.googleapis.com/drive/v3/files?' +
      new URLSearchParams({
        q: conds.join(' and '),
        fields: 'files(id,name,size,modifiedTime)',
        pageSize: '100',
        orderBy: 'modifiedTime desc',
        supportsAllDrives: 'true',
        includeItemsFromAllDrives: 'true'
      });
    const r = await fetch(url, { headers: { Authorization: 'Bearer ' + t } });
    if (!r.ok) throw new Error(await errText(r));
    const j = await r.json();
    return (j.files || [])
      .filter((f) => VALID_EXT.test(f.name) || true)
      .map((f) => ({ id: f.id, name: f.name, size: Number(f.size) || 0, src: 'google' }));
  }

  async function googleGet(it) {
    const t = await googleToken();
    const r = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(it.id)}?alt=media&supportsAllDrives=true`, {
      headers: { Authorization: 'Bearer ' + t }
    });
    if (!r.ok) throw new Error(await errText(r));
    return new File([await r.blob()], it.name);
  }

  /* Microsoft OneDrive (PKCE) */
  const redirect = () => location.origin + location.pathname;
  const b64url = (buf) =>
    btoa(String.fromCharCode(...new Uint8Array(buf)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  const rand = (n) => b64url(crypto.getRandomValues(new Uint8Array(n)));

  async function msLogin() {
    const c = cfg();
    if (!c.msid) throw new Error('Falta el ID de aplicación de Microsoft.');
    const verifier = rand(48);
    const state = rand(12);
    const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
    try {
      sessionStorage.setItem('omnilector.ms', JSON.stringify({ verifier, state }));
    } catch (e) {}
    location.href =
      'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?' +
      new URLSearchParams({
        client_id: c.msid,
        response_type: 'code',
        redirect_uri: redirect(),
        response_mode: 'query',
        scope: 'Files.Read',
        code_challenge: challenge,
        code_challenge_method: 'S256',
        state
      });
  }

  async function msFinish() {
    const p = new URLSearchParams(location.search);
    if (!p.get('code') && !p.get('error')) return null;
    let saved = null;
    try {
      saved = JSON.parse(sessionStorage.getItem('omnilector.ms') || 'null');
    } catch (e) {}
    history.replaceState(null, '', location.pathname);
    if (p.get('error')) return { error: p.get('error_description') || p.get('error') };
    if (!saved || saved.state !== p.get('state')) return null;
    const r = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: cfg().msid,
        grant_type: 'authorization_code',
        code: p.get('code'),
        redirect_uri: redirect(),
        code_verifier: saved.verifier,
        scope: 'Files.Read'
      })
    });
    const j = await r.json();
    if (!r.ok) return { error: j.error_description || j.error || 'No se pudo iniciar sesión con Microsoft.' };
    try {
      sessionStorage.setItem('omnilector.mstok', JSON.stringify({ token: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 }));
      sessionStorage.removeItem('omnilector.ms');
    } catch (e) {}
    return { ok: true };
  }

  const msToken = () => {
    try {
      const t = JSON.parse(sessionStorage.getItem('omnilector.mstok') || 'null');
      return t && t.exp > Date.now() + 30000 ? t.token : null;
    } catch (e) {
      return null;
    }
  };

  async function msList(q) {
    const t = msToken();
    if (!t) {
      await msLogin();
      return null;
    }
    const url = `https://graph.microsoft.com/v1.0/me/drive/root/search(q='${encodeURIComponent((q || 'epub').replace(/'/g, "''"))}')?$top=200&$select=id,name,size,file`;
    const r = await fetch(url, { headers: { Authorization: 'Bearer ' + t } });
    if (!r.ok) throw new Error(await errText(r));
    const j = await r.json();
    return (j.value || [])
      .filter((f) => f.file && VALID_EXT.test(f.name))
      .map((f) => ({ id: f.id, name: f.name, size: f.size || 0, src: 'ms' }));
  }

  async function msGet(it) {
    const t = msToken();
    if (!t) throw new Error('La sesión de Microsoft caducó. Vuelve a conectar.');
    const m = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(it.id)}?$select=id,name,@microsoft.graph.downloadUrl`, {
      headers: { Authorization: 'Bearer ' + t }
    });
    if (!m.ok) throw new Error(await errText(m));
    const url = (await m.json())['@microsoft.graph.downloadUrl'];
    if (!url) throw new Error('OneDrive no entregó un enlace de descarga.');
    const r = await fetch(url);
    if (!r.ok) throw new Error('Error ' + r.status + ' al descargar.');
    return new File([await r.blob()], it.name);
  }

  return { cfg, saveCfg, googleList, googleGet, msList, msGet, msFinish, msToken, redirect };
})();

