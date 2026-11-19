// Descarga packs GRATUITOS de itch.io (el mismo flujo que sigue el botón «Download Now» del navegador).
// Uso:  node scripts/biblioteca/itch.mjs listar <url-del-juego>
//       node scripts/biblioteca/itch.mjs bajar  <url-del-juego> <upload_id> <archivo-destino.zip>
// Solo para packs gratis (o «paga lo que quieras» con mínimo 0). No salta pagos ni protecciones.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const jar = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'itch-')), 'cookies.txt');
const curl = (args, opts = {}) => execFileSync('curl', ['-sS', '-m', '600', '-L', '-c', jar, '-b', jar, ...args], { encoding: opts.binary ? 'buffer' : 'utf8', maxBuffer: 1 << 30 });
const csrf = (html) => (/name="csrf_token" value="([^"]+)"/.exec(html) || [])[1];
const post = (url, token, extra = []) => JSON.parse(curl(['-X', 'POST', '-H', 'X-Requested-With: XMLHttpRequest', '--data-urlencode', `csrf_token=${token}`, ...extra, url]));

export const paginaDescarga = (juego) => {
  const html = curl([juego]); const t = csrf(html); if (!t) throw new Error('No encontré el token de la página: ' + juego);
  const { url } = post(juego.replace(/\/$/, '') + '/download_url', t); if (!url) throw new Error('Este pack no es gratuito o requiere iniciar sesión: ' + juego);
  const dl = curl([url]); return { html: dl, token: csrf(dl) };
};
export const listar = (juego) => {
  const { html } = paginaDescarga(juego); const out = [];
  for (const m of html.matchAll(/<div class="upload">(.*?)<\/div>\s*<\/div>\s*<\/div>/gs)) {
    const b = m[1]; const id = (/data-upload_id="(\d+)"/.exec(b) || [])[1]; const nombre = (/<strong class="name"[^>]*>([^<]+)/.exec(b) || [])[1]; const peso = (/class="file_size"[^>]*><span>([^<]+)/.exec(b) || [])[1];
    if (id) out.push({ id, nombre, peso });
  }
  return out;
};
export const bajar = (juego, id, destino) => {
  const { token } = paginaDescarga(juego);
  const r = post(`${juego.replace(/\/$/, '')}/file/${id}?source=view_game&as_props=1&after_download_lightbox=true`, token);
  if (!r.url) throw new Error('itch no devolvió URL de descarga para ' + id);
  fs.mkdirSync(path.dirname(destino), { recursive: true }); curl(['-o', destino, r.url]); return fs.statSync(destino).size;
};

if (process.argv[1]?.endsWith('itch.mjs')) {
  const [cmd, juego, id, destino] = process.argv.slice(2);
  if (cmd === 'listar') for (const u of listar(juego)) console.log(`${u.id}\t${u.peso}\t${u.nombre}`);
  else if (cmd === 'bajar') console.log(`✔ ${destino} (${(bajar(juego, id, destino) / 1e6).toFixed(1)} MB)`);
  else { console.error('Uso: listar <url> | bajar <url> <id> <destino>'); process.exit(2); }
}
