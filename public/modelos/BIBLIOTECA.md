# Biblioteca de modelos 3D

Índice: `catalogo.json` (generado con `node scripts/biblioteca/generar-catalogo.mjs`, que también valida licencias y archivos).
Cada modelo tiene su `.json` de metadatos y su miniatura `.png` junto al archivo; `miniaturas-hoja.png` es la hoja con todos.
Licencias: `licencias/` (copias exactas de los textos que traen los ZIP). Todo es CC0 (Quaternius); resumen en `LICENCIAS.md`.

Cómo se usa: `<Modelo archivo="autos/Taxi.glb" pos rot escala />` (src/three/Modelo.tsx); autos: `<Auto modelo="SportsCar2" />`; personajes: `<PersonajeA .../>`.

## Costo de render (medido, 105 cuadros de la escena de la calle, 4 núcleos)
| Contenido | Tiempo |
|---|---|
| Autos + personajes + luces | 86 s |
| + edificios de la biblioteca (Building_Small_1, Building_Medium_2_001) | +127 s |
| + 28 aceras, bolardos, jardinera, semáforo, paso de peatones y 8 farolas | +160 s |

Por eso los edificios y esos props están **desactivados** en `CalleSiluetas.tsx` hasta optimizarlos (instanciado/fusión de mallas, menos materiales).
Los autos de la biblioteca (~3 000 triángulos, 250 KB) sí se usan en todas las escenas.
