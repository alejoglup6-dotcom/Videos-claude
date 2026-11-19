# Prompts y trucos para que el 3D no se vea plano

> Honestidad: estos prompts son punto de partida. **La calidad de los modelos de video no se probó** (no había GPU). Lo que sí se probó es la escena de Blender (ver las capturas del README) y la mecánica de cada backend.

## 1. Blender: qué lo hace «cinematográfico» (ya aplicado en `blender/escena_neon.py`)

| Técnica | Dónde | Por qué evita el aspecto plano |
|---|---|---|
| Asfalto mojado con rugosidad por ruido (charcos casi espejo junto a zonas mate) | `mat_asfalto_mojado` | reflejos reales de los neones; es lo que más «sube» la escena |
| Ventanas emisivas por atlas procedural (encendidas con la paleta) | `textura_ventanas` | luz propia en los edificios, sin texturas externas |
| Niebla volumétrica en el mundo (`niebla`, ≈ 0,007) | `construir` | profundidad y halos alrededor de las luces |
| Luces de color junto a cada cartel (`POINT`) | `construir` | el neón tiñe el entorno, no solo se ve |
| Profundidad de campo (`apertura_f` ≈ 2–2,8) y lente larga/corta (`lente_mm`) | `camara` | separa planos |
| Cámara con movimiento calculado (dolly, órbita, grúa, mano alzada) | `pose_camara` | movimiento con inercia visual, no un plano fijo |
| Vista AgX con *look* de contraste + exposición baja (−0,7) | `configurar_render` | negros profundos y neones que no se queman |
| Glare tipo *fog glow* + dispersión cromática en el compositor | `configurar_render` | bloom y borde de lente |
| Siluetas con borde de luz (fresnel → emisión) | `mat_silueta` | figuras legibles sin rostro (originales) |

Parámetros útiles en `ajustes.blender`: `samples` (16 para previsualizar, 48+ en GPU), `escala` (0,25–1), `niebla`, `exposicion`, `lluvia`, `personajes`, `motion_blur`.

## 2. Texto→video (Wan 2.1 y similares)

Fórmula: **sujeto + acción + entorno + iluminación + cámara + estilo**. Escribe en inglés (es lo habitual con estos modelos; no se verificó aquí). El pipeline añade solo las pistas de cámara (`slow dolly in`, `35mm lens`, `shallow depth of field`) a partir de `camara`, así que no las repitas.

```text
Aerial view of a fictional coastal city at night, neon skyscrapers, palm trees along the beach,
wet streets reflecting colored lights, volumetric haze, cinematic lighting, high detail
```
```text
An original adult character seen from behind, silhouette against headlights, walking toward a sports car
on a rainy neon street, moody atmosphere, cinematic
```
```text
Stylized police chase at night in a fictional city, sports car weaving through traffic, flashing generic
red and blue lights, light rain, dynamic camera
```
```text
Wide aerial of a fictional coastal city at sunset, beach, palm trees, traffic, a helicopter, slow orbit, warm light
```

Negativo recomendado para evitar texto y marcas: `text, watermark, logo, brand name, subtitles, blurry, low quality, deformed hands, extra fingers`. La plantilla oficial de Wan trae su propio negativo (en chino); el pipeline lo conserva salvo que pongas `prompt_negativo` en la escena.

## 3. Imagen→video

El prompt describe **el movimiento**, no la imagen (la imagen ya fija el contenido): `slow push in, the character turns toward the camera, rain falling, neon flickering`. Usa una imagen vertical (o que se recorte bien a 9:16) y sin texto ni logos.

## 4. Para generar la imagen de partida de un personaje original

Pide rasgos genéricos y verificables, no nombres: «adult woman, dark jacket, short hair, seen from behind, neon-lit alley, cinematic». No menciones personajes, actores ni títulos. Revisa la imagen resultante antes de animarla: si se parece a alguien o a un personaje conocido, descártala.
