// ═══════════════════════════════════════════════════════════════════════════
// Omnilector — Lógica Principal de la Aplicación Combinada
// Pestañas separadas (Libros EPUB y Cómics CBZ/CBR/CBT) + Categorías compartidas
// Diseño Material Design 3 (Material You) · Compatible con Web/PWA y Capacitor
// ═══════════════════════════════════════════════════════════════════════════

(() => {
  'use strict';

  const FolioCore = window.FolioCore;
  const VinetasCore = window.VinetasCore;
  const DB = window.OmnilectorDB;
  const Cloud = window.OmnilectorCloud;

  const $ = (s, r = document) => r.querySelector(s);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const icon = (name, cls = '') => `<svg class="ic ${cls}"><use href="#i-${name}"/></svg>`;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const IS_PWA = !!window.__PWA__;
  const el = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };
  const FORMAT_LABEL = { zip: 'CBZ', rar: 'CBR', tar: 'CBT' };

  /* ════════ Ajustes, Temas y Paleta Dinámica Material You ════════ */
  const prefersDark = matchMedia('(prefers-color-scheme: dark)').matches;
  const settings = {
    theme: 'auto',
    accent: '#6750a4',
    readTheme: prefersDark ? 'dark' : 'light',
    paging: 'page',
    fontSize: 19,
    font: 'serif',
    lh: 1.6,
    rtl: false,
    fit: 'page',
    keepAwake: true,
    zones: true,
    cat: 'all',
    filter: 'all'
  };
  try {
    Object.assign(settings, JSON.parse(localStorage.getItem('omnilector.settings') || '{}'));
  } catch (e) {}
  const saveSettings = () => {
    try {
      localStorage.setItem('omnilector.settings', JSON.stringify(settings));
    } catch (e) {}
  };
  const hostTheme = document.documentElement.getAttribute('data-theme');

  function applyTheme() {
    const root = document.documentElement;
    if (settings.theme === 'auto') {
      if (hostTheme) root.setAttribute('data-theme', hostTheme);
      else root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', settings.theme);
    }
    applyAccent();
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', getComputedStyle(document.body).backgroundColor);
  }
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyTheme);

  const hexToRgb = (h) => {
    const m = /^#?([0-9a-f]{6})$/i.exec(h || '');
    const n = parseInt(m ? m[1] : '6750a4', 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const isDarkActive = () => {
    const dt = document.documentElement.getAttribute('data-theme');
    if (dt === 'dark') return true;
    if (dt === 'light') return false;
    return matchMedia('(prefers-color-scheme: dark)').matches;
  };

  function applyAccent() {
    const [r, g, b] = hexToRgb(settings.accent);
    const dark = isDarkActive();
    const st = document.documentElement.style;
    st.setProperty('--accent', settings.accent);
    st.setProperty('--accent-soft', `rgba(${r},${g},${b},${dark ? 0.22 : 0.14})`);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    st.setProperty('--on-accent', lum > 0.62 ? '#141218' : '#ffffff');
    if (dark) {
      st.setProperty('--accent-container', `rgba(${Math.round(r * 0.45)}, ${Math.round(g * 0.45)}, ${Math.round(b * 0.45)}, 0.55)`);
      st.setProperty('--on-accent-container', '#f2ecff');
    } else {
      st.setProperty('--accent-container', `rgba(${r}, ${g}, ${b}, 0.16)`);
      st.setProperty('--on-accent-container', `rgb(${Math.round(r * 0.38)}, ${Math.round(g * 0.38)}, ${Math.round(b * 0.38)})`);
    }
  }

  const FONTS = {
    serif: 'ui-serif, "Iowan Old Style", Charter, Georgia, "Noto Serif", serif',
    sans: 'Roboto, -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, "Segoe UI", sans-serif',
    classic: '"Palatino Linotype", Palatino, "Book Antiqua", "Hoefler Text", Baskerville, Georgia, serif'
  };
  const RT = {
    light: {
      name: 'Claro', bg: '#ffffff', ink: '#1c1c1e', link: '#0a60d6', rule: 'rgba(0,0,0,0.18)', dim: 'rgba(60,60,67,0.55)', bar: 'rgba(250,250,252,0.9)', sep: 'rgba(60,60,67,0.2)',
      sheet: { bg: '#fef7ff', surface: '#f7f2fa', surface2: '#f3edf7', fg: '#1d1b20', fg2: '#49454f', fg3: '#79747e', sep: '#cac4d0', fill: 'rgba(103,80,164,0.08)', fill2: 'rgba(103,80,164,0.16)', thumb: '#e8def8', scheme: 'light' }
    },
    gray: {
      name: 'Gris oscuro', bg: '#2e3035', ink: '#d6d8dd', link: '#8ab8ff', rule: 'rgba(255,255,255,0.2)', dim: 'rgba(214,216,221,0.5)', bar: 'rgba(40,42,46,0.9)', sep: 'rgba(255,255,255,0.14)',
      sheet: { bg: '#25272b', surface: '#33363b', surface2: '#3b3e44', fg: '#eceef2', fg2: 'rgba(236,238,242,0.62)', fg3: 'rgba(236,238,242,0.3)', sep: 'rgba(255,255,255,0.14)', fill: 'rgba(255,255,255,0.1)', fill2: 'rgba(255,255,255,0.18)', thumb: '#5b5f67', scheme: 'dark' }
    },
    dark: {
      name: 'Oscuro', bg: '#000000', ink: '#bcbcc2', link: '#6da7ff', rule: 'rgba(255,255,255,0.18)', dim: 'rgba(188,188,194,0.48)', bar: 'rgba(14,14,16,0.9)', sep: 'rgba(255,255,255,0.12)',
      sheet: { bg: '#141218', surface: '#1d1b20', surface2: '#211f26', fg: '#e6e0e9', fg2: '#cac4d0', fg3: '#938f99', sep: '#49454f', fill: 'rgba(255,255,255,0.1)', fill2: 'rgba(255,255,255,0.18)', thumb: '#4a4458', scheme: 'dark' }
    },
    sepia: {
      name: 'Sepia', bg: '#f4ecd8', ink: '#5b4636', link: '#8a4a1c', rule: 'rgba(91,70,54,0.28)', dim: 'rgba(91,70,54,0.6)', bar: 'rgba(240,230,208,0.92)', sep: 'rgba(91,70,54,0.2)',
      sheet: { bg: '#ece1c8', surface: '#f7f0df', surface2: '#f2e9d3', fg: '#43342a', fg2: 'rgba(67,52,42,0.68)', fg3: 'rgba(67,52,42,0.35)', sep: 'rgba(67,52,42,0.2)', fill: 'rgba(91,70,54,0.1)', fill2: 'rgba(91,70,54,0.18)', thumb: '#fbf6ea', scheme: 'light' }
    }
  };
  const LHS = [{ value: 1.4, label: 'Compacto' }, { value: 1.6, label: 'Normal' }, { value: 1.85, label: 'Amplio' }];
  const THEME_OPTS = [{ value: 'auto', label: 'Automático' }, { value: 'light', label: 'Claro' }, { value: 'dark', label: 'Oscuro' }];
  const FIT_OPTS = [{ value: 'page', label: 'Página' }, { value: 'width', label: 'Ancho' }, { value: 'original', label: 'Original' }];
  const DIR_OPTS = [{ value: 'ltr', label: 'Izq. → Der.' }, { value: 'rtl', label: 'Der. → Izq.' }];

  if (!RT[settings.readTheme]) settings.readTheme = 'light';
  if (!FONTS[settings.font]) settings.font = 'serif';

  function setTokens(node, s) {
    const m = {
      '--bg': s.bg, '--surface': s.surface, '--surface-2': s.surface2, '--fg': s.fg, '--fg-2': s.fg2, '--fg-3': s.fg3,
      '--sep': s.sep, '--fill': s.fill, '--fill-strong': s.fill2, '--seg-thumb': s.thumb
    };
    for (const k in m) node.style.setProperty(k, m[k]);
    node.style.colorScheme = s.scheme;
  }
  function applyReadTheme() {
    const t = RT[settings.readTheme];
    const rd = $('#bookReader');
    const set = (k, v) => rd.style.setProperty(k, v);
    set('--r-bg', t.bg); set('--r-ink', t.ink); set('--r-dim', t.dim); set('--r-bar', t.bar); set('--r-sep', t.sep);
    set('--bk-ink', t.ink); set('--bk-link', t.link); set('--bk-rule', t.rule);
    rd.style.colorScheme = t.sheet.scheme;
    if (sheetState && sheetState.themed) setTokens(sheetState.sheet, t.sheet);
  }
  function applyBookVars() {
    const st = $('#bookReader').style;
    st.setProperty('--bk-size', settings.fontSize + 'px');
    st.setProperty('--bk-font', FONTS[settings.font]);
    st.setProperty('--bk-lh', String(settings.lh));
  }

  /* ════════ Utilidades de Imagen y Portada ════════ */
  async function decodeImage(blob) {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    try {
      await img.decode();
    } catch (e) {
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = () => {
          URL.revokeObjectURL(url);
          rej(new Error('Imagen no válida'));
        };
        if (img.complete && img.naturalWidth) res();
      });
    }
    return { img, url };
  }
  async function makeThumb(blob, width, quality = 0.8) {
    const { img, url } = await decodeImage(blob);
    const r = Math.min(1, width / img.naturalWidth);
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.naturalWidth * r));
    c.height = Math.max(1, Math.round(img.naturalHeight * r));
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url);
    return new Promise((res) => c.toBlob(res, 'image/jpeg', quality));
  }
  function wrapText(x, text, maxW) {
    const words = String(text).split(/\s+/);
    const lines = [];
    let cur = '';
    for (const w of words) {
      const t = cur ? cur + ' ' + w : w;
      if (x.measureText(t).width > maxW && cur) {
        lines.push(cur);
        cur = w;
      } else cur = t;
    }
    if (cur) lines.push(cur);
    return lines;
  }
  function fallbackCover(title, author) {
    const W = 360, H = 540;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const x = c.getContext('2d');
    let h = 0;
    for (const ch of title) h = (h * 31 + ch.charCodeAt(0)) % 360;
    const g = x.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, `hsl(${h},42%,30%)`);
    g.addColorStop(1, `hsl(${(h + 40) % 360},48%,18%)`);
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);
    x.strokeStyle = 'rgba(255,255,255,0.35)';
    x.lineWidth = 2;
    x.strokeRect(22, 22, W - 44, H - 44);
    x.fillStyle = '#fff';
    x.textAlign = 'center';
    x.textBaseline = 'alphabetic';
    x.font = '700 34px Georgia, "Times New Roman", serif';
    const lines = wrapText(x, title, W - 90).slice(0, 6);
    let y = 150;
    for (const l of lines) {
      x.fillText(l, W / 2, y);
      y += 42;
    }
    if (author) {
      x.font = '400 19px Georgia, serif';
      x.fillStyle = 'rgba(255,255,255,0.8)';
      wrapText(x, author, W - 90).slice(0, 2).forEach((l, i) => x.fillText(l, W / 2, H - 70 + i * 24));
    }
    return new Promise((res) => c.toBlob(res, 'image/jpeg', 0.85));
  }

  /* ════════ Avisos, Diálogos Material 3 y Bottom Sheets ════════ */
  const toastEl = $('#toast');
  let toastTimer = 0;
  function toast(html, ms = 2800) {
    toastEl.innerHTML = html;
    toastEl.classList.add('on');
    clearTimeout(toastTimer);
    if (ms) toastTimer = setTimeout(() => toastEl.classList.remove('on'), ms);
  }
  function alertShell(inner) {
    const wrap = el('div', 'alert-wrap');
    wrap.innerHTML = `<div class="alert" role="alertdialog" aria-modal="true">${inner}</div>`;
    $('#overlayRoot').appendChild(wrap);
    return wrap;
  }
  function confirmDialog({ title, message, confirmLabel, destructive = false, cancelLabel = 'Cancelar' }) {
    return new Promise((resolve) => {
      const wrap = alertShell(
        `<div class="alert-body"><b>${esc(title)}</b><p>${esc(message)}</p></div><div class="alert-actions"><button type="button" data-v="0">${esc(cancelLabel)}</button><button type="button" data-v="1" class="${destructive ? 'danger' : ''}">${esc(confirmLabel)}</button></div>`
      );
      const done = (v) => {
        wrap.remove();
        resolve(v);
      };
      wrap.addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (b) done(b.dataset.v === '1');
        else if (e.target === wrap) done(false);
      });
      wrap.querySelector('button').focus();
    });
  }
  function askText({ title, message = '', value = '', placeholder = '', confirmLabel = 'Guardar', validate = null }) {
    return new Promise((resolve) => {
      const wrap = alertShell(
        `<div class="alert-body"><b>${esc(title)}</b>${message ? `<p>${esc(message)}</p>` : ''}<input class="field" type="text" maxlength="40" autocomplete="off" placeholder="${esc(placeholder)}"><div class="err" role="alert"></div></div><div class="alert-actions"><button type="button" data-v="0">Cancelar</button><button type="button" data-v="1">${esc(confirmLabel)}</button></div>`
      );
      const input = $('.field', wrap), err = $('.err', wrap);
      input.value = value;
      const done = (v) => {
        wrap.remove();
        resolve(v);
      };
      const submit = () => {
        const v = input.value.trim();
        if (!v) {
          err.textContent = 'Escribe un nombre.';
          return;
        }
        const m = validate && validate(v);
        if (m) {
          err.textContent = m;
          return;
        }
        done(v);
      };
      wrap.addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (b) (b.dataset.v === '1' ? submit() : done(null));
        else if (e.target === wrap) done(null);
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          submit();
        } else if (e.key === 'Escape') done(null);
      });
      input.focus();
      input.select();
    });
  }

  let sheetState = null;
  function openSheet({ title, tall = false, themed = false, noScrim = false, build, onClose }) {
    closeSheet(true);
    const root = $('#overlayRoot');
    const scrim = el('div', 'scrim' + (noScrim ? ' clear' : ''));
    const sheet = el('div', 'sheet' + (tall ? ' tall' : ''));
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-label', title);
    sheet.innerHTML = `<div class="sheet-head"><div class="grabber"></div><div class="sheet-title">${esc(title)}</div><button class="sheet-done" type="button">Listo</button></div><div class="sheet-body"></div>`;
    if (themed) setTokens(sheet, RT[settings.readTheme].sheet);
    root.append(scrim, sheet);
    const body = $('.sheet-body', sheet);
    sheetState = { scrim, sheet, body, onClose, themed };
    build(body, sheetState);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      scrim.classList.add('on');
      sheet.classList.add('on');
    }));
    scrim.addEventListener('click', () => closeSheet());
    $('.sheet-done', sheet).addEventListener('click', () => closeSheet());
    const head = $('.sheet-head', sheet);
    let drag = null;
    head.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      drag = { y: e.clientY, dy: 0 };
      head.setPointerCapture(e.pointerId);
      sheet.classList.add('dragging');
    });
    head.addEventListener('pointermove', (e) => {
      if (!drag) return;
      drag.dy = Math.max(0, e.clientY - drag.y);
      sheet.style.transform = `translate(-50%, ${drag.dy}px)`;
    });
    const end = () => {
      if (!drag) return;
      const d = drag.dy;
      drag = null;
      sheet.classList.remove('dragging');
      sheet.style.transform = '';
      if (d > 90) closeSheet();
    };
    head.addEventListener('pointerup', end);
    head.addEventListener('pointercancel', end);
  }
  function closeSheet(immediate = false) {
    const s = sheetState;
    if (!s) return;
    sheetState = null;
    s.scrim.classList.remove('on');
    s.sheet.classList.remove('on');
    const remove = () => {
      s.scrim.remove();
      s.sheet.remove();
    };
    if (immediate || REDUCED) remove();
    else setTimeout(remove, 330);
    s.onClose && s.onClose();
  }

  /* ════════ Controles Material Design 3 Reutilizables ════════ */
  function segmented(options, value, onChange) {
    const node = el('div', 'seg');
    node.style.setProperty('--n', options.length);
    const sync = (v) => {
      node.style.setProperty('--i', Math.max(0, options.findIndex((o) => o.value === v)));
      [...node.children].forEach((b, i) => b.setAttribute('aria-pressed', String(options[i].value === v)));
    };
    options.forEach((o) => {
      const b = el('button');
      b.type = 'button';
      b.textContent = o.label;
      b.addEventListener('click', () => {
        sync(o.value);
        onChange(o.value);
      });
      node.appendChild(b);
    });
    sync(value);
    return node;
  }
  function switchRow(label, sub, checked, onChange) {
    const row = el('label', 'row', `<span class="label">${esc(label)}${sub ? `<div class="sub">${esc(sub)}</div>` : ''}</span><span class="switch"><input type="checkbox" role="switch"></span>`);
    const input = $('input', row);
    input.checked = checked;
    input.addEventListener('change', () => onChange(input.checked));
    return row;
  }
  function stackRow(label, control, sub) {
    const row = el('div', 'row stack', `<span class="label">${esc(label)}${sub ? `<div class="sub">${esc(sub)}</div>` : ''}</span>`);
    row.appendChild(control);
    return row;
  }
  const group = (...rows) => {
    const g = el('div', 'group');
    rows.forEach((r) => r && g.appendChild(r));
    return g;
  };
  const groupTitle = (t) => el('div', 'group-title', esc(t));

  const ACCENTS = ['#6750a4', '#0061a4', '#006a60', '#386a20', '#8b5000', '#b3261e', '#984061', '#5856d6', '#49454f'];
  function accentPicker() {
    const box = el('div', 'swatches');
    const isPreset = (h) => ACCENTS.includes(h.toLowerCase());
    const sync = () => {
      [...box.querySelectorAll('.swatch:not(.custom)')].forEach((b) =>
        b.setAttribute('aria-pressed', String(b.dataset.c === settings.accent.toLowerCase()))
      );
      const cu = $('.swatch.custom', box);
      cu.setAttribute('aria-pressed', String(!isPreset(settings.accent)));
      cu.style.setProperty('--sw', settings.accent);
    };
    ACCENTS.forEach((c) => {
      const b = el('button', 'swatch', icon('check'));
      b.type = 'button';
      b.dataset.c = c;
      b.style.background = c;
      b.setAttribute('aria-label', 'Color ' + c);
      b.addEventListener('click', () => {
        settings.accent = c;
        saveSettings();
        applyAccent();
        sync();
      });
      box.appendChild(b);
    });
    const cu = el('label', 'swatch custom', '<input type="color" aria-label="Elegir otro color">');
    const inp = $('input', cu);
    inp.value = settings.accent;
    inp.addEventListener('input', () => {
      settings.accent = inp.value.toLowerCase();
      applyAccent();
      sync();
    });
    inp.addEventListener('change', saveSettings);
    box.appendChild(cu);
    sync();
    return box;
  }

  function themeTiles(onChange) {
    const box = el('div', 'themes');
    const sync = () => [...box.children].forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.k === settings.readTheme)));
    for (const k of Object.keys(RT)) {
      const t = RT[k];
      const b = el('button', 'theme-tile', `<span class="dot" style="background:${t.bg};color:${t.ink}">Aa</span><span>${t.name}</span>`);
      b.type = 'button';
      b.dataset.k = k;
      b.addEventListener('click', () => {
        settings.readTheme = k;
        saveSettings();
        sync();
        onChange('readTheme');
      });
      box.appendChild(b);
    }
    sync();
    return box;
  }

  const FS_MIN = 13, FS_MAX = 34;
  function sizer(onChange) {
    const row = el(
      'div',
      'sizer',
      `<span class="a" style="font-size:14px">A</span><input class="slider" type="range" min="${FS_MIN}" max="${FS_MAX}" step="1" aria-label="Tamaño de letra"><span class="a" style="font-size:24px">A</span><span class="val"></span>`
    );
    const input = $('input', row), val = $('.val', row);
    const sync = () => {
      input.value = String(settings.fontSize);
      val.textContent = settings.fontSize + ' px';
    };
    input.addEventListener('input', () => {
      settings.fontSize = Number(input.value);
      val.textContent = settings.fontSize + ' px';
      applyBookVars();
      onChange('fontSize');
    });
    input.addEventListener('change', saveSettings);
    sync();
    return row;
  }

  function epubReadingControls(container, { preview = false } = {}) {
    const onChange = (what) => {
      if (what === 'readTheme') {
        applyReadTheme();
        updatePreview();
      }
      if (what === 'paging') {
        saveSettings();
        RB && rebuildBook();
        return;
      }
      if (what === 'fontSize' || what === 'font' || what === 'lh') {
        applyBookVars();
        RB && scheduleRelayout();
        updatePreview();
      }
      saveSettings();
    };
    let pv = null;
    const updatePreview = () => {
      if (!pv) return;
      const t = RT[settings.readTheme];
      pv.style.background = t.bg;
      pv.style.color = t.ink;
      pv.style.fontFamily = FONTS[settings.font];
      pv.style.setProperty('--pv-size', settings.fontSize + 'px');
      pv.style.setProperty('--pv-lh', String(settings.lh));
    };
    const rows = [
      stackRow('Tema de lectura', themeTiles(onChange)),
      stackRow('Tamaño de letra', sizer(onChange)),
      stackRow('Paginado', segmented([{ value: 'page', label: 'Lateral' }, { value: 'scroll', label: 'Vertical' }], settings.paging, (v) => { settings.paging = v; onChange('paging'); })),
      stackRow('Tipografía', segmented([{ value: 'serif', label: 'Serif' }, { value: 'sans', label: 'Sans' }, { value: 'classic', label: 'Clásica' }], settings.font, (v) => { settings.font = v; onChange('font'); })),
      stackRow('Interlineado', segmented(LHS.map((o) => ({ value: o.value, label: o.label })), settings.lh, (v) => { settings.lh = v; onChange('lh'); }))
    ];
    const g = group(...rows);
    if (preview) {
      pv = el('div', 'preview', 'La lectura es una conversación tranquila. Ajusta el tamaño, la tipografía y el tema hasta que el texto sea cómodo.');
      updatePreview();
      container.appendChild(pv);
    }
    container.appendChild(g);
    return g;
  }

  function comicReadingControls(container, comic) {
    const effRtl = comic ? (comic.rtl ?? settings.rtl) : settings.rtl;
    const dir = segmented(DIR_OPTS, effRtl ? 'rtl' : 'ltr', (v) => {
      if (comic) {
        comic.rtl = v === 'rtl';
        persistComicMeta(comic);
        RC && layoutAllComic();
      } else {
        settings.rtl = v === 'rtl';
        saveSettings();
      }
    });
    const g = group(
      stackRow(comic ? 'Dirección de lectura de este cómic' : 'Dirección de lectura (Cómics / Manga)', dir, comic ? null : 'Para manga elige Der. → Izq. Cada cómic puede personalizarla.'),
      stackRow('Ajuste de página', segmented(FIT_OPTS, settings.fit, (v) => { settings.fit = v; saveSettings(); RC && refitComic(true); }))
    );
    container.appendChild(g);
    return g;
  }

  /* ════════ Estado de Biblioteca (Pestañas Libros y Cómics + Categorías Compartidas) ════════ */
  let books = [];
  let comics = [];
  let cats = [];
  const coverUrls = new Map();
  let activeTab = 'books'; // 'books' | 'comics' | 'settings'
  let selecting = null;
  let query = '';

  const coverUrl = (item) => {
    if (!item.cover) return '';
    if (!coverUrls.has(item.id)) coverUrls.set(item.id, URL.createObjectURL(item.cover));
    return coverUrls.get(item.id);
  };
  const bookPct = (b) => clamp(b.progress || 0, 0, 1);
  const isBookStarted = (b) => (b.progress || 0) > 0.003 && !b.done;
  const comicPct = (c) => (c.pages > 1 ? clamp(c.page / (c.pages - 1), 0, 1) : 0);
  const isComicStarted = (c) => c.page > 0 && !c.done;

  const sortBooks = () => books.sort((a, b) => (b.lastRead || b.added) - (a.lastRead || a.added));
  const sortComics = () => comics.sort((a, b) => (b.lastRead || b.added) - (a.lastRead || a.added));
  const sortCats = () => cats.sort((a, b) => (a.order || 0) - (b.order || 0));

  async function loadLibrary() {
    books = await DB.all('books');
    comics = await DB.all('comics');
    cats = await DB.all('cats');
    sortBooks();
    sortComics();
    sortCats();
    if (settings.cat !== 'all' && !cats.some((c) => c.id === settings.cat)) settings.cat = 'all';
    renderLibrary();
  }

  function renderFilterSeg() {
    const seg = $('#filterSeg');
    if (!seg) return;
    const opts = [
      { value: 'all', label: 'Todos' },
      { value: 'reading', label: 'En curso' },
      { value: 'done', label: 'Leídos' }
    ];
    const node = segmented(opts, settings.filter, (v) => {
      settings.filter = v;
      saveSettings();
      renderLibrary();
    });
    seg.replaceWith(node);
    node.id = 'filterSeg';
    node.classList.add('filter-seg');
  }

  function renderChips() {
    const box = $('#chips');
    const pool = activeTab === 'comics' ? comics : books;
    const chip = (key, label, n) =>
      `<button class="chip" type="button" data-cat="${esc(key)}" aria-pressed="${settings.cat === key}">${settings.cat === key ? icon('check') : ''}${esc(label)}${n != null ? ` <span>${n}</span>` : ''}</button>`;
    let html = chip('all', 'Todas', pool.length);
    for (const c of cats) {
      const count = pool.filter((item) => item.cat === c.id).length;
      html += chip(c.id, c.name, count);
    }
    html += `<button class="chip ghost" type="button" data-act="newcat">+ Nueva</button>`;
    if (cats.length) html += `<button class="chip ghost" type="button" data-act="editcats">Editar</button>`;
    box.innerHTML = html;
  }

  function visibleBooks() {
    const q = query.trim().toLowerCase();
    return books.filter((b) => {
      if (settings.cat !== 'all' && b.cat !== settings.cat) return false;
      if (q && !(b.title + ' ' + (b.author || '')).toLowerCase().includes(q)) return false;
      if (settings.filter === 'reading') return isBookStarted(b);
      if (settings.filter === 'done') return !!b.done;
      return true;
    });
  }

  function visibleComics() {
    const q = query.trim().toLowerCase();
    return comics.filter((c) => {
      if (settings.cat !== 'all' && c.cat !== settings.cat) return false;
      if (q && !c.name.toLowerCase().includes(q)) return false;
      if (settings.filter === 'reading') return isComicStarted(c);
      if (settings.filter === 'done') return !!c.done;
      return true;
    });
  }

  function renderLibrary() {
    const isComics = activeTab === 'comics';
    const pool = isComics ? comics : books;
    const hasAny = pool.length > 0 || cats.length > 0;
    const box = $('#libContent');

    $('#libTitle').textContent = isComics ? 'Cómics' : 'Libros';
    $('#libCount').textContent = `${pool.length} ${isComics ? (pool.length === 1 ? 'cómic' : 'cómics') : (pool.length === 1 ? 'libro' : 'libros')}`;
    $('#searchInput').placeholder = isComics ? 'Buscar cómic o manga…' : 'Buscar libro por título o autor…';
    $('#fabLabel').textContent = isComics ? 'Añadir cómic' : 'Añadir libro';

    $('#libTools').hidden = pool.length === 0 && cats.length === 0;
    $('#selectBtn').style.visibility = pool.length > 0 ? 'visible' : 'hidden';
    $('#libraryScreen').classList.toggle('selecting', !!selecting);
    $('#selectBtn').textContent = selecting ? 'Listo' : 'Seleccionar';

    if (pool.length === 0) {
      if (cats.length > 0) renderChips();
      box.innerHTML = isComics
        ? `<div class="empty">
            <div class="empty-art">${icon('comic')}</div>
            <h2>Tu biblioteca de cómics está vacía</h2>
            <p>Añade tus cómics o mangas en formato CBZ, CBR o CBT desde tu dispositivo o la nube. Se guardan para leer sin conexión.</p>
            <div class="formats"><span class="pill">CBZ</span><span class="pill">CBR</span><span class="pill">CBT</span><span class="pill">ZIP</span><span class="pill">RAR</span></div>
            <button class="btn primary" type="button" data-act="add">${icon('plus')} Añadir cómics</button>
            <button class="btn tonal" type="button" data-act="cloud">${icon('cloud')} Desde Google Drive u OneDrive</button>
          </div>`
        : `<div class="empty">
            <div class="empty-art">${icon('book')}</div>
            <h2>Tu biblioteca de libros está vacía</h2>
            <p>Añade libros EPUB desde tu dispositivo, Google Drive u OneDrive. Organízalos por categorías compartidas.</p>
            <div class="formats"><span class="pill">EPUB 2</span><span class="pill">EPUB 3</span></div>
            <button class="btn primary" type="button" data-act="add">${icon('plus')} Añadir libros EPUB</button>
            <button class="btn tonal" type="button" data-act="cloud">${icon('cloud')} Desde Google Drive u OneDrive</button>
          </div>`;
      return;
    }

    renderChips();
    const list = isComics ? visibleComics() : visibleBooks();
    let html = '';

    if (!query && settings.cat === 'all' && settings.filter === 'all' && !selecting) {
      if (isComics) {
        const resume = comics.find(isComicStarted);
        if (resume) {
          html += `<div class="section-label">Continuar leyendo</div>
          <button class="resume" type="button" data-open="${resume.id}" data-type="comic">
            <span class="resume-cover"><img alt="" src="${coverUrl(resume)}"></span>
            <span class="resume-body">
              <span class="resume-title">${esc(resume.name)}</span>
              <span class="resume-sub">Página ${resume.page + 1} de ${resume.pages} · ${Math.round(comicPct(resume) * 100)}%</span>
              <span class="bar"><i style="width:${Math.round(comicPct(resume) * 100)}%"></i></span>
            </span>
            <span class="resume-go">Seguir</span>
          </button>`;
        }
      } else {
        const resume = books.find(isBookStarted);
        if (resume) {
          html += `<div class="section-label">Continuar leyendo</div>
          <button class="resume" type="button" data-open="${resume.id}" data-type="book">
            <span class="resume-cover"><img alt="" src="${coverUrl(resume)}"></span>
            <span class="resume-body">
              <span class="resume-title">${esc(resume.title)}</span>
              <span class="resume-sub">${esc(resume.author || 'Autor desconocido')} · ${Math.round(bookPct(resume) * 100)}%</span>
              <span class="bar"><i style="width:${Math.round(bookPct(resume) * 100)}%"></i></span>
            </span>
            <span class="resume-go">Seguir</span>
          </button>`;
        }
      }
    }

    if (!list.length) {
      html += `<div class="list-empty">${
        query
          ? `No hay ${isComics ? 'cómics' : 'libros'} que coincidan con “${esc(query)}”.`
          : settings.cat !== 'all'
          ? `No hay ${isComics ? 'cómics' : 'libros'} en la categoría “${esc(catName(settings.cat))}”.<br>Pulsa Seleccionar, elige elementos y usa <b>Categoría</b> para moverlos aquí.`
          : settings.filter === 'done'
          ? `Aún no has terminado ningún ${isComics ? 'cómic' : 'libro'}.`
          : `No tienes ${isComics ? 'cómics' : 'libros'} en curso.`
      }</div>`;
    } else {
      html += '<div class="grid">' + list.map((item) => {
        const sel = selecting && selecting.has(item.id);
        const cName = item.cat ? catName(item.cat) : '';
        if (isComics) {
          const sub = item.done ? 'Leído' : isComicStarted(item) ? `Pág. ${item.page + 1} de ${item.pages}` : `${item.pages} págs`;
          const fmt = FORMAT_LABEL[item.format] || 'CBZ';
          return `<button class="item-card is-comic${sel ? ' selected' : ''}" type="button" data-id="${item.id}" data-type="comic">
            <span class="item-cover">
              <img alt="" loading="lazy" src="${coverUrl(item)}">
              <span class="badge-fmt">${esc(fmt)}</span>
              ${isComicStarted(item) ? `<span class="bar"><i style="width:${Math.round(comicPct(item) * 100)}%"></i></span>` : ''}
              <span class="check">${icon('check')}</span>
            </span>
            <span class="item-title">${esc(item.name)}</span>
            <span class="item-meta">${esc(sub)}</span>
            ${cName && settings.cat === 'all' ? `<span class="badge-cat">${esc(cName)}</span>` : ''}
          </button>`;
        } else {
          const sub = item.done ? 'Leído' : isBookStarted(item) ? Math.round(bookPct(item) * 100) + '%' : (item.author || 'Sin leer');
          return `<button class="item-card is-book${sel ? ' selected' : ''}" type="button" data-id="${item.id}" data-type="book">
            <span class="item-cover">
              <img alt="" loading="lazy" src="${coverUrl(item)}">
              <span class="badge-fmt">EPUB</span>
              ${isBookStarted(item) ? `<span class="bar"><i style="width:${Math.round(bookPct(item) * 100)}%"></i></span>` : ''}
              <span class="check">${icon('check')}</span>
            </span>
            <span class="item-title">${esc(item.title)}</span>
            <span class="item-meta">${esc(sub)}</span>
            ${cName && settings.cat === 'all' ? `<span class="badge-cat">${esc(cName)}</span>` : ''}
          </button>`;
        }
      }).join('') + '</div>';
    }

    box.innerHTML = html;
    const n = selecting ? selecting.size : 0;
    $('#selCount').textContent = n ? `${n} elegido${n > 1 ? 's' : ''}` : isComics ? 'Elige cómics' : 'Elige libros';
    $('#selDelete').disabled = n === 0;
    $('#selMove').disabled = n === 0;
  }

  /* ════════ Eventos de Biblioteca y Pestañas ════════ */
  $('#libContent').addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]');
    if (act) {
      const a = act.dataset.act;
      if (a === 'add') openAddSheet();
      else if (a === 'cloud') openCloudSheet();
      return;
    }
    const open = e.target.closest('[data-open]');
    if (open) {
      if (open.dataset.type === 'comic') openComicReader(open.dataset.open);
      else openBookReader(open.dataset.open);
      return;
    }
    const card = e.target.closest('.item-card');
    if (!card) return;
    if (selecting) {
      const id = card.dataset.id;
      selecting.has(id) ? selecting.delete(id) : selecting.add(id);
      renderLibrary();
    } else {
      if (card.dataset.type === 'comic') openComicReader(card.dataset.id);
      else openBookReader(card.dataset.id);
    }
  });

  $('#chips').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.cat) {
      settings.cat = b.dataset.cat;
      saveSettings();
      renderLibrary();
      return;
    }
    if (b.dataset.act === 'newcat') createCategoryFlow();
    else if (b.dataset.act === 'editcats') openCategoriesSheet();
  });

  $('#selectBtn').addEventListener('click', () => {
    selecting = selecting ? null : new Set();
    renderLibrary();
  });
  $('#selCancel').addEventListener('click', () => {
    selecting = null;
    renderLibrary();
  });
  $('#selDelete').addEventListener('click', async () => {
    const ids = [...(selecting || [])];
    if (!ids.length) return;
    const isComics = activeTab === 'comics';
    const labelSing = isComics ? 'cómic' : 'libro';
    const labelPlur = isComics ? 'cómics' : 'libros';
    const ok = await confirmDialog({
      title: ids.length === 1 ? `¿Eliminar este ${labelSing}?` : `¿Eliminar ${ids.length} ${labelPlur}?`,
      message: 'Se borrarán de la biblioteca de este dispositivo. Tus archivos originales no se tocan.',
      confirmLabel: 'Eliminar',
      destructive: true
    });
    if (!ok) return;
    for (const id of ids) {
      if (isComics) await removeComic(id);
      else await removeBook(id);
    }
    selecting = null;
    renderLibrary();
    toast(ids.length === 1 ? `${isComics ? 'Cómic' : 'Libro'} eliminado` : `${ids.length} ${labelPlur} eliminados`);
  });
  $('#selMove').addEventListener('click', () => {
    const ids = [...(selecting || [])];
    if (ids.length) openMoveSheet(ids, activeTab);
  });

  async function removeBook(id) {
    try {
      await DB.del('books', id);
      await DB.del('files', id);
    } catch (e) {}
    if (coverUrls.has(id)) {
      URL.revokeObjectURL(coverUrls.get(id));
      coverUrls.delete(id);
    }
    books = books.filter((b) => b.id !== id);
  }
  async function removeComic(id) {
    try {
      await DB.del('comics', id);
      await DB.del('files', id);
    } catch (e) {}
    if (coverUrls.has(id)) {
      URL.revokeObjectURL(coverUrls.get(id));
      coverUrls.delete(id);
    }
    comics = comics.filter((c) => c.id !== id);
  }

  const searchInput = $('#searchInput');
  searchInput.addEventListener('input', () => {
    query = searchInput.value;
    $('#searchBox').classList.toggle('has-text', !!query);
    renderLibrary();
  });
  $('#searchClear').addEventListener('click', () => {
    searchInput.value = '';
    query = '';
    $('#searchBox').classList.remove('has-text');
    renderLibrary();
    searchInput.focus();
  });

  function watchLargeTitle(titleEl, navEl) {
    if (!('IntersectionObserver' in window)) return;
    const probe = el('div');
    probe.style.cssText = 'position:fixed;visibility:hidden;padding-top:env(safe-area-inset-top,0px)';
    document.body.appendChild(probe);
    const topInset = 56 + (parseFloat(getComputedStyle(probe).paddingTop) || 0);
    probe.remove();
    new IntersectionObserver(([en]) => navEl.classList.toggle('scrolled', !en.isIntersecting), {
      rootMargin: `-${topInset}px 0px 0px 0px`,
      threshold: 0
    }).observe(titleEl);
  }
  watchLargeTitle($('#libTitle'), $('#libNav'));
  watchLargeTitle($('#setTitle'), $('#setNav'));

  function setTab(t) {
    activeTab = t;
    if (selecting) selecting = null;
    const isLib = t === 'books' || t === 'comics';
    $('#libraryScreen').hidden = !isLib;
    $('#settingsScreen').hidden = t !== 'settings';
    $('#fabAdd').hidden = !isLib;
    $('#tabBooks').setAttribute('aria-selected', String(t === 'books'));
    $('#tabComics').setAttribute('aria-selected', String(t === 'comics'));
    $('#tabSettings').setAttribute('aria-selected', String(t === 'settings'));
    if (isLib) renderLibrary();
    else renderSettings();
    window.scrollTo(0, 0);
  }
  $('#tabBooks').addEventListener('click', () => setTab('books'));
  $('#tabComics').addEventListener('click', () => setTab('comics'));
  $('#tabSettings').addEventListener('click', () => setTab('settings'));

  /* ════════ Sistema de Categorías Compartidas (Libros + Cómics) ════════ */
  const catName = (id) => (cats.find((c) => c.id === id) || {}).name || '';
  const nameTaken = (v, exceptId) =>
    cats.some((c) => c.id !== exceptId && c.name.toLowerCase() === v.toLowerCase()) ? 'Ya existe una categoría con ese nombre.' : '';

  async function createCategory(name) {
    const c = { id: uid(), name, order: cats.reduce((m, x) => Math.max(m, x.order || 0), 0) + 1 };
    await DB.put('cats', c);
    cats.push(c);
    sortCats();
    return c;
  }
  async function createCategoryFlow() {
    const name = await askText({
      title: 'Nueva categoría',
      message: 'Las categorías son compartidas entre Libros y Cómics (ej. Ciencia Ficción, Favoritos, Manga, Novela).',
      placeholder: 'Nombre de la categoría',
      confirmLabel: 'Crear',
      validate: (v) => nameTaken(v)
    });
    if (!name) return null;
    const c = await createCategory(name);
    settings.cat = c.id;
    saveSettings();
    renderLibrary();
    return c;
  }
  async function moveItems(ids, catId, mode = activeTab) {
    for (const id of ids) {
      if (mode === 'comics' || comics.some((x) => x.id === id)) {
        const c = comics.find((x) => x.id === id);
        if (c) {
          c.cat = catId;
          await DB.put('comics', c);
        }
      }
      if (mode === 'books' || books.some((x) => x.id === id)) {
        const b = books.find((x) => x.id === id);
        if (b) {
          b.cat = catId;
          await DB.put('books', b);
        }
      }
    }
  }
  function openMoveSheet(ids, mode = activeTab) {
    openSheet({
      title: 'Mover a categoría',
      build(body) {
        const pool = mode === 'comics' ? comics : books;
        const cur = new Set(ids.map((id) => (pool.find((x) => x.id === id) || {}).cat || null));
        const rows = [];
        const mk = (label, catId, ic) => {
          const b = el('button', 'pick-row', `<span>${esc(label)}</span>${cur.size === 1 && cur.has(catId) ? icon('check') : ic ? icon(ic) : ''}`);
          b.type = 'button';
          b.addEventListener('click', async () => {
            await moveItems(ids, catId, mode);
            closeSheet();
            selecting = null;
            renderLibrary();
            toast(catId ? `Movido a “${esc(catName(catId))}”` : 'Quitado de la categoría');
          });
          return b;
        };
        rows.push(mk('Sin categoría', null));
        cats.forEach((c) => rows.push(mk(c.name, c.id)));
        const nw = el('button', 'pick-row', `<span style="color:var(--accent)">Nueva categoría…</span>${icon('plus')}`);
        nw.type = 'button';
        nw.addEventListener('click', async () => {
          const name = await askText({ title: 'Nueva categoría', placeholder: 'Nombre', confirmLabel: 'Crear y mover', validate: (v) => nameTaken(v) });
          if (!name) return;
          const c = await createCategory(name);
          await moveItems(ids, c.id, mode);
          closeSheet();
          selecting = null;
          renderLibrary();
          toast(`Movido a “${esc(c.name)}”`);
        });
        rows.push(nw);
        body.appendChild(group(...rows));
      }
    });
  }

  function openCategoriesSheet() {
    openSheet({
      title: 'Categorías compartidas',
      build(body) {
        const draw = () => {
          body.innerHTML = '';
          if (!cats.length) body.appendChild(el('div', 'list-empty', 'Aún no has creado categorías.'));
          const rows = cats.map((c) => {
            const nb = books.filter((b) => b.cat === c.id).length;
            const nc = comics.filter((cm) => cm.cat === c.id).length;
            const r = el(
              'div',
              'cat-row',
              `<span class="t">${esc(c.name)}<small>${nb} libro${nb === 1 ? '' : 's'} · ${nc} cómic${nc === 1 ? '' : 's'}</small></span><button class="ib" type="button" data-a="ren" aria-label="Renombrar ${esc(c.name)}">${icon('pencil')}</button><button class="ib del" type="button" data-a="del" aria-label="Eliminar ${esc(c.name)}">${icon('trash')}</button>`
            );
            r.addEventListener('click', async (e) => {
              const b = e.target.closest('button');
              if (!b) return;
              if (b.dataset.a === 'ren') {
                const name = await askText({ title: 'Cambiar nombre', value: c.name, confirmLabel: 'Guardar', validate: (v) => nameTaken(v, c.id) });
                if (name) {
                  c.name = name;
                  await DB.put('cats', c);
                  draw();
                  if (activeTab !== 'settings') renderLibrary();
                  else renderSettings();
                }
              } else {
                const totalInCat = nb + nc;
                const ok = await confirmDialog({
                  title: `¿Eliminar “${c.name}”?`,
                  message: totalInCat ? 'Los libros y cómics no se borrarán: quedarán sin categoría.' : 'La categoría está vacía.',
                  confirmLabel: 'Eliminar',
                  destructive: true
                });
                if (!ok) return;
                await moveItems(books.filter((x) => x.cat === c.id).map((x) => x.id), null, 'books');
                await moveItems(comics.filter((x) => x.cat === c.id).map((x) => x.id), null, 'comics');
                await DB.del('cats', c.id);
                cats = cats.filter((x) => x.id !== c.id);
                if (settings.cat === c.id) {
                  settings.cat = 'all';
                  saveSettings();
                }
                draw();
                if (activeTab !== 'settings') renderLibrary();
                else renderSettings();
              }
            });
            return r;
          });
          if (rows.length) body.appendChild(group(...rows));
          const add = el('button', 'btn tonal', `${icon('plus')} Nueva categoría`);
          add.type = 'button';
          add.style.marginTop = '12px';
          add.addEventListener('click', async () => {
            const name = await askText({ title: 'Nueva categoría', placeholder: 'Nombre', confirmLabel: 'Crear', validate: (v) => nameTaken(v) });
            if (name) {
              await createCategory(name);
              draw();
              if (activeTab !== 'settings') renderLibrary();
              else renderSettings();
            }
          });
          body.appendChild(add);
        };
        draw();
      }
    });
  }

  /* ════════ Importador Universal (EPUB + CBZ/CBR/CBT) ════════ */
  const fileInput = $('#fileInput');
  function pickFiles() {
    fileInput.value = '';
    fileInput.click();
  }
  $('#fabAdd').addEventListener('click', openAddSheet);
  $('#addTopBtn').addEventListener('click', openAddSheet);
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length) importFiles([...fileInput.files]);
  });

  let dragDepth = 0;
  addEventListener('dragenter', (e) => {
    if (e.dataTransfer?.types?.includes('Files')) {
      dragDepth++;
      $('#dropzone').classList.add('on');
    }
  });
  addEventListener('dragleave', () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (!dragDepth) $('#dropzone').classList.remove('on');
  });
  addEventListener('dragover', (e) => {
    if (e.dataTransfer?.types?.includes('Files')) e.preventDefault();
  });
  addEventListener('drop', (e) => {
    e.preventDefault();
    dragDepth = 0;
    $('#dropzone').classList.remove('on');
    const f = [...(e.dataTransfer?.files || [])];
    if (f.length) importFiles(f);
  });

  if ('launchQueue' in window && window.launchQueue.setConsumer) {
    window.launchQueue.setConsumer(async (p) => {
      const fs = [];
      for (const h of p.files || []) {
        try {
          fs.push(await h.getFile());
        } catch (e) {}
      }
      if (fs.length) importFiles(fs);
    });
  }

  const cleanName = (n) => n.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim() || n;

  async function importEpubFile(file) {
    if (books.some((b) => b.fileName === file.name && b.size === file.size)) return { dup: true, kind: 'book' };
    const book = await FolioCore.openEpub(file);
    const title = book.meta.title || cleanName(file.name);
    const author = book.meta.author || '';
    let cover = null;
    try {
      const cb = await book.coverBlob();
      if (cb) cover = await makeThumb(cb, 360);
    } catch (e) {
      cover = null;
    }
    if (!cover) cover = await fallbackCover(title, author);
    const weights = await book.weights();
    const rec = {
      id: uid(),
      title,
      author,
      lang: book.meta.lang || '',
      fileName: file.name,
      size: file.size,
      added: Date.now(),
      lastRead: 0,
      pos: { i: 0, f: 0 },
      progress: 0,
      done: false,
      cat: settings.cat !== 'all' ? settings.cat : null,
      cover,
      bookmarks: [],
      weights,
      chapters: book.spine.length
    };
    book.close();
    try {
      await DB.put('files', { id: rec.id, blob: file });
      await DB.put('books', rec);
    } catch (e) {
      try {
        await DB.del('files', rec.id);
      } catch (_) {}
      throw new Error(e && e.name === 'QuotaExceededError' ? 'No hay espacio suficiente para guardar este libro.' : 'No se pudo guardar el libro.');
    }
    return { rec, kind: 'book' };
  }

  async function importComicFile(file) {
    if (comics.some((c) => c.fileName === file.name && c.size === file.size)) return { dup: true, kind: 'comic' };
    const src = await VinetasCore.openComic(file);
    const info = await VinetasCore.readComicInfo(src);
    const first = await src.getBlob(0);
    const cover = await makeThumb(first, 360);
    const rec = {
      id: uid(),
      name: (info && info.title) || cleanName(file.name),
      fileName: file.name,
      size: file.size,
      format: src.format,
      pages: src.count,
      added: Date.now(),
      lastRead: 0,
      page: 0,
      done: false,
      cat: settings.cat !== 'all' ? settings.cat : null,
      bookmarks: [],
      cover
    };
    if (info && info.rtl) rec.rtl = true;
    src.close();
    try {
      await DB.put('files', { id: rec.id, blob: file });
      await DB.put('comics', rec);
    } catch (e) {
      try {
        await DB.del('files', rec.id);
      } catch (_) {}
      throw new Error(e && e.name === 'QuotaExceededError' ? 'No hay espacio suficiente para guardar este cómic.' : 'No se pudo guardar el cómic.');
    }
    return { rec, kind: 'comic' };
  }

  // Detecta inteligentemente si el archivo es un EPUB o un Cómic (CBZ, CBR, CBT, ZIP, RAR, TAR)
  async function importOneAny(file) {
    const ext = (/\.([a-z0-9]+)$/i.exec(file.name || '') || [])[1]?.toLowerCase() || '';
    const comicFirst = /^(cbz|cbr|cbt|rar|tar)$/i.test(ext) || (ext === 'zip' && activeTab === 'comics');
    if (comicFirst) {
      try {
        return await importComicFile(file);
      } catch (eComic) {
        try {
          return await importEpubFile(file);
        } catch (_) {
          throw eComic;
        }
      }
    } else {
      try {
        return await importEpubFile(file);
      } catch (eEpub) {
        try {
          return await importComicFile(file);
        } catch (eComic) {
          throw ext === 'epub' ? eEpub : eComic;
        }
      }
    }
  }

  let importing = false;
  async function importFiles(files) {
    if (importing) {
      toast('Ya hay una importación en curso');
      return;
    }
    importing = true;
    let addedBooks = 0, addedComics = 0, dups = 0;
    const errors = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      toast(
        `<b>Importando ${i + 1} de ${files.length}</b><br><span style="color:var(--fg-2)">${esc(f.name)}</span><div class="progress-line"><i style="width:${Math.round((i / files.length) * 100)}%"></i></div>`,
        0
      );
      await wait(30);
      try {
        const r = await importOneAny(f);
        if (r.dup) {
          dups++;
        } else if (r.kind === 'book') {
          books.push(r.rec);
          addedBooks++;
          sortBooks();
        } else {
          comics.push(r.rec);
          addedComics++;
          sortComics();
        }
        if (activeTab !== 'settings') renderLibrary();
      } catch (e) {
        errors.push(`${esc(f.name)}: ${esc(e && e.message ? e.message : 'no se pudo abrir')}`);
      }
    }
    importing = false;
    // Si solo se importaron cómics y estábamos en Libros (o viceversa), cambiamos a esa pestaña automáticamente
    if (addedComics > 0 && addedBooks === 0 && activeTab === 'books') setTab('comics');
    else if (addedBooks > 0 && addedComics === 0 && activeTab === 'comics') setTab('books');
    else if (activeTab !== 'settings') renderLibrary();

    const parts = [];
    if (addedBooks) parts.push(`${addedBooks} libro${addedBooks > 1 ? 's' : ''} añadido${addedBooks > 1 ? 's' : ''}`);
    if (addedComics) parts.push(`${addedComics} cómic${addedComics > 1 ? 's' : ''} añadido${addedComics > 1 ? 's' : ''}`);
    if (dups) parts.push(`${dups} ya estaba${dups > 1 ? 'n' : ''} en la biblioteca`);
    if (errors.length) parts.push(errors.slice(0, 2).join('<br>') + (errors.length > 2 ? `<br>y ${errors.length - 2} más con error` : ''));
    toast(parts.join('<br>') || 'No se añadió nada', errors.length ? 6500 : 3200);
  }

  function openAddSheet() {
    openSheet({
      title: 'Añadir a Omnilector',
      build(body) {
        const a = el('button', 'pick-row', `<span>Elegir archivos (.epub, .cbz, .cbr, .cbt)…</span>${icon('file')}`);
        a.type = 'button';
        a.addEventListener('click', () => {
          closeSheet(true);
          pickFiles();
        });
        const b = el('button', 'pick-row', `<span>Desde Google Drive u OneDrive…</span>${icon('cloud')}`);
        b.type = 'button';
        b.addEventListener('click', () => openCloudSheet());
        body.appendChild(group(a, b));
        body.appendChild(
          el(
            'p',
            'hint',
            'Omnilector detecta automáticamente si cada archivo es un libro EPUB o un cómic (CBZ, CBR, CBT, ZIP, RAR, TAR) por su contenido binario y lo coloca en su pestaña.'
          )
        );
      }
    });
  }

  /* ════════ Pestaña Ajustes Unificada ════════ */
  async function renderSettings() {
    const body = $('#settingsBody');
    body.innerHTML = '';

    body.append(
      groupTitle('Apariencia Material You'),
      group(
        stackRow('Tema de la aplicación', segmented(THEME_OPTS, settings.theme, (v) => { settings.theme = v; saveSettings(); applyTheme(); })),
        stackRow('Color dinámico (Material 3)', accentPicker(), 'Adapta botones, indicadores, pestañas y chips.')
      )
    );

    body.appendChild(groupTitle('Lectura de Libros (EPUB)'));
    epubReadingControls(body, { preview: true });

    body.appendChild(groupTitle('Lectura de Cómics (CBZ, CBR, CBT)'));
    comicReadingControls(body, null);

    body.append(
      groupTitle('Comportamiento común'),
      group(
        switchRow('Tocar los bordes', 'Izquierda y derecha pasan de página en modo paginado', settings.zones, (v) => { settings.zones = v; saveSettings(); }),
        switchRow('Mantener pantalla encendida', 'Evita que la pantalla se apague mientras lees', settings.keepAwake, (v) => { settings.keepAwake = v; saveSettings(); updateWakeLock(); })
      )
    );

    const totalBooks = books.reduce((s, b) => s + (b.size || 0), 0);
    const totalComics = comics.reduce((s, c) => s + (c.size || 0), 0);
    const total = totalBooks + totalComics;
    const fmt = (n) => (n > 1e9 ? (n / 1e9).toFixed(2) + ' GB' : n > 1e6 ? (n / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1e3)) + ' KB');

    const catBtn = el('button', 'row action', `<span class="label">Categorías compartidas</span><span class="value">${cats.length}</span>${icon('chev', 'chev')}`);
    catBtn.type = 'button';
    catBtn.addEventListener('click', openCategoriesSheet);

    const cloudBtn = el('button', 'row action', `<span class="label">Importar desde Google Drive u OneDrive</span>${icon('cloud', 'lead')}`);
    cloudBtn.type = 'button';
    cloudBtn.addEventListener('click', openCloudSheet);

    const hasAny = books.length + comics.length > 0;
    const delBtn = el('button', 'row action danger', 'Vaciar toda la biblioteca');
    delBtn.type = 'button';
    delBtn.disabled = !hasAny;
    delBtn.style.opacity = hasAny ? '1' : '0.4';
    delBtn.addEventListener('click', async () => {
      if (!hasAny) return;
      const ok = await confirmDialog({
        title: '¿Vaciar toda la biblioteca?',
        message: `Se eliminarán ${books.length} libro(s) y ${comics.length} cómic(s) de este dispositivo. Los archivos originales no se tocan.`,
        confirmLabel: 'Borrar todo',
        destructive: true
      });
      if (!ok) return;
      for (const b of [...books]) await removeBook(b.id);
      for (const c of [...comics]) await removeComic(c.id);
      renderSettings();
      toast('Biblioteca vacía');
    });

    body.append(
      groupTitle('Biblioteca y Almacenamiento'),
      group(
        catBtn,
        cloudBtn,
        el('div', 'row', `<span class="label">Libros EPUB</span><span class="value">${books.length}</span>`),
        el('div', 'row', `<span class="label">Cómics (CBZ · CBR · CBT)</span><span class="value">${comics.length}</span>`),
        el('div', 'row', `<span class="label">Espacio total usado</span><span class="value">${hasAny ? fmt(total) : '—'}</span>`),
        delBtn
      )
    );

    body.append(
      groupTitle('Acerca de Omnilector'),
      group(
        el('div', 'row', '<span class="label">Formatos de libros</span><span class="value">EPUB 2 y 3</span>'),
        el('div', 'row', '<span class="label">Formatos de cómics</span><span class="value">CBZ · CBR · CBT · ZIP · RAR · TAR</span>'),
        el('div', 'row', '<span class="label">Plataformas</span><span class="value">Android · iOS · PWA Offline</span>'),
        el('div', 'row', '<span class="label">Versión</span><span class="value">1.0 (Material 3)</span>')
      )
    );
  }

  /* ════════ Hojas de Nube (Google Drive y OneDrive) ════════ */
  function openCloudSheet() {
    openSheet({
      title: 'Desde la nube',
      tall: false,
      build(body) {
        const pick = el('button', 'pick-row', `<span>Elegir desde Archivos, Drive, OneDrive o iCloud…</span>${icon('file')}`);
        pick.type = 'button';
        pick.addEventListener('click', () => {
          closeSheet(true);
          pickFiles();
        });
        body.appendChild(group(pick));
        body.appendChild(
          el('p', 'hint', 'En el selector de archivos de Android o iOS puedes abrir directamente Google Drive, OneDrive o iCloud Drive y marcar varios EPUB o cómics a la vez.')
        );
        const c = Cloud.cfg();
        const g = el('button', 'pick-row', `<span>Google Drive</span><span style="color:var(--fg-2);font-size:14px">${c.gid ? 'Buscar archivos' : 'Configurar'}</span>`);
        g.type = 'button';
        g.addEventListener('click', () => (c.gid ? openCloudBrowser('google') : openCloudConfig('google')));
        const m = el('button', 'pick-row', `<span>OneDrive</span><span style="color:var(--fg-2);font-size:14px">${c.msid ? 'Buscar archivos' : 'Configurar'}</span>`);
        m.type = 'button';
        m.addEventListener('click', () => (c.msid ? openCloudBrowser('ms') : openCloudConfig('ms')));
        body.append(groupTitle('Conexión directa con tu cuenta'), group(g, m));
        const cf = el('button', 'btn plain', 'Cambiar identificadores OAuth');
        cf.type = 'button';
        cf.style.width = '100%';
        cf.addEventListener('click', () => openCloudConfig('both'));
        body.appendChild(cf);
      }
    });
  }
  function openCloudConfig(which) {
    openSheet({
      title: 'Configurar cuenta en la nube',
      tall: true,
      build(body) {
        const c = Cloud.cfg();
        const mkField = (id, label, val, ph) =>
          `<div class="group-title" style="margin-top:14px">${label}</div><input class="field" id="${id}" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${ph}" value="${esc(val || '')}">`;
        let html = `<p class="hint" style="margin-top:0">Para conectar tu cuenta directamente, introduce tu Client ID de Google Cloud o Microsoft Entra ID (permiso de solo lectura).</p>`;
        if (which !== 'ms') html += mkField('cfgG', 'ID de cliente de Google', c.gid, 'xxxx.apps.googleusercontent.com') + `<p class="hint">Origen autorizado: <code>${esc(location.origin)}</code></p>`;
        if (which !== 'google') html += mkField('cfgM', 'ID de aplicación de Microsoft', c.msid, 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx') + `<p class="hint">URI de redirección (SPA): <code>${esc(Cloud.redirect())}</code></p>`;
        html += `<button class="btn primary" id="cfgSave" type="button" style="margin-top:16px">Guardar</button>`;
        body.innerHTML = html;
        $('#cfgSave', body).addEventListener('click', () => {
          const n = Cloud.cfg();
          const g = $('#cfgG', body), m = $('#cfgM', body);
          if (g) n.gid = g.value.trim();
          if (m) n.msid = m.value.trim();
          Cloud.saveCfg(n);
          closeSheet(true);
          openCloudSheet();
          toast('Configuración guardada');
        });
      }
    });
  }
  function openCloudBrowser(src) {
    openSheet({
      title: src === 'google' ? 'Google Drive' : 'OneDrive',
      tall: true,
      build(body) {
        const sel = new Set();
        let items = [];
        body.innerHTML = `<input class="field" id="cloudQ" type="search" placeholder="Buscar .epub, .cbz, .cbr…" autocomplete="off"><div id="cloudList" style="margin-top:12px"></div><button class="btn primary" id="cloudAdd" type="button" disabled>Añadir</button>`;
        const list = $('#cloudList', body), addBtn = $('#cloudAdd', body), q = $('#cloudQ', body);
        const fmt = (n) => (n > 1e6 ? (n / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1e3)) + ' KB');
        const draw = () => {
          list.innerHTML = '';
          if (!items.length) {
            list.appendChild(el('div', 'list-empty', 'No se encontraron libros ni cómics.'));
          } else {
            const rows = items.map((it) => {
              const b = el('button', 'cloud-item', `<span class="dot">${icon('check')}</span><span class="t"><b>${esc(it.name)}</b><small>${fmt(it.size)}</small></span>`);
              b.type = 'button';
              b.setAttribute('aria-pressed', String(sel.has(it.id)));
              b.addEventListener('click', () => {
                sel.has(it.id) ? sel.delete(it.id) : sel.add(it.id);
                b.setAttribute('aria-pressed', String(sel.has(it.id)));
                sync();
              });
              return b;
            });
            list.appendChild(group(...rows));
          }
          sync();
        };
        const sync = () => {
          addBtn.disabled = !sel.size;
          addBtn.textContent = sel.size ? `Descargar ${sel.size} archivo${sel.size > 1 ? 's' : ''}` : 'Añadir';
        };
        const load = async () => {
          list.innerHTML = '<div class="list-empty">Buscando…</div>';
          try {
            const r = src === 'google' ? await Cloud.googleList(q.value.trim()) : await Cloud.msList(q.value.trim());
            if (r === null) {
              list.innerHTML = '<div class="list-empty">Redirigiendo a Microsoft…</div>';
              return;
            }
            items = r;
            draw();
          } catch (e) {
            list.innerHTML = `<div class="list-empty">${esc(e && e.message ? e.message : 'No se pudo conectar.')}</div>`;
          }
        };
        let t = 0;
        q.addEventListener('input', () => {
          clearTimeout(t);
          t = setTimeout(load, 450);
        });
        addBtn.addEventListener('click', async () => {
          const chosen = items.filter((i) => sel.has(i.id));
          closeSheet(true);
          const files = [];
          for (let i = 0; i < chosen.length; i++) {
            toast(`<b>Descargando ${i + 1} de ${chosen.length}</b><br><span style="color:var(--fg-2)">${esc(chosen[i].name)}</span>`, 0);
            try {
              files.push(await (src === 'google' ? Cloud.googleGet(chosen[i]) : Cloud.msGet(chosen[i])));
            } catch (e) {
              toast(`No se pudo descargar ${esc(chosen[i].name)}: ${esc(e && e.message ? e.message : 'error')}`, 5000);
              await wait(1800);
            }
          }
          if (files.length) await importFiles(files);
        });
        load();
      }
    });
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     MOTOR LECTOR 1: LIBROS EPUB (Folio Engine)
     ═══════════════════════════════════════════════════════════════════════════ */
  let RB = null; // estado del libro EPUB abierto
  let PB = null; // capítulo paginado actual
  const VB = { secs: [], loading: false, prevBtn: null };
  const bookReader = $('#bookReader'), bookStage = $('#bookStage'), pager = $('#pager'), scroller = $('#scroller'), bookStageMsg = $('#bookStageMsg');
  const persistBookMeta = (b) => DB.put('books', b).catch(() => {});
  let bookSaveTimer = 0;
  const scheduleBookSave = () => {
    clearTimeout(bookSaveTimer);
    bookSaveTimer = setTimeout(() => RB && persistBookMeta(RB.meta), 400);
  };

  const BASE_CSS = `
:host{display:block}
:where(.chap){font-family:var(--bk-font);font-size:var(--bk-size);line-height:var(--bk-lh);color:var(--bk-ink);-webkit-hyphens:auto;hyphens:auto;overflow-wrap:break-word;text-rendering:optimizeLegibility;-webkit-text-size-adjust:100%}
:where(.chap) p{margin:0 0 .85em}
:where(.chap) h1,:where(.chap) h2,:where(.chap) h3,:where(.chap) h4,:where(.chap) h5,:where(.chap) h6{line-height:1.22;margin:1.3em 0 .55em;font-weight:650;break-after:avoid;-webkit-hyphens:manual;hyphens:manual}
:where(.chap) h1{font-size:1.55em}:where(.chap) h2{font-size:1.3em}:where(.chap) h3{font-size:1.15em}:where(.chap) h4,:where(.chap) h5,:where(.chap) h6{font-size:1em}
:where(.chap) img,:where(.chap) svg{max-width:100%;height:auto}
:where(.chap) figure{margin:1em 0;text-align:center;break-inside:avoid}
:where(.chap) figcaption{font-size:.85em;opacity:.75}
:where(.chap) blockquote{margin:1em 0 1em 1.1em;padding:0 0 0 .9em;border-left:3px solid var(--bk-rule)}
:where(.chap) a{color:var(--bk-link);text-decoration:underline;text-underline-offset:.15em;text-decoration-thickness:1px}
:where(.chap) table{border-collapse:collapse;max-width:100%;font-size:.92em;margin:1em 0}
:where(.chap) th,:where(.chap) td{border:1px solid var(--bk-rule);padding:.35em .55em;text-align:start;vertical-align:top}
:where(.chap) pre,:where(.chap) code,:where(.chap) kbd,:where(.chap) samp{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.86em}
:where(.chap) pre{white-space:pre-wrap;overflow-wrap:anywhere}
:where(.chap) hr{border:0;border-top:1px solid var(--bk-rule);margin:1.6em 0}
:where(.chap) ul,:where(.chap) ol{padding-left:1.4em;margin:0 0 .9em}
:where(.chap) li{margin:.2em 0}
:where(.chap) sup,:where(.chap) sub{line-height:0}
`;
  const OVERRIDE_CSS = `
.chap,.chap *{color:var(--bk-ink) !important;background:none !important;background-color:transparent !important;border-color:var(--bk-rule) !important;box-shadow:none !important;text-shadow:none !important}
.chap a,.chap a *{color:var(--bk-link) !important}
.chap,.chap *:not(code):not(pre):not(kbd):not(samp){font-family:var(--bk-font) !important}
.chap .__root,.chap .__body{margin:0 !important;padding:0 !important;width:auto !important;max-width:none !important;height:auto !important;min-height:0 !important;float:none !important}
.chap img,.chap svg{max-width:100% !important;max-height:var(--bk-maxh) !important}
`;

  function makeHost(ch) {
    const host = el('div', 'chap-host');
    const root = host.attachShadow({ mode: 'open' });
    const chap = el('div', 'chap');
    const lang = ch.lang || (RB && RB.meta.lang) || '';
    if (lang) chap.setAttribute('lang', lang);
    const rootDiv = el('div', '__root ' + ch.rootClass), bodyDiv = el('div', '__body ' + ch.bodyClass);
    for (const n of Array.from(ch.body.childNodes)) bodyDiv.appendChild(document.importNode(n, true));
    rootDiv.appendChild(bodyDiv);
    chap.appendChild(rootDiv);
    const style = (css) => {
      const s = document.createElement('style');
      s.textContent = css;
      return s;
    };
    root.append(style(BASE_CSS), style(ch.css), style(OVERRIDE_CSS), chap);
    return { host, root, chap };
  }
  async function imagesReady(root, ms = 1800) {
    const imgs = Array.from(root.querySelectorAll('img')).filter((i) => i.getAttribute('src') && !i.complete);
    if (!imgs.length) return;
    await Promise.race([Promise.all(imgs.map((i) => i.decode().catch(() => {}))), wait(ms)]);
  }
  const revokeAll = (urls) => urls && urls.forEach((u) => URL.revokeObjectURL(u));
  const setBookMsg = (html) => {
    bookStageMsg.innerHTML = html || '';
  };
  const spinnerHtml = '<div class="spinner"></div>';

  let probeEl = null;
  function safeInsets() {
    if (!probeEl) {
      probeEl = el('div');
      probeEl.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
      document.body.appendChild(probeEl);
    }
    const cs = getComputedStyle(probeEl);
    return {
      t: parseFloat(cs.paddingTop) || 0,
      r: parseFloat(cs.paddingRight) || 0,
      b: parseFloat(cs.paddingBottom) || 0,
      l: parseFloat(cs.paddingLeft) || 0
    };
  }
  function pagedGeom() {
    const cw = bookStage.clientWidth, chh = bookStage.clientHeight, s = safeInsets();
    const padX = clamp(Math.round(cw * 0.055), 18, 44);
    const top = s.t + 40, bottom = s.b + 46;
    const availW = cw - s.l - s.r - padX * 2, availH = chh - top - bottom;
    const n = availW >= 780 ? 2 : 1, g = 40, colMax = 680;
    const colW = Math.max(120, Math.floor(Math.min(colMax, n === 2 ? (availW - g) / 2 : availW)));
    const W = n * colW + (n - 1) * g;
    return { left: s.l + padX + Math.floor((availW - W) / 2), top, W, H: Math.max(120, Math.floor(availH)), n, colW, g, step: W + g };
  }
  function applyGeom(Pc, g) {
    Object.assign(Pc, g);
    pager.style.cssText = `left:${g.left}px;top:${g.top}px;width:${g.W}px;height:${g.H}px`;
    Pc.chap.style.cssText = `width:${g.W}px;height:${g.H}px;column-count:${g.n};column-width:${g.colW}px;column-gap:${g.g}px;column-fill:auto;will-change:transform`;
    bookReader.style.setProperty('--bk-maxh', g.H + 'px');
    $('#head').style.cssText = `left:${g.left}px;width:${g.W}px;top:${safeInsets().t + 14}px`;
    $('#foot').style.cssText = `left:${g.left}px;width:${g.W}px;bottom:${safeInsets().b + 14}px`;
  }
  function measurePages(Pc) {
    const ncols = Math.max(1, Math.round((Pc.chap.scrollWidth + Pc.g) / (Pc.colW + Pc.g)));
    Pc.pages = Math.max(1, Math.ceil(ncols / Pc.n));
  }

  function locateBook(x) {
    let i = 0;
    while (i < RB.cum.length - 2 && x >= RB.cum[i + 1]) i++;
    return { i, f: clamp((x - RB.cum[i]) / RB.w[i], 0, 1) };
  }
  const bookProgressNow = () => clamp((RB.cum[RB.i] + clamp(RB.fEnd, 0, 1) * RB.w[RB.i]) / RB.total, 0, 1);
  let bookScrubbing = false;
  function afterBookMove(save = true) {
    if (!RB) return;
    const pct = bookProgressNow();
    RB.pct = pct;
    const m = RB.meta;
    m.pos = { i: RB.i, f: RB.f };
    m.progress = pct;
    m.lastRead = Date.now();
    if (pct >= 0.985) m.done = true;
    else if (pct < 0.5) m.done = false;
    updateBookReaderUI();
    if (save) scheduleBookSave();
  }
  function updateBookReaderUI() {
    if (!RB) return;
    const pct = Math.round(RB.pct * 100);
    $('#bookScrubPct').textContent = pct + '%';
    if (!bookScrubbing) $('#bookScrub').value = String(Math.round(RB.pct * 1000));
    const title = RB.book.titleFor(RB.i);
    $('#bookRSub').textContent = title || `Sección ${RB.i + 1} de ${RB.book.spine.length}`;
    $('#head').textContent = RB.mode === 'page' ? title : '';
    $('#footL').textContent = RB.mode === 'page' && PB ? `${PB.page + 1} de ${PB.pages}` : '';
    $('#footR').textContent = RB.mode === 'page' ? pct + '%' : '';
    $('#chPrev').disabled = RB.i <= 0;
    $('#chNext').disabled = RB.i >= RB.book.spine.length - 1;
    const marked = bookBmIndex() >= 0;
    $('#bookMarkBtn').setAttribute('aria-pressed', String(marked));
    $('#bookMarkIc').classList.toggle('fill', marked);
  }

  async function openBookReader(id) {
    const meta = books.find((b) => b.id === id);
    if (!meta) return;
    bookReader.hidden = false;
    bookReader.classList.remove('chrome-off');
    applyReadTheme();
    applyBookVars();
    setBookMsg(spinnerHtml);
    $('#bookRName').textContent = meta.title;
    $('#bookRSub').textContent = 'Abriendo…';
    $('#head').textContent = '';
    $('#footL').textContent = '';
    $('#footR').textContent = '';
    document.body.style.overflow = 'hidden';
    let book;
    try {
      const rec = await DB.get('files', id);
      if (!rec) throw new Error('No se encontró el archivo de este libro.');
      book = await FolioCore.openEpub(rec.blob);
    } catch (e) {
      bookReader.hidden = true;
      document.body.style.overflow = '';
      setBookMsg('');
      toast(esc(e && e.message ? e.message : 'No se pudo abrir el libro.'), 6000);
      return;
    }
    if (bookReader.hidden) {
      book.close();
      return;
    }
    let w = meta.weights && meta.weights.length === book.spine.length ? meta.weights : await book.weights();
    const cum = [0];
    w.forEach((x) => cum.push(cum[cum.length - 1] + x));
    RB = { meta, book, i: 0, f: 0, fEnd: 0, pct: 0, token: 0, w, cum, total: cum[cum.length - 1] || 1, mode: settings.paging };
    let pos = meta.pos || { i: 0, f: 0 };
    if (pos.i >= book.spine.length || (meta.done && (meta.progress || 0) >= 0.985)) pos = { i: 0, f: 0 };
    setupBookMode();
    await gotoBook({ i: pos.i, f: pos.f }, { instant: true });
    updateWakeLock();
    setTimeout(() => RB && !sheetState && bookReader.classList.add('chrome-off'), 1500);
  }

  async function closeBookReader() {
    clearTimeout(bookSaveTimer);
    closeSheet(true);
    if (RB) {
      RB.token++;
      RB.meta.pos = { i: RB.i, f: RB.f };
      await persistBookMeta(RB.meta);
      if (PB) {
        revokeAll(PB.urls);
        PB = null;
      }
      scrollClear();
      RB.book.close();
      RB = null;
    }
    pager.replaceChildren();
    bookReader.hidden = true;
    document.body.style.overflow = '';
    releaseWakeLock();
    sortBooks();
    renderLibrary();
  }
  $('#bookBackBtn').addEventListener('click', closeBookReader);

  function setupBookMode() {
    const paged = RB.mode === 'page';
    pager.hidden = !paged;
    scroller.hidden = paged;
    $('#head').hidden = !paged;
    $('#foot').hidden = !paged;
  }
  async function rebuildBook() {
    if (!RB) return;
    const pos = { i: RB.i, f: RB.f };
    RB.token++;
    if (PB) {
      revokeAll(PB.urls);
      PB = null;
      pager.replaceChildren();
    }
    scrollClear();
    RB.mode = settings.paging;
    setupBookMode();
    await gotoBook(pos, { instant: true });
  }
  async function gotoBook(t, opts = {}) {
    if (!RB) return;
    const i = clamp(t.i ?? RB.i, 0, RB.book.spine.length - 1);
    if (RB.mode === 'page') await pagedLoad(i, t, opts);
    else await scrollLoad(i, t, opts);
  }
  function failBookMsg(e) {
    setBookMsg(`<div>No se pudo mostrar este capítulo.<br><small>${esc(e && e.message ? e.message : '')}</small></div>`);
  }

  async function pagedLoad(i, t, opts) {
    const token = ++RB.token;
    const slow = setTimeout(() => {
      if (RB && RB.token === token) setBookMsg(spinnerHtml);
    }, 250);
    let ch;
    try {
      ch = await FolioCore.buildChapter(RB.book, i);
    } catch (e) {
      clearTimeout(slow);
      if (RB && RB.token === token) failBookMsg(e);
      return;
    }
    if (!RB || RB.token !== token) {
      revokeAll(ch.urls);
      clearTimeout(slow);
      return;
    }
    const { host, root, chap } = makeHost(ch);
    const Pc = { i, host, root, chap, urls: ch.urls, pages: 1, page: 0 };
    applyGeom(Pc, pagedGeom());
    const old = PB;
    pager.replaceChildren(host);
    PB = Pc;
    await imagesReady(root);
    clearTimeout(slow);
    if (!RB || RB.token !== token) return;
    setBookMsg('');
    if (old) revokeAll(old.urls);
    measurePages(Pc);
    RB.i = i;
    let page = 0;
    if (t.frag) page = pageOfFrag(t.frag);
    else if (t.page === Infinity) page = Pc.pages - 1;
    else if (typeof t.f === 'number') page = Math.floor(t.f * Pc.pages + 1e-6);
    setBookPage(page, false);
    if (opts.dir && !opts.instant && !REDUCED) pager.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'ease-out' });
  }
  function pageOfFrag(frag) {
    const node = PB.root.getElementById(frag) || PB.root.querySelector(`[name="${CSS.escape(frag)}"]`);
    if (!node) return 0;
    const left = node.getBoundingClientRect().left - PB.chap.getBoundingClientRect().left;
    return clamp(Math.floor((left + 1) / PB.step), 0, PB.pages - 1);
  }
  function setBookPage(p, animate, keepF = false) {
    p = clamp(p, 0, PB.pages - 1);
    PB.page = p;
    PB.chap.style.transition = animate && !REDUCED ? 'transform 0.26s cubic-bezier(0.22, 0.8, 0.26, 1)' : 'none';
    PB.chap.style.transform = `translate3d(${-p * PB.step}px,0,0)`;
    RB.i = PB.i;
    if (!keepF) RB.f = p / PB.pages;
    RB.fEnd = (p + 1) / PB.pages;
    afterBookMove();
  }
  async function nextBookPage() {
    if (!RB) return;
    if (RB.mode === 'scroll') {
      scroller.scrollBy({ top: scroller.clientHeight * 0.88, behavior: REDUCED ? 'auto' : 'smooth' });
      return;
    }
    if (!PB) return;
    bookReader.classList.add('chrome-off');
    if (PB.page < PB.pages - 1) setBookPage(PB.page + 1, true);
    else if (RB.i < RB.book.spine.length - 1) await pagedLoad(RB.i + 1, { f: 0 }, { dir: 1 });
    else {
      setBookPage(PB.page, true, true);
      toast('Has llegado al final del libro', 1500);
    }
  }
  async function prevBookPage() {
    if (!RB) return;
    if (RB.mode === 'scroll') {
      scroller.scrollBy({ top: -scroller.clientHeight * 0.88, behavior: REDUCED ? 'auto' : 'smooth' });
      return;
    }
    if (!PB) return;
    bookReader.classList.add('chrome-off');
    if (PB.page > 0) setBookPage(PB.page - 1, true);
    else if (RB.i > 0) await pagedLoad(RB.i - 1, { page: Infinity }, { dir: -1 });
    else {
      setBookPage(PB.page, true, true);
      toast('Estás en el principio del libro', 1500);
    }
  }
  async function chapterStep(d) {
    if (!RB) return;
    const i = RB.i + d;
    if (i < 0 || i >= RB.book.spine.length) return;
    bookReader.classList.add('chrome-off');
    await gotoBook({ i, f: 0 }, { dir: d });
  }

  function scrollClear() {
    for (const s of VB.secs) revokeAll(s.urls);
    VB.secs = [];
    VB.loading = false;
    VB.prevBtn = null;
    scroller.replaceChildren();
  }
  async function buildSection(i) {
    const ch = await FolioCore.buildChapter(RB.book, i);
    const { host, root, chap } = makeHost(ch);
    const sec = el('section', 'vsec');
    sec.dataset.i = String(i);
    const wrap = el('div', 'vwrap');
    wrap.appendChild(host);
    sec.appendChild(wrap);
    return { i, el: sec, root, chap, urls: ch.urls };
  }
  function updatePrevBtn() {
    const first = VB.secs[0];
    if (VB.prevBtn) {
      VB.prevBtn.remove();
      VB.prevBtn = null;
    }
    if (!first || first.i <= 0) return;
    const wrap = el('div', 'vprev', `<button type="button">↑ ${esc(RB.book.titleFor(first.i - 1) || 'Capítulo anterior')}</button>`);
    wrap.firstChild.addEventListener('click', prependPrev);
    scroller.insertBefore(wrap, first.el);
    VB.prevBtn = wrap;
  }
  async function scrollLoad(i, t) {
    const token = ++RB.token;
    const slow = setTimeout(() => {
      if (RB && RB.token === token) setBookMsg(spinnerHtml);
    }, 250);
    let s;
    try {
      s = await buildSection(i);
    } catch (e) {
      clearTimeout(slow);
      if (RB && RB.token === token) failBookMsg(e);
      return;
    }
    if (!RB || RB.token !== token) {
      revokeAll(s.urls);
      clearTimeout(slow);
      return;
    }
    scrollClear();
    scroller.appendChild(s.el);
    VB.secs.push(s);
    bookReader.style.setProperty('--bk-maxh', Math.round(bookStage.clientHeight * 0.8) + 'px');
    await imagesReady(s.root);
    clearTimeout(slow);
    if (!RB || RB.token !== token) return;
    setBookMsg('');
    updatePrevBtn();
    await fillForward(token);
    if (!RB || RB.token !== token) return;
    placeInSection(i, t);
    RB.i = i;
    onScrollNow();
  }
  function placeInSection(i, t) {
    const s = VB.secs.find((x) => x.i === i);
    if (!s) return;
    let y;
    if (t.frag) {
      const node = s.root.getElementById(t.frag) || s.root.querySelector(`[name="${CSS.escape(t.frag)}"]`);
      y = node ? node.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - 24 : s.el.offsetTop;
    } else y = s.el.offsetTop + (t.f || 0) * s.el.offsetHeight;
    scroller.scrollTop = Math.max(0, t.f || t.frag ? y : 0);
  }
  async function fillForward(token) {
    while (RB && RB.token === token && VB.secs.length) {
      const last = VB.secs[VB.secs.length - 1];
      if (last.i >= RB.book.spine.length - 1) break;
      if (scroller.scrollHeight >= scroller.scrollTop + scroller.clientHeight * 2.4) break;
      await appendNext(token);
    }
  }
  async function appendNext(token) {
    if (!RB) return;
    const last = VB.secs[VB.secs.length - 1];
    if (!last || last.i >= RB.book.spine.length - 1) return;
    const tk = token ?? RB.token;
    const s = await buildSection(last.i + 1);
    if (!RB || RB.token !== tk) {
      revokeAll(s.urls);
      return;
    }
    scroller.appendChild(s.el);
    VB.secs.push(s);
    await imagesReady(s.root);
  }
  async function prependPrev() {
    if (!RB || VB.loading) return;
    const first = VB.secs[0];
    if (!first || first.i <= 0) return;
    VB.loading = true;
    const tk = RB.token;
    try {
      const s = await buildSection(first.i - 1);
      if (!RB || RB.token !== tk) {
        revokeAll(s.urls);
        return;
      }
      const before = scroller.scrollHeight;
      scroller.insertBefore(s.el, first.el);
      VB.secs.unshift(s);
      await imagesReady(s.root);
      scroller.scrollTop += scroller.scrollHeight - before;
      updatePrevBtn();
    } catch (e) {
      toast('No se pudo cargar el capítulo anterior', 2000);
    }
    VB.loading = false;
  }
  let scrollRaf = 0, lastTop = 0;
  scroller.addEventListener('scroll', () => {
    if (Math.abs(scroller.scrollTop - lastTop) > 12 && !bookReader.classList.contains('chrome-off')) bookReader.classList.add('chrome-off');
    lastTop = scroller.scrollTop;
    if (!scrollRaf) {
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0;
        onScrollNow();
      });
    }
  }, { passive: true });

  function onScrollNow() {
    if (!RB || RB.mode !== 'scroll' || !VB.secs.length) return;
    const y = scroller.scrollTop + 6;
    let cur = VB.secs[0];
    for (const s of VB.secs) if (s.el.offsetTop <= y) cur = s;
    const h = Math.max(1, cur.el.offsetHeight);
    RB.i = cur.i;
    RB.f = clamp((scroller.scrollTop - cur.el.offsetTop) / h, 0, 1);
    RB.fEnd = clamp((scroller.scrollTop + scroller.clientHeight - cur.el.offsetTop) / h, 0, 1);
    afterBookMove();
    const last = VB.secs[VB.secs.length - 1];
    if (!VB.loading && last.i < RB.book.spine.length - 1 && scroller.scrollTop + scroller.clientHeight * 2.4 > scroller.scrollHeight) {
      VB.loading = true;
      const tk = RB.token;
      appendNext(tk).catch(() => {}).finally(() => {
        VB.loading = false;
      });
    }
  }

  function followLink(path, frag) {
    let i = RB.book.spineIndex.get(path);
    if (i == null) {
      const lp = (path || '').toLowerCase();
      const k = RB.book.spine.findIndex((s) => s.path.toLowerCase() === lp);
      i = k < 0 ? null : k;
    }
    if (i == null) {
      toast('Ese enlace no se puede abrir', 1800);
      return;
    }
    bookReader.classList.add('chrome-off');
    if (RB.mode === 'page' && PB && PB.i === i) {
      if (frag) setBookPage(pageOfFrag(frag), true);
      else setBookPage(0, true);
    } else if (RB.mode === 'scroll' && VB.secs.some((s) => s.i === i)) {
      placeInSection(i, { f: 0, frag });
    } else {
      gotoBook({ i, f: 0, frag }, { dir: 1 });
    }
  }
  function openExternal(href) {
    const a = document.createElement('a');
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  let bookDrag = null;
  bookStage.addEventListener('pointerdown', (e) => {
    if (!RB || RB.mode !== 'page' || !PB || (e.pointerType === 'mouse' && e.button > 0)) return;
    bookDrag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: performance.now(), mode: null, dx: 0, base: -PB.page * PB.step, lx: e.clientX, lt: performance.now(), v: 0 };
  });
  bookStage.addEventListener('pointermove', (e) => {
    if (!bookDrag || e.pointerId !== bookDrag.id || !PB) return;
    const dx = e.clientX - bookDrag.x0, dy = e.clientY - bookDrag.y0;
    if (!bookDrag.mode) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      bookDrag.mode = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
      if (bookDrag.mode === 'h') {
        try {
          bookStage.setPointerCapture(e.pointerId);
        } catch (_) {}
      }
    }
    if (bookDrag.mode !== 'h') return;
    const now = performance.now();
    bookDrag.v = (e.clientX - bookDrag.lx) / Math.max(1, now - bookDrag.lt);
    bookDrag.lx = e.clientX;
    bookDrag.lt = now;
    let d = dx;
    const atStart = PB.page === 0 && RB.i === 0, atEnd = PB.page === PB.pages - 1 && RB.i === RB.book.spine.length - 1;
    if ((d > 0 && atStart) || (d < 0 && atEnd)) d *= 0.3;
    bookDrag.dx = d;
    PB.chap.style.transition = 'none';
    PB.chap.style.transform = `translate3d(${bookDrag.base + d}px,0,0)`;
  });
  function endBookDrag(e) {
    if (!bookDrag || e.pointerId !== bookDrag.id) return;
    const d = bookDrag;
    bookDrag = null;
    if (!PB) return;
    if (!d.mode) {
      if (e.type === 'pointerup' && performance.now() - d.t0 < 700) bookTapAt(e.clientX, e.clientY);
      return;
    }
    if (d.mode !== 'h') return;
    const th = Math.min(80, bookStage.clientWidth * 0.18);
    const fast = Math.abs(d.v) > 0.5 && Math.abs(d.dx) > 24;
    if (d.dx < -th || (fast && d.dx < 0)) nextBookPage();
    else if (d.dx > th || (fast && d.dx > 0)) prevBookPage();
    else setBookPage(PB.page, true, true);
  }
  bookStage.addEventListener('pointerup', endBookDrag);
  bookStage.addEventListener('pointercancel', endBookDrag);

  function bookTapAt(x, y) {
    const inner = PB.root.elementFromPoint(x, y);
    const a = inner && inner.closest && inner.closest('a');
    if (a) {
      if (a.hasAttribute('data-path')) {
        followLink(a.getAttribute('data-path'), a.getAttribute('data-frag') || '');
        return;
      }
      if (a.getAttribute('href') && a.getAttribute('target') === '_blank') {
        openExternal(a.getAttribute('href'));
        return;
      }
    }
    const w = bookStage.clientWidth;
    if (!settings.zones || (x > w * 0.3 && x < w * 0.7)) bookReader.classList.toggle('chrome-off');
    else if (x <= w * 0.3) prevBookPage();
    else nextBookPage();
  }
  scroller.addEventListener('click', (e) => {
    const a = e.composedPath().find((n) => n.tagName === 'A');
    if (a && a.hasAttribute && a.hasAttribute('data-path')) {
      e.preventDefault();
      followLink(a.getAttribute('data-path'), a.getAttribute('data-frag') || '');
      return;
    }
    if (a && a.getAttribute && a.getAttribute('target') === '_blank') return;
    if (e.target.closest && e.target.closest('.vprev')) return;
    const sel = window.getSelection && window.getSelection().toString();
    if (!sel) bookReader.classList.toggle('chrome-off');
  });

  let rlRaf = 0;
  function scheduleRelayout() {
    cancelAnimationFrame(rlRaf);
    rlRaf = requestAnimationFrame(relayoutBook);
  }
  async function relayoutBook() {
    if (!RB) return;
    if (RB.mode === 'page' && PB) {
      applyGeom(PB, pagedGeom());
      measurePages(PB);
      setBookPage(Math.floor(RB.f * PB.pages + 1e-6), false, true);
    } else if (RB.mode === 'scroll' && VB.secs.length) {
      bookReader.style.setProperty('--bk-maxh', Math.round(bookStage.clientHeight * 0.8) + 'px');
      placeInSection(RB.i, { f: RB.f });
      onScrollNow();
    }
  }
  let roTimer = 0;
  new ResizeObserver(() => {
    if (!RB) return;
    clearTimeout(roTimer);
    roTimer = setTimeout(scheduleRelayout, 120);
  }).observe(bookStage);

  const bookScrub = $('#bookScrub');
  bookScrub.addEventListener('input', () => {
    bookScrubbing = true;
    $('#bookScrubPct').textContent = Math.round(bookScrub.value / 10) + '%';
  });
  bookScrub.addEventListener('change', async () => {
    bookScrubbing = false;
    if (!RB) return;
    const loc = locateBook((Number(bookScrub.value) / 1000) * RB.total);
    await gotoBook({ i: loc.i, f: loc.f }, { dir: 1 });
  });
  $('#aaBtn').addEventListener('click', () => {
    openSheet({
      title: 'Apariencia del texto',
      themed: true,
      noScrim: true,
      build(body) {
        epubReadingControls(body);
      }
    });
  });
  $('#chPrev').addEventListener('click', () => chapterStep(-1));
  $('#chNext').addEventListener('click', () => chapterStep(1));

  function bookBmIndex() {
    if (!RB) return -1;
    const list = RB.meta.bookmarks || [];
    if (RB.mode === 'page' && PB) return list.findIndex((b) => b.i === RB.i && Math.floor(b.f * PB.pages + 1e-6) === PB.page);
    const s = VB.secs.find((x) => x.i === RB.i);
    const h = s ? s.el.offsetHeight : 1;
    return list.findIndex((b) => b.i === RB.i && Math.abs(b.f - RB.f) * h < scroller.clientHeight * 0.8);
  }
  $('#bookMarkBtn').addEventListener('click', () => {
    if (!RB) return;
    const list = (RB.meta.bookmarks = RB.meta.bookmarks || []);
    const at = bookBmIndex();
    if (at >= 0) {
      list.splice(at, 1);
      toast('Marcador quitado', 1300);
    } else {
      const label = RB.book.titleFor(RB.i) || `Sección ${RB.i + 1}`;
      list.push({ i: RB.i, f: RB.f, label, pct: RB.pct, t: Date.now() });
      list.sort((a, b) => a.i - b.i || a.f - b.f);
      toast('Página marcada', 1300);
    }
    persistBookMeta(RB.meta);
    updateBookReaderUI();
  });
  $('#bookIndexBtn').addEventListener('click', () => openBookIndex('toc'));
  function openBookIndex(start) {
    if (!RB) return;
    let current = start;
    openSheet({
      title: 'Índice del libro',
      tall: true,
      themed: true,
      build(body) {
        const render = () => {
          body.innerHTML = '';
          const marks = RB.meta.bookmarks || [];
          body.appendChild(
            segmented(
              [{ value: 'toc', label: 'Contenido' }, { value: 'marks', label: `Marcadores${marks.length ? ' (' + marks.length + ')' : ''}` }],
              current,
              (v) => {
                current = v;
                render();
              }
            )
          );
          if (current === 'toc') {
            let best = -1;
            RB.book.toc.forEach((t, k) => {
              if (t.idx <= RB.i && (best < 0 || t.idx > RB.book.toc[best].idx || (t.idx === RB.book.toc[best].idx && RB.book.toc[best].frag && !t.frag))) best = k;
            });
            const g = el('div', 'group');
            RB.book.toc.forEach((t, k) => {
              const b = el('button', 'toc-row' + (k === best ? ' current' : ''), `<span class="t" style="padding-left:${t.level * 18}px">${esc(t.label)}</span>`);
              b.type = 'button';
              b.addEventListener('click', () => {
                closeSheet();
                bookReader.classList.add('chrome-off');
                gotoBook({ i: t.idx, f: 0, frag: t.frag }, { dir: 1 });
              });
              g.appendChild(b);
            });
            body.appendChild(g);
            requestAnimationFrame(() => {
              const c = $('.toc-row.current', g);
              if (c) c.scrollIntoView({ block: 'center' });
            });
          } else if (!marks.length) {
            body.appendChild(el('div', 'list-empty', 'Aún no hay marcadores.<br>Toca el icono del marcador mientras lees para guardar un lugar.'));
          } else {
            const g = el('div', 'group');
            marks.forEach((m) => {
              const b = el('div', 'toc-row', `<span class="t">${esc(m.label)}<br><small>${Math.round((m.pct || 0) * 100)}% del libro</small></span><button class="x" type="button" aria-label="Quitar marcador">${icon('x')}</button>`);
              b.setAttribute('role', 'button');
              b.tabIndex = 0;
              b.addEventListener('click', (e) => {
                if (e.target.closest('.x')) {
                  RB.meta.bookmarks = RB.meta.bookmarks.filter((x) => x !== m);
                  persistBookMeta(RB.meta);
                  updateBookReaderUI();
                  render();
                  return;
                }
                closeSheet();
                bookReader.classList.add('chrome-off');
                gotoBook({ i: m.i, f: m.f }, { dir: 1 });
              });
              g.appendChild(b);
            });
            body.appendChild(g);
          }
        };
        render();
      }
    });
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     MOTOR LECTOR 2: CÓMICS CBZ/CBR/CBT (Viñetas Engine)
     ═══════════════════════════════════════════════════════════════════════════ */
  let RC = null; // estado del cómic abierto
  const comicReader = $('#comicReader'), comicStage = $('#comicStage'), pageEl = $('#page'), pageImg = $('#pageImg'), comicStageMsg = $('#comicStageMsg');
  const MAX_ZOOM = 6;
  const persistComicMeta = (c) => DB.put('comics', c).catch(() => {});
  let comicSaveTimer = 0;
  function scheduleComicSave() {
    clearTimeout(comicSaveTimer);
    comicSaveTimer = setTimeout(() => RC && persistComicMeta(RC.meta), 350);
  }
  const isRtl = () => (RC ? (RC.meta.rtl ?? settings.rtl) : false);
  const setComicMsg = (html) => {
    comicStageMsg.innerHTML = html || '';
  };

  async function openComicReader(id) {
    const meta = comics.find((c) => c.id === id);
    if (!meta) return;
    comicReader.hidden = false;
    comicReader.classList.remove('chrome-off');
    setComicMsg(spinnerHtml);
    pageEl.style.visibility = 'hidden';
    $('#comicRName').textContent = meta.name;
    $('#comicRSub').textContent = 'Abriendo…';
    document.body.style.overflow = 'hidden';
    let src;
    try {
      const rec = await DB.get('files', id);
      if (!rec) throw new Error('No se encontró el archivo de este cómic.');
      src = await VinetasCore.openComic(rec.blob);
    } catch (e) {
      closeComicReader();
      toast(esc(e && e.message ? e.message : 'No se pudo abrir el cómic.'), 6000);
      return;
    }
    if (comicReader.hidden) {
      src.close();
      return;
    }
    RC = {
      meta,
      src,
      page: meta.page >= src.count - 1 ? 0 : clamp(meta.page, 0, src.count - 1),
      cache: new Map(),
      inflight: new Map(),
      token: 0,
      s: 1,
      tx: 0,
      ty: 0,
      fit: 1,
      cw: 0,
      ch: 0,
      nw: 0,
      nh: 0
    };
    meta.lastRead = Date.now();
    $('#comicScrub').max = String(src.count);
    $('#comicScrubB').textContent = String(src.count);
    measureComic();
    updateWakeLock();
    await showComicPage(RC.page, { instant: true });
    setTimeout(() => RC && comicReader.classList.add('chrome-off'), 1500);
  }

  const thumbCache = new Map();
  let thumbQueue = [];
  let thumbActive = 0;

  async function closeComicReader() {
    clearTimeout(comicSaveTimer);
    closeSheet(true);
    if (RC) {
      if (RC.page >= RC.src.count - 1) RC.meta.done = true;
      RC.meta.page = RC.page;
      RC.meta.lastRead = Date.now();
      await persistComicMeta(RC.meta);
      for (const v of RC.cache.values()) URL.revokeObjectURL(v.url);
      thumbCache.forEach((u) => URL.revokeObjectURL(u));
      thumbCache.clear();
      RC.src.close();
      RC = null;
    }
    comicReader.hidden = true;
    pageImg.removeAttribute('src');
    document.body.style.overflow = '';
    releaseWakeLock();
    sortComics();
    renderLibrary();
  }
  $('#comicBackBtn').addEventListener('click', closeComicReader);

  function loadComicPage(i) {
    const r = RC;
    if (r.cache.has(i)) return Promise.resolve(r.cache.get(i));
    if (r.inflight.has(i)) return r.inflight.get(i);
    const p = (async () => {
      const blob = await r.src.getBlob(i);
      const { img, url } = await decodeImage(blob);
      const entry = { url, w: img.naturalWidth, h: img.naturalHeight, blob };
      if (RC === r) r.cache.set(i, entry);
      else URL.revokeObjectURL(url);
      return entry;
    })().finally(() => r.inflight.delete(i));
    r.inflight.set(i, p);
    return p;
  }
  function trimComicCache() {
    for (const [k, v] of RC.cache) {
      if (k < RC.page - 2 || k > RC.page + 3) {
        URL.revokeObjectURL(v.url);
        RC.cache.delete(k);
      }
    }
  }
  function prefetchComic() {
    const r = RC;
    [r.page + 1, r.page - 1, r.page + 2].forEach((i) => {
      if (i >= 0 && i < r.src.count && !r.cache.has(i)) loadComicPage(i).catch(() => {});
    });
  }
  function measureComic() {
    const b = comicStage.getBoundingClientRect();
    RC.cw = b.width;
    RC.ch = b.height;
  }
  function baseComicScale() {
    const { cw, ch, nw, nh } = RC;
    if (!nw) return 1;
    if (settings.fit === 'width') return cw / nw;
    if (settings.fit === 'original') return 1 / (window.devicePixelRatio || 1);
    return Math.min(cw / nw, ch / nh);
  }
  function comicLimits() {
    const W = RC.nw * RC.fit * RC.s, H = RC.nh * RC.fit * RC.s;
    return { mx: Math.max(0, (W - RC.cw) / 2), my: Math.max(0, (H - RC.ch) / 2) };
  }
  function applyComicTransform(animate = false) {
    pageEl.classList.toggle('snap', animate);
    pageEl.style.transform = `translate3d(${RC.tx}px, ${RC.ty}px, 0) scale(${RC.s})`;
    $('#zoomLabel').textContent = Math.round(RC.s * 100) + '%';
  }
  function layoutComicPage(resetView) {
    if (!RC || !RC.nw) return;
    RC.fit = baseComicScale();
    const w = RC.nw * RC.fit, h = RC.nh * RC.fit;
    pageEl.style.width = w + 'px';
    pageEl.style.height = h + 'px';
    pageEl.style.left = (RC.cw - w) / 2 + 'px';
    pageEl.style.top = (RC.ch - h) / 2 + 'px';
    if (resetView) {
      RC.s = 1;
      RC.tx = 0;
      RC.ty = 0;
      const l = comicLimits();
      RC.ty = l.my;
    }
    const l = comicLimits();
    RC.tx = clamp(RC.tx, -l.mx, l.mx);
    RC.ty = clamp(RC.ty, -l.my, l.my);
    applyComicTransform();
  }
  const layoutAllComic = () => {
    if (!RC) return;
    measureComic();
    layoutComicPage(false);
    updateComicUI();
  };
  const refitComic = (reset) => {
    if (!RC) return;
    layoutComicPage(reset);
  };
  new ResizeObserver(() => {
    if (RC) layoutAllComic();
  }).observe(comicStage);

  async function showComicPage(i, { dir = 0, instant = false } = {}) {
    const r = RC;
    i = clamp(i, 0, r.src.count - 1);
    const token = ++r.token;
    const spinTimer = setTimeout(() => {
      if (RC === r && r.token === token) setComicMsg(spinnerHtml);
    }, 220);
    let entry;
    try {
      entry = await loadComicPage(i);
    } catch (e) {
      clearTimeout(spinTimer);
      if (RC !== r || r.token !== token) return;
      setComicMsg(`<div>No se pudo cargar la página ${i + 1}.<br><small>${esc(e && e.message ? e.message : '')}</small></div>`);
      return;
    }
    clearTimeout(spinTimer);
    if (RC !== r || r.token !== token) return;
    setComicMsg('');
    r.page = i;
    r.nw = entry.w;
    r.nh = entry.h;
    pageImg.src = entry.url;
    pageEl.style.visibility = 'visible';
    layoutComicPage(true);
    if (dir && !instant && !REDUCED) {
      pageEl.animate(
        [
          { opacity: 0, transform: `translate3d(${r.tx + dir * 36}px, ${r.ty}px, 0) scale(1)` },
          { opacity: 1, transform: `translate3d(${r.tx}px, ${r.ty}px, 0) scale(1)` }
        ],
        { duration: 190, easing: 'cubic-bezier(.2,.8,.2,1)' }
      );
    }
    r.meta.page = i;
    r.meta.lastRead = Date.now();
    if (i >= r.src.count - 1) r.meta.done = true;
    scheduleComicSave();
    updateComicUI();
    trimComicCache();
    prefetchComic();
  }

  function updateComicUI() {
    if (!RC) return;
    const n = RC.src.count;
    $('#comicRSub').textContent = `Página ${RC.page + 1} de ${n}`;
    const sc = $('#comicScrub');
    sc.value = String(RC.page + 1);
    sc.style.direction = isRtl() ? 'rtl' : 'ltr';
    $('#comicScrubA').textContent = isRtl() ? String(n) : '1';
    $('#comicScrubB').textContent = isRtl() ? '1' : String(n);
    const marked = (RC.meta.bookmarks || []).includes(RC.page);
    $('#comicMarkBtn').setAttribute('aria-pressed', String(marked));
    $('#comicMarkIc').classList.toggle('fill', marked);
    $('#comicMarkIc').style.color = marked ? '#ff9f0a' : '';
    $('#zoomOut').disabled = RC.s <= 1.001;
    $('#zoomIn').disabled = RC.s >= MAX_ZOOM - 0.001;
  }

  function goComic(delta) {
    if (!RC) return false;
    const next = RC.page + delta;
    if (next < 0) {
      toast('Estás en la primera página', 1400);
      return false;
    }
    if (next >= RC.src.count) {
      toast('Última página', 1400);
      return false;
    }
    comicReader.classList.add('chrome-off');
    showComicPage(next, { dir: delta > 0 ? 1 : -1 });
    return true;
  }
  const nextComic = () => goComic(1);
  const prevComic = () => goComic(-1);

  const ptrs = new Map();
  let gesture = null;
  let lastTap = { t: 0, x: 0, y: 0 };
  let tapTimer = 0;
  const stagePoint = (e) => {
    const b = comicStage.getBoundingClientRect();
    return { x: e.clientX - b.left, y: e.clientY - b.top };
  };
  function zoomAt(newS, px, py, animate = false) {
    newS = clamp(newS, 1, MAX_ZOOM);
    const cx = RC.cw / 2, cy = RC.ch / 2;
    const k = newS / RC.s;
    RC.tx = px - cx - k * (px - cx - RC.tx);
    RC.ty = py - cy - k * (py - cy - RC.ty);
    RC.s = newS;
    const l = comicLimits();
    RC.tx = clamp(RC.tx, -l.mx, l.mx);
    RC.ty = clamp(RC.ty, -l.my, l.my);
    applyComicTransform(animate);
    updateComicUI();
  }

  comicStage.addEventListener('pointerdown', (e) => {
    if (!RC || e.button > 0) return;
    comicStage.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, stagePoint(e));
    pageEl.classList.remove('snap');
    if (ptrs.size === 1) {
      const p = stagePoint(e);
      gesture = { type: 'drag', sx: p.x, sy: p.y, stx: RC.tx, sty: RC.ty, moved: false, t0: performance.now(), ox: 0, vx: 0, lx: p.x, lt: performance.now() };
    } else if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      gesture = { type: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, s0: RC.s, cx0: (a.x + b.x) / 2, cy0: (a.y + b.y) / 2, tx0: RC.tx, ty0: RC.ty, moved: true };
    }
  });
  comicStage.addEventListener('pointermove', (e) => {
    if (!RC || !ptrs.has(e.pointerId)) return;
    const p = stagePoint(e);
    ptrs.set(e.pointerId, p);
    if (!gesture) return;
    if (gesture.type === 'pinch' && ptrs.size >= 2) {
      const [a, b] = [...ptrs.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
      const s = clamp((gesture.s0 * d) / gesture.d0, 1, MAX_ZOOM);
      const k = s / gesture.s0;
      const ox = gesture.cx0 - RC.cw / 2, oy = gesture.cy0 - RC.ch / 2;
      RC.s = s;
      RC.tx = cx - RC.cw / 2 - k * (ox - gesture.tx0);
      RC.ty = cy - RC.ch / 2 - k * (oy - gesture.ty0);
      const l = comicLimits();
      RC.tx = clamp(RC.tx, -l.mx, l.mx);
      RC.ty = clamp(RC.ty, -l.my, l.my);
      applyComicTransform();
      return;
    }
    if (gesture.type === 'drag') {
      const dx = p.x - gesture.sx, dy = p.y - gesture.sy;
      if (!gesture.moved && Math.hypot(dx, dy) > 8) gesture.moved = true;
      if (!gesture.moved) return;
      const now = performance.now();
      if (now - gesture.lt > 0) gesture.vx = (p.x - gesture.lx) / (now - gesture.lt);
      gesture.lx = p.x;
      gesture.lt = now;
      const l = comicLimits();
      const wantX = gesture.stx + dx, wantY = gesture.sty + dy;
      const cx = clamp(wantX, -l.mx, l.mx);
      gesture.ox = wantX - cx;
      RC.tx = cx + gesture.ox * 0.9;
      RC.ty = clamp(wantY, -l.my, l.my);
      applyComicTransform();
    }
  });
  function endComicPointer(e) {
    if (!RC || !ptrs.has(e.pointerId)) return;
    const p = ptrs.get(e.pointerId);
    ptrs.delete(e.pointerId);
    if (!gesture) return;
    if (gesture.type === 'pinch') {
      if (ptrs.size < 2) {
        gesture = ptrs.size === 1 ? { type: 'drag', sx: [...ptrs.values()][0].x, sy: [...ptrs.values()][0].y, stx: RC.tx, sty: RC.ty, moved: true, t0: 0, ox: 0, vx: 0, lx: 0, lt: performance.now() } : null;
        if (RC.s < 1.02) {
          RC.s = 1;
          layoutComicPage(false);
        }
      }
      return;
    }
    const g = gesture;
    gesture = null;
    if (e.type === 'pointercancel') {
      springBackComic();
      return;
    }
    if (!g.moved && performance.now() - g.t0 < 450) {
      handleComicTap(p);
      return;
    }
    const threshold = Math.min(90, RC.cw * 0.18);
    const fast = Math.abs(g.vx) > 0.55 && Math.abs(g.ox) > 18;
    if (Math.abs(g.ox) > threshold || fast) {
      const towardsNext = (g.ox < 0) === !isRtl();
      commitComicTurn(towardsNext ? 1 : -1, g.ox < 0 ? -1 : 1);
    } else springBackComic();
  }
  comicStage.addEventListener('pointerup', endComicPointer);
  comicStage.addEventListener('pointercancel', endComicPointer);
  ['gesturestart', 'gesturechange'].forEach((n) => comicStage.addEventListener(n, (e) => e.preventDefault()));

  function springBackComic() {
    if (!RC) return;
    const l = comicLimits();
    RC.tx = clamp(RC.tx, -l.mx, l.mx);
    RC.ty = clamp(RC.ty, -l.my, l.my);
    applyComicTransform(true);
  }
  async function commitComicTurn(delta, slideSign) {
    if (!RC) return;
    const target = RC.page + delta;
    if (target < 0 || target >= RC.src.count) {
      springBackComic();
      toast(target < 0 ? 'Estás en la primera página' : 'Última página', 1400);
      return;
    }
    if (!REDUCED) {
      RC.tx += slideSign * Math.min(RC.cw * 0.5, 160);
      pageEl.style.opacity = '0';
      applyComicTransform(true);
      await wait(120);
    }
    if (!RC) return;
    pageEl.classList.remove('snap');
    pageEl.style.opacity = '';
    comicReader.classList.add('chrome-off');
    await showComicPage(target, { dir: -slideSign });
  }
  function handleComicTap(p) {
    const now = performance.now();
    const center = p.x > RC.cw * 0.3 && p.x < RC.cw * 0.7;
    const zoomed = RC.s > 1.02;
    const edge = !zoomed && settings.zones && !center;
    if (edge) {
      const leftZone = p.x <= RC.cw * 0.3;
      leftZone === !isRtl() ? prevComic() : nextComic();
      lastTap = { t: 0, x: 0, y: 0 };
      return;
    }
    const isDouble = now - lastTap.t < 320 && Math.hypot(p.x - lastTap.x, p.y - lastTap.y) < 40;
    clearTimeout(tapTimer);
    if (isDouble) {
      lastTap = { t: 0, x: 0, y: 0 };
      if (zoomed) zoomAt(1, p.x, p.y, true);
      else zoomAt(2.6, p.x, p.y, true);
      comicReader.classList.add('chrome-off');
      return;
    }
    lastTap = { t: now, x: p.x, y: p.y };
    tapTimer = setTimeout(() => comicReader.classList.toggle('chrome-off'), 240);
  }

  comicStage.addEventListener('wheel', (e) => {
    if (!RC) return;
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const p = stagePoint(e);
      zoomAt(RC.s * Math.exp(-e.deltaY * 0.01), p.x, p.y);
      return;
    }
    const l = comicLimits();
    if (l.my > 0 || l.mx > 0) {
      RC.tx = clamp(RC.tx - e.deltaX, -l.mx, l.mx);
      RC.ty = clamp(RC.ty - e.deltaY, -l.my, l.my);
      applyComicTransform();
      return;
    }
    const t = performance.now();
    if (t - (RC.wheelT || 0) > 280 && Math.abs(e.deltaY) > 4) {
      RC.wheelT = t;
      e.deltaY > 0 ? nextComic() : prevComic();
    }
  }, { passive: false });

  $('#zoomIn').addEventListener('click', () => RC && zoomAt(RC.s * 1.5, RC.cw / 2, RC.ch / 2, true));
  $('#zoomOut').addEventListener('click', () => RC && zoomAt(RC.s / 1.5, RC.cw / 2, RC.ch / 2, true));
  $('#fitBtn').addEventListener('click', () => {
    const order = ['page', 'width', 'original'];
    settings.fit = order[(order.indexOf(settings.fit) + 1) % order.length];
    saveSettings();
    refitComic(true);
    updateComicUI();
    toast({ page: 'Página completa', width: 'Ajustar al ancho', original: 'Tamaño original' }[settings.fit], 1300);
  });
  $('#comicMarkBtn').addEventListener('click', () => {
    if (!RC) return;
    const list = (RC.meta.bookmarks = RC.meta.bookmarks || []);
    const at = list.indexOf(RC.page);
    if (at >= 0) {
      list.splice(at, 1);
      toast('Marcador quitado', 1300);
    } else {
      list.push(RC.page);
      list.sort((a, b) => a - b);
      toast('Página marcada', 1300);
    }
    persistComicMeta(RC.meta);
    updateComicUI();
  });
  $('#comicRSettings').addEventListener('click', () => {
    if (!RC) return;
    openSheet({
      title: 'Ajustes del cómic',
      build(body) {
        const g1 = group(stackRow('Tema', segmented(THEME_OPTS, settings.theme, (v) => { settings.theme = v; saveSettings(); applyTheme(); })));
        body.appendChild(g1);
        comicReadingControls(body, RC.meta);
      }
    });
  });

  const comicScrub = $('#comicScrub');
  comicScrub.addEventListener('input', () => {
    if (RC) $('#comicRSub').textContent = `Página ${comicScrub.value} de ${RC.src.count}`;
  });
  comicScrub.addEventListener('change', () => {
    if (RC) showComicPage(Number(comicScrub.value) - 1);
  });

  function pumpThumbs() {
    while (thumbActive < 2 && thumbQueue.length) {
      const job = thumbQueue.shift();
      thumbActive++;
      job().finally(() => {
        thumbActive--;
        pumpThumbs();
      });
    }
  }
  function requestThumb(i, imgHolder) {
    const r = RC;
    if (thumbCache.has(i)) {
      imgHolder.innerHTML = `<img alt="" src="${thumbCache.get(i)}">`;
      return;
    }
    imgHolder.innerHTML = '<div class="mini-spin"></div>';
    thumbQueue.push(async () => {
      if (RC !== r) return;
      try {
        let url = thumbCache.get(i);
        if (!url) {
          const blob = r.cache.get(i)?.blob || (await r.src.getBlob(i));
          url = URL.createObjectURL(await makeThumb(blob, 220, 0.7));
          if (RC === r) thumbCache.set(i, url);
          else {
            URL.revokeObjectURL(url);
            return;
          }
        }
        imgHolder.innerHTML = `<img alt="" src="${url}">`;
      } catch (e) {
        imgHolder.textContent = '!';
      }
    });
    pumpThumbs();
  }
  function openComicIndex(startTab = 'pages') {
    if (!RC) return;
    let current = startTab;
    openSheet({
      title: 'Índice de páginas',
      tall: true,
      onClose() {
        thumbQueue = [];
      },
      build(body) {
        const render = () => {
          body.innerHTML = '';
          const marks = RC.meta.bookmarks || [];
          const seg = segmented(
            [{ value: 'pages', label: 'Páginas' }, { value: 'marks', label: `Marcadores${marks.length ? ' (' + marks.length + ')' : ''}` }],
            current,
            (v) => {
              current = v;
              thumbQueue = [];
              render();
            }
          );
          body.appendChild(seg);
          if (current === 'pages') {
            const grid = el('div', 'thumbs');
            const io = new IntersectionObserver(
              (entries) => {
                entries.forEach((en) => {
                  if (en.isIntersecting) {
                    io.unobserve(en.target);
                    requestThumb(Number(en.target.dataset.i), $('.thumb-img', en.target));
                  }
                });
              },
              { root: body, rootMargin: '300px 0px' }
            );
            for (let i = 0; i < RC.src.count; i++) {
              const b = el(
                'button',
                'thumb' + (i === RC.page ? ' current' : ''),
                `<span class="thumb-img"></span><span>${i + 1}</span>${marks.includes(i) ? `<span class="mark">${icon('bookmark', 'fill')}</span>` : ''}`
              );
              b.type = 'button';
              b.dataset.i = i;
              b.addEventListener('click', () => {
                closeSheet();
                comicReader.classList.add('chrome-off');
                showComicPage(i);
              });
              grid.appendChild(b);
              io.observe(b);
            }
            body.appendChild(grid);
            requestAnimationFrame(() => $('.thumb.current', grid)?.scrollIntoView({ block: 'center' }));
          } else if (!marks.length) {
            body.insertAdjacentHTML('beforeend', `<div class="list-empty">Aún no hay marcadores.<br>Toca el icono del marcador mientras lees para guardar una página.</div>`);
          } else {
            const g = el('div', 'group');
            marks.forEach((i) => {
              const row = el(
                'div',
                'row',
                `<button class="mark-row" type="button"><span class="thumb-img"></span><span class="t">Página ${i + 1}<small>de ${RC.src.count}</small></span></button><button class="rm" type="button" aria-label="Quitar marcador" style="margin-right:8px;color:var(--danger);width:36px;height:36px;display:inline-flex;align-items:center;justify-content:center">${icon('x')}</button>`
              );
              row.style.padding = '0';
              requestThumb(i, $('.thumb-img', row));
              $('.mark-row', row).addEventListener('click', () => {
                closeSheet();
                comicReader.classList.add('chrome-off');
                showComicPage(i);
              });
              $('.rm', row).addEventListener('click', () => {
                RC.meta.bookmarks = RC.meta.bookmarks.filter((x) => x !== i);
                persistComicMeta(RC.meta);
                updateComicUI();
                render();
              });
              g.appendChild(row);
            });
            body.appendChild(g);
          }
        };
        render();
      }
    });
  }
  $('#comicIndexBtn').addEventListener('click', () => openComicIndex('pages'));

  /* ════════ Atajos de Teclado (Ambos Lectores) ════════ */
  addEventListener('keydown', (e) => {
    if (document.querySelector('.alert-wrap')) return;
    if (RB && !bookReader.hidden) {
      if (e.key === 'Escape') {
        if (sheetState) closeSheet();
        else closeBookReader();
        return;
      }
      if (e.target instanceof HTMLInputElement || sheetState) return;
      const k = e.key;
      if (k === 'ArrowRight' || k === 'PageDown' || (k === ' ' && !e.shiftKey)) {
        e.preventDefault();
        nextBookPage();
      } else if (k === 'ArrowLeft' || k === 'PageUp' || (k === ' ' && e.shiftKey)) {
        e.preventDefault();
        prevBookPage();
      } else if (k === 'Home') {
        e.preventDefault();
        gotoBook({ i: 0, f: 0 });
      } else if (k === 'End') {
        e.preventDefault();
        gotoBook({ i: RB.book.spine.length - 1, f: 1 });
      }
      return;
    }
    if (RC && !comicReader.hidden) {
      if (e.key === 'Escape') {
        if (sheetState) closeSheet();
        else closeComicReader();
        return;
      }
      if (e.target instanceof HTMLInputElement || sheetState) return;
      const k = e.key;
      const rtl = isRtl();
      if (k === 'ArrowRight') {
        e.preventDefault();
        rtl ? prevComic() : nextComic();
      } else if (k === 'ArrowLeft') {
        e.preventDefault();
        rtl ? nextComic() : prevComic();
      } else if (k === 'PageDown' || (k === ' ' && !e.shiftKey)) {
        e.preventDefault();
        nextComic();
      } else if (k === 'PageUp' || (k === ' ' && e.shiftKey)) {
        e.preventDefault();
        prevComic();
      } else if (k === '+' || k === '=') zoomAt(RC.s * 1.3, RC.cw / 2, RC.ch / 2, true);
      else if (k === '-') zoomAt(RC.s / 1.3, RC.cw / 2, RC.ch / 2, true);
    }
  });

  /* ════════ WakeLock (Mantener pantalla encendida) ════════ */
  let wakeLock = null;
  async function updateWakeLock() {
    if (!settings.keepAwake || (!RB && !RC) || document.hidden) {
      releaseWakeLock();
      return;
    }
    try {
      if (!wakeLock && navigator.wakeLock) {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => {
          wakeLock = null;
        });
      }
    } catch (e) {}
  }
  function releaseWakeLock() {
    try {
      wakeLock && wakeLock.release();
    } catch (e) {}
    wakeLock = null;
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (RB) {
        clearTimeout(bookSaveTimer);
        persistBookMeta(RB.meta);
      }
      if (RC) {
        clearTimeout(comicSaveTimer);
        persistComicMeta(RC.meta);
      }
    }
    updateWakeLock();
  });
  addEventListener('pagehide', () => {
    if (RB) persistBookMeta(RB.meta);
    if (RC) persistComicMeta(RC.meta);
  });

  /* ════════ Arranque de Omnilector ════════ */
  (async function boot() {
    applyTheme();
    applyAccent();
    applyReadTheme();
    applyBookVars();
    renderFilterSeg();

    // Proveedor WebAssembly bajo demanda para descomprimir archivos RAR/CBR
    VinetasCore.setWasmProvider(async () => {
      const b64 = window.__UNRAR_WASM_B64__;
      if (!b64) return undefined;
      const bin = atob(b64);
      const out = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
      return out;
    });

    await DB.open();
    try {
      await loadLibrary();
    } catch (e) {
      books = [];
      comics = [];
      cats = [];
      renderLibrary();
    }
    if (DB.memOnly) {
      toast('Este navegador no permite almacenamiento permanente: la biblioteca durará mientras la pestaña siga abierta.', 6500);
    }
    if (IS_PWA) {
      try {
        const r = await Cloud.msFinish();
        if (r && r.error) toast('Microsoft: ' + esc(r.error), 6000);
        else if (r && r.ok) openCloudBrowser('ms');
      } catch (e) {}
      if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
        navigator.serviceWorker.register('sw.js').catch(() => {});
      }
    }
    window.__omnilectorReady = true;
  })();
})();

