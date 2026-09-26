# Ruta: datos, IndexedDB y respaldos

## Qué es
Dónde viven los datos de Esteban y cómo se respaldan. **Hoy todo vive en el teléfono** (IndexedDB de la PWA): si se borra la app, se borran los datos. El único respaldo es exportar un JSON a mano (Progresión → DATOS). Cualquier cambio aquí toca datos reales: las migraciones destructivas requieren permiso (CLAUDE.md §5).

## Archivos y funciones
| Dónde | Qué |
|---|---|
| `js/db.js` | UNA conexión cacheada con `withDB()` (reabre si iOS la mata: lección 12), `dbGet/Put/Delete/GetAll/GetAllBy`, `dbDeleteSessionCascade`, `dbBulkImport` (transaccional, preferencias con lista blanca), `prefGet` / `prefSet` |
| `js/importer.js` [puro] | `normalizeBackup` (backups v2 de habitos-app, con su deuda, y v3 nativo), `buildExport`, `EXPORT_VERSION`, `PREFS_IMPORTABLES` |
| `js/ui/progresion.js` | `exportData` (`<a download>` sobre un blob), `importData` |
| `js/main.js` | `maybeOfferSeed`: con la base vacía ofrece restaurar `data/seed.json` |
| `data/seed.json` | Backup real de habitos-app (2026-07-28): 35 sesiones, 578 sets. Datos de prueba de todos los scripts |

## Esquema IndexedDB (`gymtracker-db` v1)

```
sesiones   { id (AI), nombre, fecha (ISO), timestamp_inicio, duracion_ms?,
             finalizada (bool), routine_type?, ej_orden? [ejercicio_id] }
ejercicios { id (AI), nombre (índice unique), musculos [array nativo],
             tipo? (free-text: última rutina en que se usó), rest_sec?,
             fecha_creacion? }
             · rest_sec: descanso default del ejercicio; null → pref rest_default (90s)
sets       { id (AI), sesion_id (índice), ejercicio_id (índice),
             peso (kg SIEMPRE), reps, orden?, status, unidad? ('lbs'|'kg'), ts? }
             · status: Pending | Done | Skipped
             · status: Pending = PROPUESTO (autollenado, aún no lo has hecho,
               no cuenta para nada) · Done = REGISTRADO · Skipped = solo legacy,
               la app ya no lo crea (no había ninguno en el histórico real)
             · placeholder técnico = Pending + peso 0 + reps 0 (ancla ejercicio↔sesión;
               se eliminan TODOS los Pending al finalizar la sesión, propuestos
               incluidos: lo que no registraste no pasó)
             · unidad: lo que Esteban tecleó (para recordar por-ejercicio su última unidad)
cardio     { id (AI), sesion_id (índice), tipo (free-text), duracion_min,
             velocidad_kmh?, inclinacion?, orden?, ts? }
preferencias { clave, valor }
             · rest_default (90) · contador_workouts · seed_decidido · bar_lbs (45)
             · musculos_migrados (bool): ya se ofreció la migración de `ejercicios-y-musculos.md`
             · alarma_fondo (bool, default true): la alarma de descanso puede
               ocupar el reproductor del sistema para sonar con la pantalla
               bloqueada. Se apaga desde Progresión → ALARMA DE DESCANSO. Ver `descanso-y-alarma.md`
             · TODA clave nueva va también a PREFS_IMPORTABLES en importer.js,
               o restaurar un backup la pierde en silencio (hay test que lo exige).
```

**Cambios de schema:** subir `DB_VERSION`, migrar en `onupgradeneeded`,
actualizar `importer.js` + tests + esta sección, en el mismo commit.

## Reglas
- **Peso canónico SIEMPRE en kg** en la base. La unidad es asunto de entrada y pantalla, jamás de almacenamiento.
- **Toda preferencia nueva va a `PREFS_IMPORTABLES`**, o restaurar un backup la pierde en silencio. Hay una prueba que lo exige (lección 27).
- **Los esquemas viejos nunca mueren** (lección 5): el importador rescata los 167 sets con solo `peso_lbs`. Nunca asumas que el histórico es uniforme.
- IndexedDB no indexa booleanos (lección 10).
- Si el nombre de una prueba promete "conserva todo", sus aserciones lo comprueban entero (lección 11).
- **Registro en el vault de Obsidian**: el export mensual lo vuelca un agente a `20 Areas/Salud/Gym/` del vault Ideaverse según `90 Sistema/Formato Registro Gym.md`. Revisa ese documento antes de cambiar el formato del export.

## Riesgo abierto
Exportar en la PWA instalada de iOS no está verificado: `<a download>` puede ignorarse sin aviso en modo standalone. Si no funciona, **Esteban no tiene ningún respaldo**. Ver `docs/proyecto/progreso.md`.

## Cómo probar
`npm test` → `tests/importer.test.js` (ida y vuelta v3 completa, v2 legacy, lista blanca de preferencias).

## Lecciones que aplican
4, 5, 7, 10, 11, 12, 27.

## graphify
`graphify explain "normalizeBackup"` · `graphify explain "withDB"` · `graphify explain "dbBulkImport"`
