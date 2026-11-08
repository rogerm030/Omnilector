// ═══════════════════════════════════════════════════════════════════════════
// Omnilector — Base de Datos Unificada (IndexedDB con respaldo en memoria)
// Almacena: 'books' (EPUBs), 'comics' (CBZ/CBR/CBT), 'files' (Blobs) y 'cats' (Categorías compartidas)
// ═══════════════════════════════════════════════════════════════════════════

window.OmnilectorDB = (() => {
  let idb = null;
  let memOnly = false;
  const STORES = ['books', 'comics', 'files', 'cats'];
  const mem = {
    books: new Map(),
    comics: new Map(),
    files: new Map(),
    cats: new Map()
  };

  const req = (r) =>
    new Promise((res, rej) => {
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });

  async function open() {
    try {
      idb = await new Promise((res, rej) => {
        const r = indexedDB.open('omnilector', 1);
        r.onupgradeneeded = () => {
          const db = r.result;
          for (const n of STORES) {
            if (!db.objectStoreNames.contains(n)) {
              db.createObjectStore(n, { keyPath: 'id' });
            }
          }
        };
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
        r.onblocked = () => rej(new Error('blocked'));
      });
      try {
        navigator.storage?.persist?.();
      } catch (e) {}
    } catch (e) {
      memOnly = true;
    }
    return !memOnly;
  }

  const store = (n, mode) => idb.transaction(n, mode).objectStore(n);

  return {
    open,
    get memOnly() {
      return memOnly;
    },
    async all(n) {
      return memOnly ? [...mem[n].values()] : req(store(n, 'readonly').getAll());
    },
    async get(n, id) {
      return memOnly ? mem[n].get(id) : req(store(n, 'readonly').get(id));
    },
    async put(n, v) {
      if (memOnly) {
        mem[n].set(v.id, v);
        return;
      }
      await req(store(n, 'readwrite').put(v));
    },
    async del(n, id) {
      if (memOnly) {
        mem[n].delete(id);
        return;
      }
      await req(store(n, 'readwrite').delete(id));
    }
  };
})();

