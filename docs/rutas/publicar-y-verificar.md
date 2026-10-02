# Ruta: publicar y verificar

## Cómo se publica hoy
GitHub Pages publica solo lo que hay en `main`, en 1 a 2 minutos. Producción: https://tebanduarte2006.github.io/gym-tracker/. No hay compilación: los archivos del repo son la app.

## Pasos de cada entrega
```bash
npm test && npm run check          # 1. ambos verdes o no hay commit
# 2. CACHE en sw.js y APP_VERSION en js/swupdate.js → mismo valor YYYYMMDD-N (N = entrega del día)
#    archivo nuevo → a ASSETS en sw.js
# 3. si cambiaste código: graphify update .
# 4. docs: la ruta que tocaste, docs/proyecto/historial.md (fila nueva arriba), progreso.md
git add -A && git commit -m "fix(entrenar): qué y por qué"
git push -u origin <tu-rama>
# 5. merge automático a main (CLAUDE.md §5); Pages publica solo
```
El CI de GitHub Actions (`.github/workflows/ci.yml`) repite `npm test` y `npm run check` en cada push y PR. **Un CI rojo se corrige de inmediato.**

## Verificar en navegador
- `node scripts/capturas-iphone.mjs [carpeta]` sirve el repo, restaura el seed real y guarda capturas a tamaño iPhone 11 (414×896 @2x) en claro y oscuro de las pantallas principales, más tres con el texto del iPhone en grande. Falla si hay errores de consola, desbordes, texto de menos de 11 px o áreas táctiles de menos de 44×44 (`docs/diseno-ios.md`). Si tu cambio es en otra pantalla, **agrega su captura a ese script**; no crees otro. Mira las imágenes antes de dar algo por terminado.
- Todo lo táctil (gestos, scroll, áreas de toque): eventos táctiles reales por CDP, nunca `page.mouse`. Protocolo en [gestos-y-reordenar.md](gestos-y-reordenar.md).
- Áreas táctiles: se miden con `elementFromPoint` en las esquinas, no leyendo el CSS (lección 51).
- 0 errores de consola y 0 desbordes horizontales (`scrollWidth <= innerWidth`).

## Verificar en el iPhone (lo hace Esteban)
Cada función tiene su lista en `docs/esteban/pruebas-iphone.md`; agrégala o actualízala en la misma entrega. Para ver la versión nueva: salir de la app y volver; si hay una sesión de gym a medias aparece el aviso **✨ Nueva versión lista** → **Actualizar**. Ajustes (⚙︎) → VERSIÓN muestra la versión instalada.

## Lecciones que aplican
20, 44, 51.
