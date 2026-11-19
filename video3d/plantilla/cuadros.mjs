// Cuadros fijos a tamaño completo con un solo empaquetado (más rápido que un «remotion still» por cuadro).
// Uso: node cuadros.mjs "0:C:/ruta/c0.png,135:C:/ruta/c1.png" [--config ruta] [--tiempos ruta] [--ejemplo villaluna]   (cuadro:archivo, separados por coma)
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolverProps } from '../herramientas/props.mjs';
const AQUI = path.dirname(fileURLToPath(import.meta.url));

const NAV = process.env.NAVEGADOR || undefined;
const OPC = { gl: 'swangle', enableMultiProcessOnLinux: true };
const pedidos = (process.argv[2] || '').split(',').filter(Boolean).map((x) => {
  const i = x.indexOf(':');
  return { cuadro: Number(x.slice(0, i)), archivo: x.slice(i + 1) };
});
if (!pedidos.length) {
  console.error('Uso: node cuadros.mjs "0:salida/c0.png,135:salida/c1.png"');
  process.exit(2);
}
const a = process.argv.slice(3); const flag = (n) => { const i = a.indexOf('--' + n); return i >= 0 ? a[i + 1] : undefined; };
const inputProps = resolverProps({ config: flag('config'), tiempos: flag('tiempos'), ejemplo: flag('ejemplo') }, AQUI, path.join(AQUI, '..')) ?? undefined;
const serveUrl = await bundle({ entryPoint: path.join(AQUI, 'src', 'index.ts') });
const composition = await selectComposition({ serveUrl, id: 'Video', inputProps, browserExecutable: NAV, chromiumOptions: OPC });
for (const p of pedidos) {
  const frame = Math.min(Math.max(0, p.cuadro), composition.durationInFrames - 1);
  await renderStill({ composition, serveUrl, inputProps, output: p.archivo, frame, browserExecutable: NAV, chromiumOptions: OPC });
  console.log(`cuadro ${frame} → ${p.archivo}`);
}
