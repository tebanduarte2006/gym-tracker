# Progreso

## Estado (2026-11-12)
App completa y en uso diario en el iPhone 11 de Esteban, publicada en GitHub Pages. Entrenar con autollenado, registro por botón, cardio, descanso con alarma, reordenar arrastrando, directorio de ejercicios con 18 músculos, Progresión con PR, gráfica, sets por músculo y exportar/importar. 101 pruebas automáticas. Desde el 2026-11-12: buscador de ejercicios sobre el teclado, aviso de récord, descanso con −15/+15 y reloj por ejercicio de un toque, discos dibujados, gráfica con tres métricas y ficha en la pantalla bloqueada. El detalle de cada entrega está en `historial.md`.

## Lo que sigue
- **Refinar la rutina de movilidad** con el uso (pedido de Esteban, 2026-10-15). Proceso, fuentes e ideas en `docs/movilidad/fuentes-y-proceso.md`. Primer pendiente: una animación real del tobillo en banco.
- **Volver deslizando desde el borde izquierdo** (Apple lo espera; las PWA instaladas no lo traen). Esteban lo dejó para después el 2026-10-02: choca con el arrastre para reordenar. Ya estaba anotado abajo como "Sin historial del navegador".
- **Respaldo de datos fuera del teléfono** (en evaluación, 2026-09-26): hoy todo vive en IndexedDB del iPhone y exportar en la PWA instalada no está verificado. Opciones evaluadas con Esteban; la decisión quedará en `decisiones.md`.

## Pendiente de probar en el iPhone (Esteban)
- La rutina de movilidad del 2026-10-15: que las animaciones se muevan (también con el modo de bajo consumo), que suene el final del cronómetro y que funcione sin señal (`docs/esteban/pruebas-iphone.md`, **Movilidad**).
- Que la alarma de descanso suene con la pantalla bloqueada (verificada solo en Chromium). Si no suena, la siguiente parada es Web Push, que exige un servidor.
- Que **Exportar** funcione con la app instalada (en modo standalone iOS puede ignorar `<a download>` sin avisar).
- El tema nuevo (crema/Everforest) en claro y oscuro, con la letra nueva.
- Ajustes (⚙︎) y Apariencia del 2026-10-02: forzar Claro u Oscuro y que se mantenga al reabrir.
- Las reglas de Apple del 2026-10-02: texto grande desde **Settings**, Volver con ‹ y Deshacer que no se va solo (`docs/esteban/pruebas-iphone.md`).

- Lo del 2026-11-12 (teclado del buscador, pantalla bloqueada, récords, discos): lista en `docs/esteban/pruebas-iphone.md`.

## Pendientes técnicos conocidos
- **Lo tecleado se pierde al reordenar o agregar ejercicio.** `refreshExercises()` reconstruye la lista entera, así que un peso a medio escribir en otra tarjeta se borra. Detectado 2026-08-02; exige reescribir el render de la lista.
- **Deshacer un registro no para el descanso.** Cancelar siempre rompería el caso de corregir un set viejo mientras descansas del último; habría que recordar qué set arrancó el descanso.
- Sin historial del navegador: el gesto "atrás" del iPhone sale de la app en vez de volver de un detalle (requiere la History API).
- Reordenar no es accesible con VoiceOver ni teclado. Salida: un modo "reordenar" explícito.
- Áreas táctiles por debajo de 44 px a propósito: toggle lbs/kg (36×38), pastillas de filtro (38 de alto), 🗑 de quitar ejercicio (37 de ancho, estrecho a propósito). Medido 2026-09-13; si alguna estorba, se sube.

## Ideas anotadas (sin compromiso; requieren OK de Esteban)
- Desde la investigación de 2026-11 (`proyecto/investigacion-2026-11.md`): tipos de set (calentamiento, drop, fallo) y RPE (cambian el export); sugerencia de "sube peso" por doble progresión (exige rango de reps por ejercicio); tabla de récords por número de repeticiones (Strong); informe mensual (Hevy); series por músculo contando los secundarios a media serie (Boostcamp).
- Live Activity real con PushWard (servicio externo gratis hasta 250 actualizaciones al mes): rompe "cero dependencias"; solo si Esteban lo acepta (`decisiones.md`, 2026-11-12).
- Preferencia para mostrar en kg (hoy siempre lbs).
- Gráfica de volumen por sesión además del peso máximo.
- Series de calentamiento aparte, superseries y RPE (evaluados 2026-08-12: los tres agregan un campo por set).
- Recordatorio de exportar si el último export tiene más de 30 días.
- Editar sets de sesiones finalizadas (en la sesión activa ya se puede).
- Progresión de cardio en el tiempo, si acumula datos.
