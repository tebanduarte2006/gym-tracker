# Ruta: descanso, alarma y pantalla encendida

## Qué es
El temporizador de descanso entre series, la alarma que avisa cuando termina (también con la pantalla bloqueada, en lo posible) y el Wake Lock que impide que la pantalla se apague durante la sesión.

## Archivos y funciones
| Dónde | Qué |
|---|---|
| `js/resttimer.js` | Descanso por **timestamp** (`endTs` fijo, sobrevive a bloqueo y segundo plano): `startRest`, `stopRest`, `restActive`, `restState`, `bindRestUI` |
| `js/audio.js` | `buildAlarmWav` / `crearWav` (clip silencio + tono), `installAudioUnlock`, `scheduleAlarm`, `cancelAlarm`, `alarmWasLost`, `beep` (respaldo Web Audio), `setBackgroundAlarm` / `backgroundAlarmEnabled` |
| `js/wakelock.js` | `keepAwake`, `releaseAwake` |
| `js/ui/entrenar.js` | `setupRestBar`, `resolveRest`, `openRestConfigModal` (descanso por ejercicio o solo esta sesión) |
| `js/ui/ajustes.js` | `buildAlarmCard`: interruptor `alarma_fondo` y botón de probar (Ajustes → ALARMA DE DESCANSO). `buildGlobalRestCard`: descanso por defecto (`rest_default`) |

## Reglas de producto
- Descanso por defecto 90 s (`rest_default`), configurable por ejercicio (`rest_sec`, persistente) o solo esta sesión (en memoria), desde la sesión activa o desde el detalle del ejercicio.
- **Widgets de pantalla de inicio y Live Activities: imposibles en una PWA de iOS** (necesitan app nativa con WidgetKit/ActivityKit). No se le prometen.
- **No escribas en la documentación ni en la interfaz que el aviso suena SIEMPRE con la pantalla bloqueada.** Es best-effort; la defensa real es el Wake Lock.
- iOS Safari no tiene `navigator.vibrate` (lección 1). Todo conteo va contra timestamp fijo, nunca `setInterval` decrementando (lección 2).

## Alarma de descanso (reescrita el 2026-09-13)

Reescrita el 2026-09-13 sobre dos reportes de Esteban que son problemas
distintos y tienen arreglos distintos.

**A) "Muy suave y muy grave; con la música y el ruido del gimnasio no la oigo."**
El beep eran dos **senoidales puras** de 880 y 1175 Hz a ganancia 0.35. Una
senoidal pura es la peor forma de onda posible para un aviso en ruido: toda su
energía está en una frecuencia y el ruido de banda ancha de un gimnasio la tapa
entera. Tres cambios, los tres necesarios:

1. **2000 Hz con armónicos** (fundamental + 2º + 3º), no una senoidal. El oído
   humano es más sensible entre 2 y 4 kHz y el altavoz del iPhone rinde mucho
   mejor ahí que en los graves — que es literalmente lo que él describió.
2. **Fondo de escala.** La normalización va por el **pico real** de la onda
   (1.4198, medido), no por la suma de las amplitudes (1.8): dividir por la suma
   dejaba la alarma ~3 dB por debajo de lo que el clip permite.
3. **Patrón, no un pitido:** seis pulsos de 140 ms (3 + pausa + 3). Un sonido
   con ritmo se distingue del ruido ambiente aunque el nivel sea parecido.

**B) "Con el celular bloqueado no suena hasta que entro a la app."** Cierto, y
el mecanismo anterior NO podía arreglarlo. `scheduleBeep` programaba el tono en
el reloj del AudioContext, e **iOS suspende el AudioContext al bloquear la
pantalla**: se programaba algo en un reloj que se para.

Lo único que iOS deja seguir con la pantalla apagada es la **reproducción de un
elemento `<audio>`** (es lo que hace cualquier reproductor de música web). Pero
un `<audio>` no se puede "programar" para dentro de 90 s: programar exige que el
JS corra a esa hora, y el JS está congelado. Así que se le da **ya** un clip que
dura exactamente el descanso: **silencio + el tono al final**, generado byte a
byte en memoria (`crearWav`). El reloj que cuenta pasa a ser el del reproductor
del sistema, no el nuestro.

Cinco cosas que parecen detalles y no lo son:

1. **Un solo elemento `<audio>`, reutilizado.** El permiso de reproducción de
   iOS es del ELEMENTO, y `startRest()` se llama dentro de un `.then()` de
   IndexedDB, o sea ya fuera del gesto del usuario. Por eso el primer toque en
   la app reproduce 50 ms de silencio en ese elemento para dejarlo autorizado el
   resto de la vida de la página, y después solo se le cambia el `src`. Crear un
   elemento por descanso lo rompería en el primer descanso.
2. **Blob URL, no data URI.** Un data URI obliga a pasar el clip por base64:
   +33 % de tamaño y una cadena de 2 MB construida en medio del entrenamiento.
3. **PCM 8 bits a 16 kHz.** El silencio es exactamente 128 (silencio digital, no
   "casi") y 90 s ocupan 1.4 MB que se liberan al terminar el descanso. Hay un
   tope de 900 s: por encima el WAV pesaría más que la app entera.
4. **Se corrige la latencia de arranque.** Cargar el clip y empezar cuesta unos
   milisegundos y ese retraso se acumularía entero al final; tras `play()` se
   adelanta el cabezal lo que se tardó.
5. **`alarmWasLost()` mira el CABEZAL del reproductor**, no el estado del
   AudioContext: si el clip llegó al tono, sonó; si iOS lo paró antes, no sonó y
   el rest timer dispara la alarma inmediata al volver. Es un hecho observable,
   no una suposición — y es lo que evita sonar dos veces en el caso normal.

**El coste, y por qué hay un interruptor.** Mientras dura el descanso la app
ocupa el "now playing" de iOS y **puede pausar la música que estés oyendo**. Eso
no se puede decidir por él: es la preferencia `alarma_fondo` (Ajustes →
ALARMA DE DESCANSO, `buildAlarmCard` en `js/ui/ajustes.js`), encendida por defecto. Apagada, la app **no toca el
reproductor del sistema ni para autorizar el elemento** — apagar tiene que
significar eso exactamente, no "casi". Junto al interruptor hay un botón de
**probar**, porque el volumen de una alarma no se evalúa en una sala en
silencio: hay que oírla en el gimnasio antes de confiarle un descanso.

**Lo que NO se puede prometer:** que suene siempre con la pantalla bloqueada.
Si iOS mata la reproducción de una PWA en segundo plano, se pierde igual. En
esta entrega esto se verificó en **Chromium**, no en el iPhone: el clip se arma,
se reproduce, dura descanso + patrón, se cancela al saltar el descanso y el
respaldo salta cuando se simula que el sistema para la reproducción. **El
comportamiento real con la pantalla bloqueada solo lo confirma el iPhone.**

## Cómo probar
- `npm test` → `tests/audio.test.js` (el WAV generado: duración, silencio exacto, pico).
- En Chromium: el clip se arma, dura descanso + patrón, se cancela al saltar el descanso y el respaldo salta si se simula que el sistema paró la reproducción. **Con la pantalla bloqueada, solo el iPhone lo confirma** (pendiente en `docs/esteban/pruebas-iphone.md`).

## Lecciones que aplican
1, 2, 45, 46, 47, 48, 49, 50, 52.

## graphify
`graphify explain "scheduleAlarm"` · `graphify explain "alarmWasLost"` · `graphify explain "startRest"`
