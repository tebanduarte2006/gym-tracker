# Lineamientos de diseño iOS (Apple HIG) para Plata y Gym Tracker

**Este archivo es idéntico en los dos repos** (`finanzas-ia/docs/diseno-ios.md` y `gym-tracker/docs/diseno-ios.md`): las dos apps comparten un solo sistema visual. Si cambias una regla, cámbiala en los dos repos en la misma tanda.

- **Fuente**: las Human Interface Guidelines de Apple (HIG), en la copia local de la skill [`apple-design-skill`](https://github.com/NutshellEngineering/apple-design-skill). Esa skill (Apache 2.0, contenido © Apple) está en la cuenta de Claude de Esteban. Las rutas `F/`, `C/` y `P/` de abajo son `references/foundations/`, `references/components/` y `references/patterns/` de esa skill.
- **Revisión base**: 2026-10-02, con 123 reglas aplicables a una PWA de iPhone. Aquí quedan solo las que **se exigen**. Para cualquier duda de diseño que no esté aquí, consulta la skill y cita el artículo.
- **Jerarquía**: si una regla de Apple choca con una decisión explícita de Esteban, gana Esteban y la excepción se anota en la sección "Excepciones conscientes". Nunca se rompe una regla en silencio.

## Reglas obligatorias

Cada regla trae la cita de Apple, cómo se cumple en cada app y cómo se verifica. **"Script"** significa que `scripts/capturas-iphone.mjs` falla si la regla se rompe.

### D1. Área táctil de 44×44, o 28×28 si es una excepción anotada
- **Apple**: "a button needs a hit region of at least 44x44 pt" (C/menus-and-actions/buttons.md). La tabla de F/accessibility.md da "iOS, iPadOS | 44x44 pt | 28x28 pt" (por defecto | mínimo).
- **Cómo**: se crece el **área**, no el dibujo.
  - Plata: la clase `.touch-target`, un `::after` invisible que completa los 44.
  - Gym: el `::after` propio del control, o padding con margen negativo (`.g-set-edit`).
  - Un área no puede meterse en la del control vecino.
- **Verificación**: script. Mide tocando con `elementFromPoint`, no leyendo el CSS. Las excepciones se miden contra 28.

### D2. El texto sigue el tamaño elegido en el iPhone (Dynamic Type)
- **Apple**:
  - "give people the option to enlarge text by at least 200 percent" (F/accessibility.md).
  - Sobre letras propias: "If you use a custom font, make sure it implements the same behaviors" (F/typography.md).
- **Cómo** (igual en las dos apps):
  - La raíz mide `17px`. En iOS, `@supports (font: -apple-system-body) and (-webkit-touch-callout: none) { html { font: -apple-system-body } }` hace que siga **Settings → Display & Brightness → Text Size**.
  - El `-webkit-touch-callout` excluye el Safari de Mac, donde ese cuerpo mide 13px.
- **Cómo se escribe cada `font-size`**:
  - Texto: `calc(<px a tamaño normal>rem / 17)`. Por ejemplo, `calc(15rem / 17)` mide 15px con el tamaño normal.
  - Campos de texto: `max(16px, calc(17rem / 17))`. Por debajo de 16px, iOS hace zoom al enfocar.
  - Cifras y títulos gigantes: `min(calc(46rem / 17), 64px)`, que crecen pero con techo.
  - Emojis y glifos dentro de un círculo de tamaño fijo (✕, +, ›, el emoji de una categoría): se quedan en `px`, con un comentario que lo diga.
  - **Nunca** un `font-size` en `px` suelto, ni en el CSS ni en el JS.
- **Al crecer**: nada se corta ni se monta.
  - Las cuadrículas usan `repeat(auto-fill, minmax(…rem, 1fr))`, para que quepan menos columnas en vez de partir palabras.
  - Los títulos de las hojas ceden con puntos suspensivos antes que los botones.
  - Apple: "Keep text truncation to a minimum as font size increases" (F/typography.md).
- **Verificación**: script (pasada "texto-grande" con la raíz en 23px, el máximo sin los tamaños de accesibilidad: sin desbordes) y prueba en el iPhone.

### D3. Ningún texto por debajo de 11 puntos; el cuerpo normal es de 17
- **Apple**: tabla de F/typography.md, "iOS, iPadOS | 17 pt | 11 pt", que aplica "for both custom and system fonts".
- **Verificación**: script.

### D4. Contraste
- **Apple** (F/accessibility.md):
  - 4,5:1 para texto de hasta 17 pt y 3:1 para texto de 18 pt o más, o en negrilla.
  - "make sure to check the minimum contrast in both light and dark appearances".
- **Cómo**:
  - Texto secundario con 4,5:1 o más en los dos temas.
  - El terciario (≈3,3:1) es solo para lo apagado a propósito y **nunca para información**.
  - **El texto y los íconos sobre el naranja son oscuros** (`--color-on-accent` = `#2b2420` en claro): el blanco daba 2,95:1. `--color-on-accent` es **solo** para el naranja.
  - Sobre verde, rojo o ámbar sólidos (el + y el − del balance, la cuenta de la bandeja, un botón destructivo) va blanco en claro y oscuro en oscuro: `--color-on-status` en Plata y `--color-on-danger` en el gym. Usar `--color-on-accent` ahí dejó el + oscuro sobre verde (3,4:1) el 2026-10-02.
  - Ningún color se escribe a mano fuera de `:root`. Hay tokens para el aviso (`--color-toast-text`) y para el ícono de las filas de Ajustes (`--color-on-icon-tile`).
- **Verificación**: calcular la proporción al crear una combinación nueva; capturas en claro y oscuro.

### D5. Variante de más contraste para cada color propio
- **Apple**: "supply light and dark variants, and an increased contrast option for each variant" (F/color.md).
- **Cómo**: un bloque `@media (prefers-contrast: more)` por tema, que sube el texto secundario, el terciario, los separadores y el color de enlace. Lo activa **Settings → Accessibility → Display & Text Size → Increase Contrast**.

### D6. Reducir movimiento
- **Apple**: "Replacing transitions in x-, y-, and z-axes with fades to avoid motion" (F/accessibility.md); "Don’t add motion for the sake of adding motion" (F/motion.md).
- **Cómo**:
  - `@media (prefers-reduced-motion: reduce)` lleva animaciones y transiciones a 0,001 ms. Se activa en **Settings → Accessibility → Motion → Reduce Motion**.
  - Gym: las esperas del JS consultan `sinMovimiento()`.
  - Nada por encima de 300 ms.

### D7. Volver y Cerrar son símbolos, no palabras
- **Apple**: "Prefer the standard symbols for each, and don’t use a text label that says *Back* or *Close*" (C/menus-and-actions/toolbars.md).
- **Cómo**:
  - Un círculo de 36 (área de 44) con ‹ para volver y ✕ para cerrar, con `aria-label` "Atrás" o "Cerrar" para VoiceOver.
  - Plata: `leadingButton={{ label, symbol: "back" | "close" }}` en `Sheet`.
  - Gym: `backButton()` de `js/ui/icons.js` y `.g-modal-close`.
  - "Cancelar" y "Guardar" sí van con texto: Cancelar a la izquierda y la acción principal a la derecha ("the Cancel button belongs on the leading edge", C/presentation/sheets.md). En Plata van dentro de un óvalo (`.sheet-header-button`): Cancelar neutro y Guardar en naranja sólido, que es la acción principal (D9).

### D8. "Deshacer" no se va con un reloj
- **Apple**: "Minimize use of time-boxed interface elements" y "Prefer dismissing views with an explicit action" (F/accessibility.md).
- **Cómo**:
  - Un aviso con acción (Deshacer) se queda hasta el siguiente toque fuera de él.
  - Los avisos solo informativos sí se van solos.
  - Plata: el `useEffect` del aviso en `App.tsx`. Gym: `toast()` de `js/dom.js`.

### D9. Una sola acción principal por pantalla; lo destructivo, en rojo y nunca como principal
- **Apple**: "Keep the number of prominent buttons to one or two per view" y "Don’t assign the primary role to a button that performs a destructive action" (C/menus-and-actions/buttons.md).
- **Cómo**:
  - El acento naranja sólido marca UNA acción por pantalla.
  - Seleccionar no es acento: la opción elegida se invierte.
  - El rojo solo marca lo que borra o cierra.

### D10. No confirmar lo que se puede deshacer
- **Apple**: "Avoid displaying alerts for common, undoable actions, even when they’re destructive" (C/presentation/alerts.md).
- **Cómo**: borrar un set o guardar un gasto se resuelve con Deshacer. La confirmación queda para lo irreversible (borrar una cuenta o una sesión), con la acción destructiva roja y "Cancelar" como salida. Nunca `confirm()` del navegador, porque sus botones dicen OK.

### D11. El color nunca es la única señal
- **Apple**: "Avoid relying solely on color to differentiate between objects, indicate interactivity, or communicate essential information" (F/color.md).
- **Cómo**: los gastos y los ingresos llevan signo o palabra además del rojo o verde; el estado de un set se marca con relleno y contorno, no con un tono.

### D12. Cada control propio tiene estado presionado y nombre para VoiceOver
- **Apple**: "Always include a press state for a custom button" (buttons.md); "Add labels to any custom elements your app defines" (technologies/voiceover.md).
- **Cómo**:
  - Plata: `:active` o la clase `pressable`.
  - Gym: `:active` en `styles.css`.
  - Todo botón sin texto lleva `aria-label`.

### D13. Márgenes seguros y barra de estado visible
- **Apple**: "it’s generally a good idea to keep it visible" (F/layout.md).
- **Cómo**: `env(safe-area-inset-*)` en todo lo que toca un borde; `apple-mobile-web-app-status-bar-style: default`.

### D14. Textos: sentence case en español, verbos en los botones y errores que dicen cómo arreglar
- **Apple**:
  - "When labeling buttons and links, it’s almost always best to use a verb".
  - "Avoid robotic error messages with no helpful information" (F/writing.md).
- **Cómo**:
  - Mayúscula solo al inicio ("Mover plata entre cuentas").
  - Sin "oops" y sin "nosotros".
  - Ejemplo: "Entre 10 y 3600 segundos", no "Valor inválido".

## Excepciones conscientes (decisiones de Esteban)

| Regla de Apple | Excepción | Por qué | Decidido |
|---|---|---|---|
| Letra del sistema y Bold Text (F/typography.md, F/branding.md) | Letra Atkinson Hyperlegible Next en todo. Bold Text no tiene equivalente en la web | Astigmatismo de Esteban. Apple permite letras propias si cumplen Dynamic Type, y lo cumplen (D2) | 2026-09-26 · 2026-10-02 |
| "Avoid offering an app-specific appearance setting" (F/dark-mode.md) | Las dos apps tienen **Ajustes → Apariencia** (Automático, Claro u Oscuro). Viene en Automático, que es lo que pide Apple | La pidió Esteban | Plata: 2026-10-01 · gym: 2026-10-02 |
| Fondos y colores del sistema (F/color.md) | Tema crema con naranja (claro) y Everforest (oscuro) | Diseño parecido a MonAi. Se compensa con D4 y D5 | 2026-09-26 |
| No hay botón flotante en la HIG | Micrófono flotante en Plata | Patrón de MonAi. Cuenta como la acción principal (D9) y tiene 66×66 | 2026-09-25 |
| 44×44 (D1) | Gym: botones lbs/kg, pastillas de filtro y 🗑 de quitar ejercicio (`EXCEPCIONES_44` en su script). Se miden contra 28×28 | Estrechos a propósito, medidos el 2026-09-13 | 2026-09-13 |

## Pendientes conocidos (no se cumplen todavía)

- **Volver deslizando desde el borde izquierdo** ("people expect to find a Back button", inputs/gestures.md). Las PWA instaladas no lo traen. Esteban decidió dejarlo para después (2026-10-02) porque choca con el arrastre para reordenar y con el deslizar para cerrar hojas.
- **Fondo "elevado" de las hojas en modo oscuro** ("changes from base to elevated… modal sheet", F/dark-mode.md). Hoy las hojas usan el fondo de la página y se separan por el velo.
- **Título con el nombre de la app** en el gym ("Don’t title windows with your app name", toolbars.md).
- **Vibración (haptics)**: Safari en iOS no la ofrece. Las apps deben funcionar sin ella, y Apple pide que sea opcional (P/playing-haptics.md).

## Cómo traducir la HIG a una app web

- 1 punto de iOS ≈ 1 px de CSS en el iPhone; el iPhone 11 mide 414×896.
- Los selectores de fecha y lista nativos (`<input type="date">`, `<select>`) abren los de iOS: son preferibles a uno propio.
- El teclado correcto se pide con `inputmode`:
  - `numeric` para pesos y repeticiones;
  - `decimal` para kilos;
  - y con `enterkeyhint` (`search`, `done`) para la tecla de retorno.
- Liquid Glass no existe en la web. Si algún día se imita con `backdrop-filter`, va solo en las barras y los botones flotantes, nunca en el contenido, y queda opaco con `prefers-contrast: more`.
- No se copian archivos de SF Pro ni de SF Symbols. Los íconos son SVG propios de estilo parecido.
