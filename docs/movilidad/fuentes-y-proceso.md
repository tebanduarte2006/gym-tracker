# Movilidad: fuentes, evidencia y cómo mejorar la rutina

**Documento vivo.** Lo pidió Esteban el 2026-10-15: la rutina de movilidad se va a ir refinando con el tiempo (quitar, agregar o cambiar ejercicios) con Claude u otros agentes, y cada vez tiene que salir mejor y más rápido. **Cada agente que toque la rutina agrega aquí lo que aprendió**: una fuente nueva, un truco o un callejón sin salida. La parte técnica (archivos, reglas de código) está en [../rutas/movilidad.md](../rutas/movilidad.md).

Contexto de Esteban: avanzado en el gimnasio, **novato en movilidad**, rígido en general (caderas sobre todo), con equilibrio y coordinación flojos (sus palabras), y un iPhone 11 con poca memoria. **Hombros:** tendinitis y bursitis en ambos (2026), en fisioterapia desde ~septiembre de 2026; el derecho sigue rígido. Su test y lo que hace en fisioterapia están en §7: **léelo antes de tocar un ejercicio de hombro.** Hace la rutina sobre todo en casa, los días sin gimnasio (tiene mancuernas de hasta 5 lb, una banda elástica, un banco y una silla).

## 1. Proceso estándar para cambiar la rutina

1. **Entender el pedido.** ¿Qué quiere mejorar (una zona, el equilibrio, un dolor, el tiempo total)? Si trae un video, sácale el contenido (§4). Si hay dolor o una lesión, dile que la rutina no reemplaza a un fisioterapeuta.
2. **Elegir los ejercicios con evidencia** (§2): preferir lo que tenga respaldo y poco riesgo para un novato. Si cambias algo de la rutina, dile a Esteban en una frase por qué.
3. **Conseguir la animación** (§3). Prioridad: que muestre bien la técnica, luego que sea liviana. Si no hay una buena, `"animacion": null` (la app muestra "Sin animación todavía") o una ilustración fija PNG.
4. **Editar `data/movilidad.json`**. Español de Colombia, pasos cortos (3 o 4), en imperativo y sin voseo, con el error típico como último paso.
5. **Verificar**: `npm test` (valida forma, archivos, `ASSETS` y peso) y `node scripts/capturas-iphone.mjs` (mira el paso nuevo en claro y oscuro).
6. **Publicar** según [../rutas/publicar-y-verificar.md](../rutas/publicar-y-verificar.md) y **anotar el cambio en §6** de este documento.

## 2. Evidencia (qué sabemos y qué no)

| Afirmación | Estado | Fuente |
|---|---|---|
| El entrenamiento de fuerza reduce las lesiones deportivas a cerca de un tercio; estirar **no** mostró efecto preventivo | Metaanálisis, evidencia sólida | Lauersen, Bertelsen y Andersen, 2014, *Br J Sports Med* 48(11) |
| El entrenamiento de equilibrio o propiocepción reduce que el esguince de tobillo se repita | Ensayo aleatorizado | Hupperets, Verhagen y van Mechelen, 2009, *BMJ* 339:b2684 |
| La carga pesada y lenta sirve para rehabilitar el tendón de Aquiles | Ensayo aleatorizado (tendón **lesionado**) | Beyer et al., 2015, *Am J Sports Med* 43(7) |
| Gelatina con vitamina C antes de una carga corta (~6 min) aumenta la síntesis de colágeno | Preliminar, muestra pequeña | Shaw et al., 2017, *Am J Clin Nutr* 105(1); trabajo de Keith Baar (UC Davis) |
| Más rango de movimiento no garantiza más rendimiento | Revisión (verificar autores antes de citar) | *Sports Medicine* 2017, DOI 10.1007/s40279-017-0797-9 (citada por Built With Science) |
| El estiramiento **cruzado** (brazo frente al pecho) mejoró la rotación interna; el "sleeper" no mostró mejora clara. La diferencia entre ambos no fue estadísticamente firme | Ensayo aleatorizado pequeño (54 personas, 4 semanas), verificado en resúmenes secundarios el 2026-11-16 | McClure et al., 2007, *JOSPT* 37(3):108-14 ([resumen](https://myorthoevidence.com/AceReport/Report/734)) |
| Déficit de rotación interna (GIRD) = 20° o más frente al otro hombro; perder más de 5° de arco total se asoció a más lesiones | Cohorte de lanzadores profesionales, verificado en resúmenes el 2026-11-16 | Wilk et al., 2011, *Am J Sports Med* 39(2):329-35 ([revisión PMC5865552](https://pmc.ncbi.nlm.nih.gov/articles/PMC5865552)) |
| El ejercicio sirve para el dolor tipo pinzamiento de hombro, y el **específico** más que el genérico | Metaanálisis, pero con evidencia de calidad **muy baja** según los autores | Steuri et al., 2017, *BJSM* 51(18):1340-7 ([PEDro](https://search.pedro.org.au/search-results/record-detail/50325)) |
| La rotación externa acostado de lado es el ejercicio que más activa infraespinoso y redondo menor | EMG, 10 personas sanas | Reinold et al., 2004, *JOSPT* 34(7):385-94 ([PubMed](https://pubmed.ncbi.nlm.nih.gov/15296366/)) |
| Rotación externa de lado, flexión de lado, "T" boca abajo con rotación externa y extensión boca abajo activan trapecio medio e inferior sin que domine el superior | EMG de superficie, 45 personas sanas; las reseñas difieren en la lista exacta | Cools et al., 2007, *Am J Sports Med* ([reseña](https://brookbushinstitute.com/article/what-are-the-best-exercises-to-promote-scapular-muscle-balance)) |
| La "rutina de mantenimiento de tendones" en personas sanas | **Poco respaldo**: el levantamiento de pesas ya carga los tendones | Inferencia a partir de lo anterior |

Para que no se pierda: la movilidad sirve para **ganar rango** donde falta; el equilibrio sí tiene evidencia preventiva. Antes de entrenar, mejor movimientos dinámicos que estiramientos estáticos largos (Built With Science lo dice; es la recomendación habitual). Las citas de esta tabla salen del conocimiento general del agente del 2026-10-15 y **no se verificaron en línea**: compruébalas antes de usarlas para algo importante.

## 3. Dónde conseguir animaciones (de mejor a peor)

| Fuente | Qué tiene | Cómo sacar el archivo | Notas |
|---|---|---|---|
| **fitnessprogramer.com** | GIF de modelo 3D, 360×360, 1 repetición en bucle (el estilo que le gusta a Esteban). Más de 15 categorías por músculo; tiene estiramientos y yoga sueltos | Buscar con `https://fitnessprogramer.com/?s=<palabras en inglés>` → página `/exercise/<slug>/` → en el HTML, el `.gif` dentro de `wp-content/uploads` | Usada para toalla, gato-vaca, 90/90, sentadilla goblet y peso muerto a una pierna. **No** tiene sección de movilidad ni el tobillo en banco. "standing-dorsiflexion" NO es movilidad de tobillo (son elevaciones de puntas) |
| **fitbod.me** | Videos MP4 de una persona real, 720p, unos 10 a 15 s, con dos ángulos | Página `fitbod.me/exercises/<slug>` → en el HTML, `app-media-r2.fitbod.me/v2/<n>/videos/full_720p.mp4` | Usada para la extensión de espalda en banco (`bench-t-spine-stretch`) y la elevación de talón a una pierna (`single-leg-standing-calf-raise`). Recortar 2 s y cuadrar (receta abajo). Los slugs no se adivinan: buscar en la web con `site:fitbod.me` |
| **bend.com/routines** | Unas 100 rutinas públicas de estiramiento y movilidad (por zona: tobillos, caderas, espalda, hombros, splits…) con el nombre de cada ejercicio e **ilustraciones fijas** planas de unos 3 KB | En el HTML de cada rutina, `api.bend.com/static/exercise_images/image_XXXXX.png` | Excelente para **diseñar** rutinas (qué ejercicios, en qué orden). Usada para el tobillo (`image_00172`, "Soleus Stretch"). Los videos de la app de Bend no están en la web: van dentro de la app con suscripción |
| **builtwithscience.com** | Artículos de Jeremy Ethier con la rutina escrita, pruebas de autoevaluación y estudios citados | Leer el artículo en vez del video | Fuente de la rutina inicial: `fitness-tips/full-body-mobility-routine/` |
| **YouTube, TikTok, Instagram** | Lo que mande Esteban | **YouTube bloquea las descargas desde la nube** ("Sign in to confirm you're not a bot", 2026-10-15). Alternativas: el título con `youtube.com/oembed?url=…&format=json`, el artículo del mismo autor, o pedirle a Esteban una grabación de pantalla del iPhone | Sin descarga, recortar del video no es posible desde aquí |

### Receta para convertir (ffmpeg, ya instalado en la nube)

```bash
# GIF → WebP animado (mismo tamaño, ~5 veces menos peso)
ffmpeg -i entrada.gif -an -c:v libwebp_anim -q:v 65 -loop 0 media/movilidad/<id>.webp

# Video → 2 s cuadrados en bucle. Ajusta -ss (inicio), crop=lado:lado:x:y y fps.
ffmpeg -ss 9.0 -t 2.0 -i entrada.mp4 -vf "crop=600:600:270:120,scale=360:360:flags=lanczos,fps=12" \
  -an -c:v libwebp_anim -q:v 65 -loop 0 media/movilidad/<id>.webp

# Movimiento de ida y vuelta (bucle sin salto): el clip y su reverso
ffmpeg -ss 9.0 -t 2.0 -i entrada.mp4 -filter_complex \
  "[0:v]crop=600:600:270:120,scale=360:360,fps=12,split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1[o]" \
  -map "[o]" -an -c:v libwebp_anim -q:v 65 -loop 0 media/movilidad/<id>.webp
```

Para elegir `-ss` y el recorte, saca una hoja de fotogramas y mírala:
`ffmpeg -ss 8 -t 7 -i entrada.mp4 -vf "fps=2,scale=240:-1,tile=5x3" -frames:v 1 hoja.png`.
Límite: **250 KB por animación** (lo exige la prueba). Las de hoy pesan entre 3 y 157 KB, 0,6 MB en total.

## 4. Sacar el contenido de un video sin verlo

1. Título y autor: `curl "https://www.youtube.com/oembed?url=<url>&format=json"`.
2. Buscar el artículo escrito del mismo autor (los youtubers de fitness suelen publicarlo en su web), con los ejercicios, la dosis y los estudios.
3. Si no existe, pedirle a Esteban los nombres de los ejercicios o una grabación de pantalla.

## 5. Ideas para después (sin compromiso)

- **Pruebas de autoevaluación** de Ethier (rascado de Apley para hombros, sentadilla con y sin talones elevados para tobillos) para personalizar qué ejercicios hacer.
- **Progresiones de equilibrio**: apoyo en una pierna con ojos cerrados, sobre superficie blanda.
- **Rutina de tendones** con carga, si algún día hay una molestia concreta: ahí la evidencia (Beyer 2015) sí aplica.
- Encontrar una **animación real del tobillo en banco** (hoy es una ilustración fija de Bend).
- **Estiramiento de pectoral en el marco de la puerta** (Borstad y Ludewig 2006, sin verificar): Esteban siente tensión adelante al rotar hacia afuera. Se dejó fuera el 2026-11-16 porque puede pinchar donde hoy le duele; reconsiderar cuando el pinchazo anterior se haya ido.
- **Fuerza de manguito y omóplato** (rotación externa de lado con 1-2 kg, Reinold 2004; "T" boca abajo, Cools 2007): entra si Esteban deja la fisioterapia, que hoy ya se la da.

### Si la rutina se le hace larga (candidatos a recortar, en este orden)
Objetivo: unos 25 minutos (la app estima 24). Si Esteban dice que pasa de 30, recorta en este orden y díselo:
1. **Gato-vaca**: la rotación en cuatro apoyos y la extensión en banco ya mueven la columna.
2. **Flexor de cadera**: el 90/90 ya trabaja la cadera; se puede dejar para los días de gimnasio.
3. **Sentadilla goblet con balanceo**: tobillo y cadera ya están cubiertos por separado.
**Nunca recortes** el estiramiento cruzado (es la razón de esta versión), el 90/90 ni el equilibrio (pedidos expresos de Esteban).

## 6. Registro de cambios de la rutina

| Fecha | Cambio | Por qué |
|---|---|---|
| 2026-11-16 | Versión 2 (10 ejercicios, ~24 min): **sale** la toalla; **entran** rotación de espalda en cuatro apoyos (3), estiramiento cruzado de hombro contra la pared con cronómetro de 60 s (4) y flexor de cadera de rodillas, 60 s (6). Animaciones de fitnessprogramer (`Kneeling-T-spine-Rotation`, `Across-Chest-Shoulder-Stretch`, `Kneeling-Hip-Flexor-Stretch`) | Test de hombro de Esteban (§7): déficit de rotación interna del derecho; la toalla pinchaba justo en esa posición. Rotación de espalda: el golf y el brazo arriba la piden. Flexor: rígido en general y muchas horas sentado. La fuerza del hombro no se agrega porque ya la da su fisio (`decisiones.md` 2026-11-16). Se buscó un "libro abierto" animado y no hay en fitnessprogramer ni en la web de Fitbod (403); la rotación en cuatro apoyos cumple la misma función |
| 2026-10-15 | Rutina inicial: los 6 ejercicios de Jeremy Ethier (toalla, extensión de espalda en banco, gato-vaca, 90/90, tobillo en banco, sentadilla goblet con balanceo) + bloque de equilibrio (peso muerto a una pierna sin peso, elevación de talón a una pierna). 2 vueltas | Esteban mandó el video de Ethier; el equilibrio se agregó porque es su punto débil y tiene evidencia (Hupperets 2009). La elevación de talón también carga el tendón de Aquiles |

## 7. Hombros de Esteban: test y fisioterapia (2026-11-16)

**No es un diagnóstico**: es un test casero, medido con **Measure** → **Level** del iPhone en la mano, con certeza media. Lo que más vale es la diferencia entre lados. Si vuelve a hacerlo, compara contra esta tabla.

| Prueba | Derecho | Izquierdo |
|---|---|---|
| Rotación externa acostado, brazo a 90° | ~90°, sin dolor; estira adelante (pecho/deltoide anterior) | ~90°; más tensión adelante (3-4/10) |
| Rotación interna acostado, omóplato bloqueado | **~45°**, pinchazo 4/10 a media altura/adelante | ~70°, pinchazo parecido, algo mayor |
| Rascado de Apley | Por arriba: se tocan, pinchazo dentro de la articulación al final. **Por detrás: ni se acerca**, duele adelante | Normal |
| Brazos arriba contra la pared | Los pulgares tocan. Pinchazo adelante, bajo la clavícula, con el brazo junto a la oreja (el mismo de dominadas y jalones) | Normal |
| Brazo cruzado, omóplato contra la cama | **No llega**, pinchazo entre deltoide anterior y lateral | Llega |
| Abducción lateral completa | Pinchazo arriba del todo | Normal |
| Fuerza isométrica rotación externa e interna | Pareja, sin dolor | Pareja, sin dolor |
| Rotación de espalda alta (palo) | No se hizo | — |
| Test del omóplato (McClure 2009), 5 subidas con 3-5 lb, de espalda en video (2026-11-19) | **Por el frente:** normal. **Por los lados:** se siente notablemente más débil, cuesta más subirlo, en el video se ve trabado y traquea hacia 90° | Por el frente: pinchazo puntual adelante, "como una agujita". Por los lados: normal |
| Largo del pectoral menor (acostado, Lewis y Valentine 2007) | No se hizo (baja precisión diagnóstica; Esteban lo descartó) | — |

**Lectura (certeza media):** déficit de rotación interna del derecho de ~25° con pérdida de arco total (cumple el criterio de Wilk 2011) = rigidez de la parte de atrás del hombro. Pinchazo anterior en varios rangos de ambos lados = tejido anterior aún sensible: **no estirar dentro del pinchazo** (regla: tensión sí, pinchazo máximo 2/10 que se haya ido al día siguiente). En remos altos y encogimientos siente que el omóplato derecho "no cierra".

**Postura (2026-11-18, observación de Esteban):** siente el hombro derecho girado hacia adelante, y al flexear frente al espejo el trapecio derecho queda más alto. No es una medición (contracción voluntaria), y la postura sola se asocia poco al dolor (Barrett 2016, *Manual Therapy*). **Lectura del test del omóplato:** el derecho controla peor la subida lateral (rotación hacia arriba del omóplato: serrato y trapecio inferior), coherente con que "no cierra" en remos altos. El traqueo sin dolor suele ser benigno. **Decisión:** no se agrega nada a la rutina, porque es justo lo que trabaja su fisioterapia (T, nadadores, flexiones de omóplato); Esteban le lleva el video. El pectoral sigue fuera (§5).

**Lo que le molesta en el gimnasio:** extensión de tríceps a un brazo por encima de la cabeza (la dejó), remos altos y encogimientos Kelso (omóplato), dominadas y jalones en el punto más estirado. Sin problema: press militar, inclinado moderado, aperturas, elevaciones laterales.

**Lo que le da su fisioterapeuta** (descrito el 2026-11-16, todos 3×10): flexiones de omóplato en plancha, nadadores boca abajo con botella, "T" boca abajo rotando los puños (no isométrica; ahí le traquea mucho el derecho), espantapájaros boca abajo alternando rotaciones, rotación externa sentado con el codo en un banco (2 s arriba) y plancha lateral con rotación externa y press. **No dupliques esto en la rutina de movilidad** mientras siga en fisioterapia.

