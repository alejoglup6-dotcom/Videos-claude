// Genera la voz en off COMPLETA con ElevenLabs en UNA sola llamada (con tiempos por letra) y la guarda en public/voces/<id>/.
// Uso: node scripts/voz-elevenlabs.mjs <guion> [--forzar]
// La clave NUNCA se guarda: se lee de ELEVENLABS_API_KEY (en esta sesión el proxy la inyecta). El MP4 resultante se sube al repositorio,
// así GitHub Actions no necesita ningún secret ni llama a la API.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { RAIZ, leerGuion } from './comun.mjs';

const VOZ_ID = 'TX3LPaxmHKxFdv7VOQHJ'; const VOZ_NOMBRE = 'Liam'; const MODELO = 'eleven_multilingual_v2';
const nombre = process.argv[2]; const forzar = process.argv.includes('--forzar');
if (!nombre) { console.error('Uso: node scripts/voz-elevenlabs.mjs <guion> [--forzar]'); process.exit(2); }
const { guion } = leerGuion(nombre);
const dir = path.join(RAIZ, 'public/voces', guion.id); const mp3 = path.join(dir, 'voz.mp3'); const manif = path.join(dir, 'voz.json');
if (fs.existsSync(mp3) && !forzar) { console.error(`Ya existe ${path.relative(RAIZ, mp3)}. No se vuelve a llamar a la API (cuesta créditos). Usa --forzar solo si de verdad quieres otra.`); process.exit(3); }

const conVoz = guion.escenas.filter((e) => e.voz?.texto);
let texto = ''; const rangos = [];
for (const e of conVoz) { if (texto) texto += ' '; const a = texto.length; texto += e.voz.texto.trim(); rangos.push({ id: e.id, a, b: texto.length }); }
const key = process.env.ELEVENLABS_API_KEY || 'proxy-injected';
const curl = (args, input) => execFileSync('curl', ['-sS', '-m', '180', ...args], { input, encoding: 'utf8', maxBuffer: 1 << 28 });

// 1) créditos (esta consulta no gasta caracteres)
const sub = JSON.parse(curl(['-H', 'xi-api-key: ' + key, 'https://api.elevenlabs.io/v1/user/subscription']));
if (typeof sub.character_limit !== 'number') { console.error('No pude leer los créditos de ElevenLabs; no genero nada.'); process.exit(4); }
const libres = sub.character_limit - sub.character_count;
console.log(`Créditos: ${libres} caracteres libres de ${sub.character_limit} (plan ${sub.tier}). Esta voz usa ${texto.length}.`);
if (texto.length > libres) { console.error('Créditos insuficientes: no genero nada. Usa Piper (scripts/voz-piper.mjs).'); process.exit(5); }

// 2) UNA llamada
const cuerpo = JSON.stringify({ text: texto, model_id: MODELO, voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0, use_speaker_boost: true } });
const crudo = curl(['-X', 'POST', '-H', 'xi-api-key: ' + key, '-H', 'Content-Type: application/json', '--data-binary', '@-', '-w', '\n%{http_code}', `https://api.elevenlabs.io/v1/text-to-speech/${VOZ_ID}/with-timestamps?output_format=mp3_44100_128`], cuerpo);
const i = crudo.lastIndexOf('\n'); const codigo = crudo.slice(i + 1).trim(); const cuerpoResp = crudo.slice(0, i);
if (codigo !== '200') { console.error(`ElevenLabs respondió ${codigo}: ${cuerpoResp.slice(0, 300)}\nNo reintento solo (cada intento puede gastar créditos).`); process.exit(6); }
const r = JSON.parse(cuerpoResp); const al = r.alignment;
if (!r.audio_base64 || !al?.characters) { console.error('La respuesta no trae audio o tiempos.'); process.exit(7); }
fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(mp3, Buffer.from(r.audio_base64, 'base64'));

// 3) tiempos por escena y por palabra (relativos al inicio de la frase de esa escena)
const S = al.character_start_times_seconds, E = al.character_end_times_seconds;
const escenas = {};
for (const g of rangos) {
  const desde = S[g.a], hasta = E[g.b - 1]; const palabras = []; let k = g.a;
  for (const w of texto.slice(g.a, g.b).split(' ')) { const s = S[k], e = E[k + w.length - 1]; palabras.push({ w, s: Number((s - desde).toFixed(3)), e: Number((e - desde).toFixed(3)) }); k += w.length + 1; }
  escenas[g.id] = { desde: Number(desde.toFixed(3)), hasta: Number(hasta.toFixed(3)), duracion: Number((hasta - desde).toFixed(3)), palabras };
}
fs.writeFileSync(manif, JSON.stringify({ proveedor: 'ElevenLabs', voz: VOZ_NOMBRE, voice_id: VOZ_ID, modelo: MODELO, caracteres: texto.length, archivo: `voces/${guion.id}/voz.mp3`, escenas }, null, 2));
console.log(`✔ ${path.relative(RAIZ, mp3)} (${(fs.statSync(mp3).size / 1024).toFixed(0)} KB)`);
for (const [id, x] of Object.entries(escenas)) console.log(`${id}: ${x.duracion.toFixed(2)} s (desde ${x.desde.toFixed(2)})`);
