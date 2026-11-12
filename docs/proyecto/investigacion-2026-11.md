# Investigación 2026-11: apps de gimnasio y widgets en iOS

Hecha por subagentes solo con fuentes públicas (los centros de ayuda de Hevy y Fitbod respondieron 403 y se leyeron por el resumen del buscador; Reddit no se pudo abrir). Lo marcado **(sin verificar)** no se comprobó en la fuente original.

## Cómo funcionan las apps de gimnasio

| Función | Quién y cómo | En gym-tracker |
|---|---|---|
| Aviso de PR al marcar la serie | Hevy: banner si supera 1RM, peso, volumen de serie o reps; sin registro previo no hay PR ([Live PR](https://www.hevyapp.com/features/live-pr/)) | Hecho (`prKind`) |
| Descanso por ejercicio con ±15 s | Hevy: 5 s a 5 min por ejercicio, −15/+15 ([rest timer](https://www.hevyapp.com/features/workout-rest-timer/)). Strong: 2:00 por defecto ([ayuda](https://help.strongapp.io/article/231-rest-timer)) | Hecho |
| Tipos de serie | Hevy/Strong: tocar el número de la serie; Strong excluye el calentamiento de las métricas ([set tags](https://help.strongapp.io/article/166-set-tags)) | No: cambia el export |
| Récords por repeticiones | Strong: mejor marca por cada número de reps, hasta 12 ([records](https://help.strongapp.io/article/216-exercise-records-screen)) | Idea |
| Series por músculo por semana | Boostcamp cuenta los secundarios a media serie ([muscle tracker](https://www.boostcamp.app/features/muscle-tracker)); Hevy filtra por semana, mes y año | Ya existía (sin fracciones) |
| Informe mensual | Hevy: entrenamientos, tiempo, volumen, PRs, calendario ([monthly report](https://www.hevyapp.com/features/monthly-report/)) | Idea |
| Racha | Hevy: semanas seguidas con una sesión **(sin verificar)** | Hecho (`weekStreak`) |
| Métrica foco | Strong: se elige una métrica por ejercicio ([focus metric](https://help.strongapp.io/article/226-focus-metric)) | Hecho (control de la gráfica) |
| RPE | Strong: escala 6 a 10 ([RPE](https://help.strongapp.io/article/230-about-rpe)) | No: campo por set |
| Calculadora de discos | Strong: desde el teclado del peso, barra editable por ejercicio ([plates](https://help.strongapp.io/article/169-plate-calculator)) | Hecho (dibujo, barra por ejercicio) |
| Pantalla bloqueada | Hevy Live Activity: ejercicio, series, peso y reps, descanso; deja marcar la serie ([live activity](https://www.hevyapp.com/features/live-activity/)) | Solo el título en *Now Playing* |

### Algoritmos de progresión publicados
- **Hevy Trainer**: doble progresión; sube el peso solo al llegar al tope del rango en todas las series; descarga cada 6 semanas, −40 % de peso ([generador](https://www.hevyapp.com/features/workout-plan-generator/)).
- **Alpha Progression**: objetivo por serie; si el salto de peso es grande sigue pidiendo reps ([guía](https://alphaprogression.com/en/blog/alpha-progression-guide)).
- **MacroFactor**: tras 100 × 8 sugiere 100 × 9 antes que 105 × 8 ([ayuda](https://help.macrofactorapp.com/en/articles/305-understanding-and-using-smart-progressions)).
- **JEFIT**: subidas de 2,5 a 5 % ([blog](https://www.jefit.com/wp/?p=29500)).
- **Strong** usa Brzycki para el 1RM y advierte que por encima de 12 reps deja de servir ([1RM](https://help.strongapp.io/article/133-1rm)).
- **BWS+** y **Trainwise** no publican su lógica; de BWS+ solo se sabe que compara con el rango de reps de la semana anterior **(sin verificar)**.

### Qué evitar (quejas de usuarios)
Reorganizar el entrenamiento en cada sesión (Fitbod), sugerencias que solo saben subir (BWS+), no poder moverse por la rutina con el descanso corriendo (reloj de Hevy), mezclar lb y kg, depender de internet (Trainwise).

## Widgets y Live Activities en iOS (iPhone 11, iOS 26.7)

| Ruta | ¿Sirve a una PWA? | Costo | Límite |
|---|---|---|---|
| WidgetKit / ActivityKit (app nativa) | No: exige app nativa | 99 USD/año, o firma de 7 días con Mac | Rompe "nunca reinstalar" |
| Scriptable (widget que lee un JSON) | Sí, si hay servidor (Plata) | Gratis | iOS decide cada cuánto refresca; sin actualizaciones desde 2024 ([App Store](https://apps.apple.com/us/app/scriptable/id1405459188)) |
| PushWard (Live Activity por HTTP) | Sí según el proveedor ([sitio](https://pushward.app/)) | Gratis hasta 250 actualizaciones al mes | Servicio externo, necesita señal |
| Web Push y número en el ícono | Sí desde iOS 16.4 ([WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)) | Gratis, pero exige servidor | Sin avisos silenciosos ni reemplazo |
| Notificaciones locales programadas | No: API abandonada ([Chrome](https://developer.chrome.com/docs/web-platform/notification-triggers)) | — | — |
| Media Session (*Now Playing*) | Parcial ([bug abierto en modo app](https://bugs.webkit.org/show_bug.cgi?id=261858)) | Gratis | Necesita audio sonando; refresco lento |
| Pase de Wallet | No gratis | 99 USD/año | — |
