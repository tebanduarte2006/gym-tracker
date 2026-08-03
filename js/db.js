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
    req.onblocked = () => {
      // Otra pestaña/instancia bloquea el upgrade. No es fatal: se resuelve
      // cuando la otra suelte. Dejamos constancia para el debug.
      console.warn('[gym-tracker] openDB bloqueado por otra instancia');
    };
    req.onsuccess = () => {
      const db = req.result;
      // Si otro tab/versión fuerza upgrade, soltar la conexión cacheada.
      db.onversionchange = () => { db.close(); _connPromise = null; };
      // iOS puede cerrar la conexión por presión de memoria o suspensión larga.
      // Sin esto, _connPromise queda apuntando a una conexión muerta y CADA
      // operación posterior lanza InvalidStateError: la app queda inservible
      // hasta matarla y reabrirla.
      db.onclose = () => { _connPromise = null; };
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

// Ejecuta `fn(db)` y, si la conexión cacheada estaba muerta (InvalidStateError
// al abrir la transacción), la descarta, reabre UNA vez y reintenta.
// Todo acceso a la DB pasa por aquí: es la red de seguridad de la PWA en iOS.
async function withDB(fn) {
  const db = await openDB();
  try {
    return await fn(db);
  } catch (err) {
    if (!err || err.name !== 'InvalidStateError') throw err;
    console.warn('[gym-tracker] conexión IndexedDB muerta; reabriendo');
    _connPromise = null;
    const fresh = await openDB();
    return fn(fresh);
  }
}

export async function dbGet(store, key) {
  return withDB((db) => reqToPromise(db.transaction(store, 'readonly').objectStore(store).get(key)));
}

export async function dbPut(store, value) {
  return withDB((db) => reqToPromise(db.transaction(store, 'readwrite').objectStore(store).put(value)));
}

export async function dbDelete(store, key) {
  return withDB((db) => reqToPromise(db.transaction(store, 'readwrite').objectStore(store).delete(key)));
}

export async function dbGetAll(store) {
  return withDB((db) => reqToPromise(db.transaction(store, 'readonly').objectStore(store).getAll()));
}

// getAll por índice — evita traer la tabla entera para filtrar en JS.
export async function dbGetAllBy(store, index, value) {
  return withDB((db) => reqToPromise(
    db.transaction(store, 'readonly').objectStore(store).index(index).getAll(value)
  ));
}

// Borra en cascada una sesión con sus sets y cardio, en UNA transacción.
export async function dbDeleteSessionCascade(sesionId) {
  return withDB((db) => new Promise((resolve, reject) => {
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
  }));
}

// Import masivo en una sola transacción (roll-back automático si algo falla).
// `preferencias` incluida: sin ella, restaurar un backup en otro teléfono perdía
// el descanso por defecto y el contador de workouts.
export async function dbBulkImport({ sesiones, ejercicios, sets, cardio, preferencias }) {
  return withDB((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(['sesiones', 'ejercicios', 'sets', 'cardio', 'preferencias'], 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Import abortado'));
    (sesiones || []).forEach((r) => tx.objectStore('sesiones').put(r));
    (ejercicios || []).forEach((r) => tx.objectStore('ejercicios').put(r));
    (sets || []).forEach((r) => tx.objectStore('sets').put(r));
    (cardio || []).forEach((r) => tx.objectStore('cardio').put(r));
    (preferencias || []).forEach((r) => tx.objectStore('preferencias').put(r));
  }));
}

// Preferencias con default.
export async function prefGet(clave, def) {
  const row = await dbGet('preferencias', clave);
  return row && row.valor !== undefined ? row.valor : def;
}

export async function prefSet(clave, valor) {
  return dbPut('preferencias', { clave, valor });
}
