// db.js — capa IndexedDB de gym-tracker.
// Diferencias deliberadas vs habitos-app:
//   · UNA conexión cacheada (la vieja abría una nueva por CADA operación).
//   · Índices que sí se usan (sets/cardio por sesión y ejercicio).
//   · Errores siempre propagados; la UI decide cómo mostrarlos.
//   · `musculos` es array nativo (la vieja guardaba JSON-string).

const DB_NAME = 'gymtracker-db';
const DB_VERSION = 1;

let _connPromise = null;

export function openDB() {
  if (_connPromise) return _connPromise;
  _connPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('sesiones')) {
        db.createObjectStore('sesiones', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('ejercicios')) {
        const ej = db.createObjectStore('ejercicios', { keyPath: 'id', autoIncrement: true });
        ej.createIndex('nombre', 'nombre', { unique: true });
      }
      if (!db.objectStoreNames.contains('sets')) {
        const st = db.createObjectStore('sets', { keyPath: 'id', autoIncrement: true });
        st.createIndex('sesion_id', 'sesion_id');
        st.createIndex('ejercicio_id', 'ejercicio_id');
      }
      if (!db.objectStoreNames.contains('cardio')) {
        const ca = db.createObjectStore('cardio', { keyPath: 'id', autoIncrement: true });
        ca.createIndex('sesion_id', 'sesion_id');
      }
      if (!db.objectStoreNames.contains('preferencias')) {
        db.createObjectStore('preferencias', { keyPath: 'clave' });
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      // Si otro tab/versión fuerza upgrade, soltar la conexión cacheada.
      db.onversionchange = () => { db.close(); _connPromise = null; };
      resolve(db);
    };
    req.onerror = () => { _connPromise = null; reject(req.error); };
  });
  return _connPromise;
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function dbGet(store, key) {
  const db = await openDB();
  return reqToPromise(db.transaction(store, 'readonly').objectStore(store).get(key));
}

export async function dbPut(store, value) {
  const db = await openDB();
  return reqToPromise(db.transaction(store, 'readwrite').objectStore(store).put(value));
}

export async function dbDelete(store, key) {
  const db = await openDB();
  return reqToPromise(db.transaction(store, 'readwrite').objectStore(store).delete(key));
}

export async function dbGetAll(store) {
  const db = await openDB();
  return reqToPromise(db.transaction(store, 'readonly').objectStore(store).getAll());
}

// getAll por índice — evita traer la tabla entera para filtrar en JS.
export async function dbGetAllBy(store, index, value) {
  const db = await openDB();
  return reqToPromise(
    db.transaction(store, 'readonly').objectStore(store).index(index).getAll(value)
  );
}

// Borra en cascada una sesión con sus sets y cardio, en UNA transacción.
export async function dbDeleteSessionCascade(sesionId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['sesiones', 'sets', 'cardio'], 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    const sets = tx.objectStore('sets');
    sets.index('sesion_id').getAllKeys(sesionId).onsuccess = (e) => {
      e.target.result.forEach((k) => sets.delete(k));
    };
    const cardio = tx.objectStore('cardio');
    cardio.index('sesion_id').getAllKeys(sesionId).onsuccess = (e) => {
      e.target.result.forEach((k) => cardio.delete(k));
    };
    tx.objectStore('sesiones').delete(sesionId);
  });
}

// Import masivo en una sola transacción (roll-back automático si algo falla).
export async function dbBulkImport({ sesiones, ejercicios, sets, cardio }) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['sesiones', 'ejercicios', 'sets', 'cardio'], 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Import abortado'));
    (sesiones || []).forEach((r) => tx.objectStore('sesiones').put(r));
    (ejercicios || []).forEach((r) => tx.objectStore('ejercicios').put(r));
    (sets || []).forEach((r) => tx.objectStore('sets').put(r));
    (cardio || []).forEach((r) => tx.objectStore('cardio').put(r));
  });
}

// Preferencias con default.
export async function prefGet(clave, def) {
  const row = await dbGet('preferencias', clave);
  return row && row.valor !== undefined ? row.valor : def;
}

export async function prefSet(clave, valor) {
  return dbPut('preferencias', { clave, valor });
}
