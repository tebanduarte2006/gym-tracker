# Ruta: interfaz y diseño

## Qué es
El sistema visual de la app. Desde el 2026-09-26 es **el mismo de Plata** (la app de finanzas de Esteban, repo `finanzas-ia`, `src/styles.css`): tema claro **crema con acentos naranjas**, tema oscuro **Everforest** (gris verdoso cálido, nunca negro plano), según el modo del iPhone. **Superficies sólidas**: el material de vidrio ("Vidrio Negro", 2026-08-12) se retiró. Letra única **Atkinson Hyperlegible Next**, diseñada para baja visión: Esteban tiene astigmatismo.

Si Plata cambia su paleta, se cambia aquí también (un solo sistema en sus dos apps), y al revés.

## Archivos
| Dónde | Qué |
|---|---|
| `styles.css` | Todo el diseño. Tokens en `:root` (claro) y `@media (prefers-color-scheme: dark)`; bloques `prefers-contrast: more` (por tema) y `prefers-reduced-motion`. La cabecera del archivo resume las reglas |
| `fonts/` | `atkinson-hyperlegible-next-latin-wght-normal.woff2` (pesos 200-800) + licencia OFL. Está en `ASSETS` de `sw.js` |
| `index.html` | Dos `theme-color` (claro `#fbf6ee`, oscuro `#2d353b`), `apple-mobile-web-app-status-bar-style: default` |
| `manifest.json` | `background_color` / `theme_color` crema |
| `js/ui/icons.js` | Iconos SVG inline (heredan `currentColor`) |

## Tokens (usa estos nombres; no hay otros)
| Token | Para qué |
|---|---|
| `--color-background` | Fondo de la página y de los bottom sheets |
| `--color-surface` | Tarjetas sobre el fondo; se separan con anillo `--color-separator` y sombra suave `--color-shadow` |
| `--color-inset` | Lo que va DENTRO de una tarjeta o sheet: filas de sets, campos, botones secundarios. Claro = `--color-fill`; oscuro = fondo agrupado (el texto secundario sube de 4,35:1 a 6,37:1) |
| `--color-fill`, `--color-fill-strong` | Rellenos y estado presionado |
| `--color-text`, `--color-text-secondary`, `--color-text-tertiary` | Texto. Terciario (≈3,3:1) solo para lo apagado a propósito: sets propuestos, placeholders, chevrones. **Nunca información** |
| `--color-accent`, `--color-on-accent` | Naranja y el texto sobre él (oscuro en los dos temas: 5,2:1 en claro) |
| `--color-expense`, `--color-on-danger` | Rojo destructivo y el texto sobre él |
| `--color-separator`, `--color-shadow`, `--color-overlay`, `--color-toast*` | Bordes, sombras, fondo tras un sheet, avisos |
| `--font-system`, `--font-rounded` | Ambas son Atkinson Hyperlegible Next |
| `--r-xs` … `--r-xl` | Radios |
| `--ease`, `--ease-in`, `--ease-size`, `--base` | Movimiento: ver [movimiento-y-transiciones.md](movimiento-y-transiciones.md) |

## Reglas
Las reglas de Apple (áreas de 44, texto que sigue al iPhone, contraste, más contraste, menos movimiento, Volver con símbolo, Deshacer sin reloj) están en [../diseno-ios.md](../diseno-ios.md), compartido con Plata; `scripts/capturas-iphone.mjs` falla si se rompen las medibles. Las de abajo son las propias de esta app.

1. **Ningún color escrito a mano fuera de `:root`**, ni en JS. El JS pone clases; los colores del SVG viven en `.g-chart-*` (lección 24). Si necesitas un color nuevo, crea un token `--color-*` con su valor en los dos temas.
2. **El acento sólido es para UNA acción principal por pantalla** ("Iniciar sesión", el "+" del set, el botón principal de un sheet). El naranja también marca datos (barra de descanso, gráfica, barras de músculos, puntos de la semana). **Seleccionar no es acento**: filtro elegido, lbs/kg, músculo marcado y set registrado se marcan **invirtiendo texto y fondo**.
3. **El rojo solo marca lo que borra o cierra algo; jamás decora.** Como texto va solo sobre `--color-background` (sobre la superficie oscura se queda en 3,95:1): por eso "Finalizar" y "Eliminar sesión" son botones con contorno y letra roja, y la confirmación destructiva es roja sólida con `--color-on-danger`.
4. **Sin verde de "hecho".** Registrado = fondo sólido `--color-inset` + números en `--color-text`; propuesto = sin fondo, contorno de separador y números en terciario (ver [entrenar.md](entrenar.md)).
5. **Contraste**: texto secundario con 4,5:1 o más sobre su fondo, en claro y en oscuro. Si inventas una combinación, calcúlala.
6. **44 px de área táctil, piso innegociable.** Se crece el ÁREA con padding y margen negativo, no el dibujo (`.g-set-del`, `.g-rest-skip`, `.g-modal-close`), y sin meterse en la del vecino: por eso cada fila de set mide 44 de alto y sus controles usan `margin: -8px`. Se mide con `elementFromPoint`, no leyendo el CSS (lección 51): lo hace `revisarPantalla` en `scripts/capturas-iphone.mjs`. Excepciones medidas en `proyecto/progreso.md` y en `EXCEPCIONES_44` del script (se les exige 28×28, el mínimo de Apple).
7. **Radios concéntricos:** hijo = padre − separación, con la escala `--r-xs`…`--r-xl`.
8. **Letra en `rem`, campos a 16 px como mínimo**: `font-size: calc(<px>rem / 17)` para que el texto siga **Text Size** del iPhone; los campos `max(16px, …)`, porque por debajo iOS hace zoom al enfocar.
9. **Números con `tabular-nums`** donde se comparan o cambian (sets, cronómetro, ejes).
10. **Atkinson es más ancha que la letra del sistema**: al agregar texto, verifica que no se parta (`white-space: nowrap` en cifras como "250 × 18").
11. **Accesibilidad**: `prefers-contrast: more` sube secundario, terciario y separadores en cada tema; `prefers-reduced-motion` apaga el movimiento (también en JS con `sinMovimiento()`).
12. Nada de estética genérica "hecha con IA": degradados, sombras exageradas, emojis decorativos en títulos.

## Cómo probar
`node scripts/capturas-iphone.mjs` y mira las capturas en claro y oscuro, y las tres de texto grande. Falla si hay errores de consola, desbordes horizontales, la letra no cargó, texto de menos de 11 px o un área táctil de menos de 44×44.

## Pendiente de confirmar en el iPhone
- La barra de estado pasó de `black-translucent` a `default` (con la primera, la hora saldría blanca sobre el crema). El contenido ya no va debajo de la barra de estado.
- Los splashes de arranque (`icons/splash-*`) siguen en negro: en tema claro el arranque pasa de negro a crema. No se regeneran sin que Esteban lo pida.
- "Deshacer" del aviso en oscuro queda en 3,54:1 (valor heredado de Plata).

## Lecciones que aplican
16, 24, 51, 57.

## graphify
`graphify explain "buildChart"` · `graphify explain "confirmAction"`
