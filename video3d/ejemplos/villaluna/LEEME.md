# Ejemplo: Villaluna (ciudad inventada, 3 datos)

Prueba de punta a punta de reutilizar el kit con un guion nuevo. Es ficción: no hay datos que verificar.

| Archivo | Qué es |
|---|---|
| `guion.json` | 3 frases (140 caracteres) |
| `tiempos.json` | salida real de `voz_elevenlabs.py` (voz Liam, velocidad 1.1): 9,78 s |
| `adaptacion_codigo_v0.diff` | lo que hubo que editar **a mano en el código** antes de existir `video.config.json` (`Video.tsx` +7/−11 y `Escena.tsx` +7/−24 líneas). Es solo referencia histórica de esa etapa (versión 0) |

El audio (`voz/`, `audio/`) no se guarda: pesa y se regenera con los scripts (la voz gasta créditos).

## Lo que este ejemplo mostró (límites honestos)
- Los decorados reutilizados son del video de GTA 6: la cima de la torre tiene un **nido con huevos** (sale bajo «RELOJES») y no hay **gatos** (la fachada lisa bajo «3000 GATOS»).
- El texto y los subtítulos sí funcionan con contenido nuevo; el 3D depende de qué decorados existan.
