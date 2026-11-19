# Ejemplo: tres hábitos para dormir mejor (7 frases, 30 s)

Prueba final de punta a punta **sin tocar el código de la plantilla**. Las cifras (10:30, 30 min, 18 °C, 7 días) son **ejemplos**, no consejo médico, y el video lo dice en pantalla («CIFRAS DE EJEMPLO»).

| Archivo | Qué es |
|---|---|
| `guion.json` | 7 frases, 346 caracteres |
| `tiempos.json` | salida real de `voz_elevenlabs.py` (voz Liam, 1.1): 30,01 s |
| `borrador_generado.config.json` | lo que produjo `nuevo_video.mjs` (17 tomas, 203 líneas, validaba sin errores) |
| `video.config.json` | el borrador retocado (216 líneas): 103 líneas nuevas o modificadas y 90 reemplazadas respecto al borrador |

Render: `node herramientas/render.mjs --modo normal --ejemplo sueno` (sin audio; el audio se regenera con la voz, la música y el limitador).

## Lo que mostró (límites honestos)
- El borrador automático elige `calle` de día para un tema de dormir y textos sueltos de la frase; casi todo hubo que rehacerlo a mano.
- No hay decorado de dormitorio ni de noche: el `interior` siempre es de día y con ventana luminosa, así que «Y OSCURO» se dice sobre un cuarto claro.
- La escena `datos · cifra` es de números de 7 segmentos: no muestra «10:30» como reloj (sin los dos puntos).
- La música es siempre synthwave (104 bpm): no encaja con un tema de descanso.
