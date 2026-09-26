# Gym Tracker

App personal de Esteban para registrar su entrenamiento en el gimnasio, instalada en su iPhone 11. Propone el entrenamiento del día a partir de la última vez, registra cada serie con un toque, lleva el descanso con alarma y muestra PR, volumen y progresión por ejercicio y por músculo.

Es una app web instalable (PWA) sin dependencias, publicada gratis en GitHub Pages: https://tebanduarte2006.github.io/gym-tracker/. Nació el 2026-07-28 de una revisión de [habitos-app](https://github.com/tebanduarte2006/habitos-app), que sigue congelada.

## Estado

**En uso diario.** Lo pendiente está en [`docs/proyecto/progreso.md`](docs/proyecto/progreso.md).

| Para Esteban | |
|---|---|
| [`docs/esteban/guia-vibe-coding.md`](docs/esteban/guia-vibe-coding.md) | Cómo dirigir agentes: plantillas de pedidos, verificación, git |
| [`docs/esteban/pruebas-iphone.md`](docs/esteban/pruebas-iphone.md) | Listas de chequeo para probar en el iPhone |

| Para agentes | |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | Reglas: estandarización, comunicación, ahorro de tokens, merge automático |
| [`docs/00-INDICE.md`](docs/00-INDICE.md) | Índice: qué leer según la tarea |
| [`docs/convenciones.md`](docs/convenciones.md) | La única forma aceptada de hacer cada cosa |

## Cómo trabajar en este proyecto (vibe coding, lo esencial)

Resumen de [`docs/esteban/guia-vibe-coding.md`](docs/esteban/guia-vibe-coding.md), basada en [The Vibe Coding Handbook](https://github.com/hacrex/the-vibe-coding-handbook) (MIT).

**La regla de oro:** tú decides y verificas; el agente escribe el código. Nada está hecho hasta que lo ves funcionar en el iPhone.

### 1. Cada pedido tiene cuatro partes

1. **Contexto:** qué existe hoy relacionado con tu pedido.
2. **Objetivo:** qué quieres que pase, visto desde el gimnasio.
3. **Restricciones:** qué no se toca; nada que cueste.
4. **Criterios de aceptación:** algo que puedas comprobar en el iPhone.

Un pedido = un objetivo. Si tu mensaje tiene "y también...", son dos pedidos.

### 2. Rutina de cada sesión

1. Pedir un solo objetivo.
2. Responder sus preguntas, si las hace. El agente trabaja en silencio.
3. Recibir un solo mensaje final: qué cambió, qué tienes que hacer tú, qué no pudo comprobar.
4. El agente ya publicó (merge automático), salvo algo sensible: ahí te pide un "sí". Espera 2 minutos, sal de la app y vuelve a entrar. **Nunca la borres**: hoy tus datos viven en el teléfono.
5. Probar con la lista de `docs/esteban/pruebas-iphone.md`.

### 3. Señales de alarma

| Señal | Qué hacer |
|---|---|
| Dice "listo" sin pruebas ni capturas | "Muéstrame la salida de `npm test` y las capturas." |
| Un gesto "verificado" que en el iPhone falla | "¿Lo probaste con eventos táctiles reales o con el ratón?" |
| Toca cosas que no pediste | "Revierte lo que no era parte del pedido." |
| Promete widgets, Live Activities o que la alarma suena siempre bloqueado | "Dame el enlace a la documentación oficial." |
| Te pide borrar y reinstalar la app | **Nunca.** Progresión → DATOS → **Buscar actualización**. |
