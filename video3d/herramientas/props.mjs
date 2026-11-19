// Resuelve qué configuración y tiempos usar al renderizar: devuelve {config, tiempos} o null (null = los de plantilla/src).
//   --config ruta.json     video.config.json de otro video (o VIDEO3D_CONFIG)
//   --tiempos ruta.json    tiempos.json de la voz, p. ej. voz/tiempos.json (o VIDEO3D_TIEMPOS)
//   --ejemplo nombre       usa ejemplos/<nombre>/video.config.json y tiempos.json (p. ej. villaluna)
// Las rutas son relativas a la carpeta actual. Si solo se da una de las dos, la otra sale de plantilla/src.
import fs from 'node:fs';
import path from 'node:path';

export function resolverProps({ config, tiempos, ejemplo }, proyecto, raiz) {
  config = config || process.env.VIDEO3D_CONFIG; tiempos = tiempos || process.env.VIDEO3D_TIEMPOS;
  if (ejemplo) {
    const d = path.join(raiz, 'ejemplos', ejemplo);
    config = config || path.join(d, 'video.config.json'); tiempos = tiempos || path.join(d, 'tiempos.json');
  }
  if (!config && !tiempos) return null;
  const leer = (ruta, que) => {
    const r = path.resolve(ruta);
    if (!fs.existsSync(r)) { console.error(`No existe ${que}: ${r}`); process.exit(2); }
    try { return JSON.parse(fs.readFileSync(r, 'utf8')); } catch (e) { console.error(`${que} no es JSON válido (${r}): ${e.message}`); process.exit(2); }
  };
  const por = (ruta, def, que) => leer(ruta || path.join(proyecto, 'src', def), que);
  const props = { config: por(config, 'video.config.json', 'la configuración'), tiempos: por(tiempos, 'tiempos.json', 'los tiempos') };
  console.log(`configuración: ${config ? path.resolve(config) : 'plantilla/src/video.config.json'} · tiempos: ${tiempos ? path.resolve(tiempos) : 'plantilla/src/tiempos.json'}`);
  return props;
}
