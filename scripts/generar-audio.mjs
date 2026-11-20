// Genera música synthwave y efectos de sonido 100 % por código (sin descargas, sin derechos de autor).
// Uso: node scripts/generar-audio.mjs <guion>   →  public/audio/<id>/musica.wav  y  public/audio/sfx/*.wav
import fs from 'node:fs';
import path from 'node:path';
import { RAIZ, leerGuion } from './comun.mjs';

const SR = 44100;
export const escribirWav = (ruta, x) => {
  const n = x.length; const b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, x[i])) * 32767), 44 + i * 2);
  fs.mkdirSync(path.dirname(ruta), { recursive: true }); fs.writeFileSync(ruta, b);
};
const rng = (semilla) => { let s = semilla >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const saw = (ph) => 2 * (ph - Math.floor(ph + 0.5));
const norm = (x, pico = 0.9) => { let m = 0; for (let i = 0; i < x.length; i++) m = Math.max(m, Math.abs(x[i])); const g = m > 0 ? pico / m : 1; for (let i = 0; i < x.length; i++) x[i] *= g; return x; };

// ---------- efectos ----------
const sfx = {
  impacto: () => { const n = SR * 1.2, x = new Float32Array(n), r = rng(1); for (let i = 0; i < n; i++) { const t = i / SR; x[i] = Math.sin(2 * Math.PI * (48 + 90 * Math.exp(-t * 14)) * t) * Math.exp(-t * 4.5) + (r() * 2 - 1) * Math.exp(-t * 30) * 0.5; } return norm(x); },
  whoosh: () => { const n = SR * 0.7, x = new Float32Array(n), r = rng(2); let lp = 0; for (let i = 0; i < n; i++) { const t = i / n; const a = Math.sin(Math.PI * t) ** 2; const f = 0.02 + 0.5 * t; lp += f * ((r() * 2 - 1) - lp); x[i] = lp * a * 3; } return norm(x, 0.8); },
  riser_corto: () => { const n = SR * 0.7, x = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / n; x[i] = Math.sin(2 * Math.PI * (200 * t + 900 * t * t * 0.5) * (i / SR) * 2) * t * t; } return norm(x, 0.7); },
  riser: () => { const n = SR * 2.2, x = new Float32Array(n), r = rng(3); let ph = 0, lp = 0; for (let i = 0; i < n; i++) { const t = i / n; ph += (110 + 1500 * t * t) / SR; lp += (0.05 + 0.6 * t) * ((r() * 2 - 1) - lp); x[i] = (saw(ph) * 0.4 + lp * 1.2) * t * t; } return norm(x, 0.75); },
  glitch: () => { const n = SR * 0.4, x = new Float32Array(n), r = rng(4); let v = 0; for (let i = 0; i < n; i++) { if (i % 441 === 0) v = r() > 0.5 ? 1 : -1; x[i] = (v * (r() > 0.6 ? 1 : 0.2) + (r() * 2 - 1) * 0.3) * Math.exp(-(i / SR) * 6); } return norm(x, 0.6); },
  suave: () => { const n = SR * 0.9, x = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / SR; x[i] = (Math.sin(2 * Math.PI * 220 * t) + Math.sin(2 * Math.PI * 330 * t) * 0.6) * Math.sin(Math.PI * i / n) ** 2; } return norm(x, 0.5); },
  // motor de moto de agua: zumbido con vibrato y algo de ruido
  motor: () => { const n = SR * 1.8, x = new Float32Array(n), r = rng(5); let ph = 0; for (let i = 0; i < n; i++) { const t = i / SR; const f = 70 + 25 * Math.min(1, t * 2) + 6 * Math.sin(t * 38); ph += f / SR; x[i] = (saw(ph) * 0.6 + (r() * 2 - 1) * 0.25) * Math.min(1, t * 6) * Math.min(1, (n - i) / (SR * 0.4)); } return norm(x, 0.7); },
  // agua: chapoteo (ruido filtrado con varios golpes)
  agua: () => { const n = SR * 1.2, x = new Float32Array(n), r = rng(6); let lp = 0; for (let i = 0; i < n; i++) { const t = i / SR; const env = Math.exp(-t * 4) + 0.5 * Math.exp(-Math.max(0, t - 0.25) * 9) * (t > 0.25 ? 1 : 0); lp += 0.18 * ((r() * 2 - 1) - lp); x[i] = lp * env * 2.5; } return norm(x, 0.6); },
  // rugido bajo (sin samples): seno grave modulado + ruido
  rugido: () => { const n = SR * 1.4, x = new Float32Array(n), r = rng(7); let lp = 0; for (let i = 0; i < n; i++) { const t = i / SR; lp += 0.05 * ((r() * 2 - 1) - lp); const am = 0.6 + 0.4 * Math.sin(t * 2 * Math.PI * 11); x[i] = (Math.sin(2 * Math.PI * (55 + 10 * Math.sin(t * 3)) * t) * 0.7 + lp * 3) * am * Math.sin(Math.PI * Math.min(1, t / 1.4)); } return norm(x, 0.65); },
  // chirrido pequeño (lagartija)
  chirrido: () => { const n = SR * 0.35, x = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / SR; const g = (Math.floor(t * 28) % 2) ? 1 : 0.2; x[i] = Math.sin(2 * Math.PI * (2600 + 900 * Math.sin(t * 60)) * t) * g * Math.exp(-t * 6); } return norm(x, 0.45); },
  // cierre: golpe con cola larga tipo reverb
  cierre: () => { const n = SR * 3, x = new Float32Array(n), r = rng(8); let lp = 0; for (let i = 0; i < n; i++) { const t = i / SR; lp += 0.08 * ((r() * 2 - 1) - lp); x[i] = Math.sin(2 * Math.PI * (45 + 60 * Math.exp(-t * 10)) * t) * Math.exp(-t * 2.2) + lp * 1.4 * Math.exp(-t * 1.1); } return norm(x, 0.8); },
  ping: () => { const n = SR * 0.8, x = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / SR; x[i] = (Math.sin(2 * Math.PI * 1318 * t) + 0.4 * Math.sin(2 * Math.PI * 2637 * t)) * Math.exp(-t * 6); } return norm(x, 0.6); },
};


// ---------- efectos SUAVES (video sin música): cortos, con fade de entrada y salida, pico bajo y sin componentes agudos ----------
const suave = (x, pico = 0.3, fin = 0.12, fout = 0.35) => { const n = x.length, a = Math.floor(SR * fin), b = Math.floor(SR * fout);
  for (let i = 0; i < n; i++) { const e = Math.min(1, i / a) * Math.min(1, (n - i) / b); x[i] *= 0.5 - 0.5 * Math.cos(Math.PI * e); } return norm(x, pico); };
const lp1 = (r, k) => { let s = 0; return () => (s += k * ((r() * 2 - 1) - s)); };
Object.assign(sfx, {
  motor_suave: () => { const n = SR * 1.6, x = new Float32Array(n); let ph = 0; for (let i = 0; i < n; i++) { const t = i / SR; ph += (62 + 8 * Math.sin(t * 5)) / SR; x[i] = Math.sin(2 * Math.PI * ph) * 0.8 + Math.sin(4 * Math.PI * ph) * 0.25; } return suave(x, 0.22, 0.4, 0.7); },
  whoosh_suave: () => { const n = SR * 0.8, x = new Float32Array(n), f = lp1(rng(21), 0.04); for (let i = 0; i < n; i++) { const t = i / n; x[i] = f() * Math.sin(Math.PI * t) ** 2 * 3; } return suave(x, 0.2, 0.25, 0.4); },
  pulso_suave: () => { const n = SR * 1.0, x = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / SR; x[i] = Math.sin(2 * Math.PI * 58 * t) * (Math.sin(2 * Math.PI * 2 * t) ** 2); } return suave(x, 0.22, 0.25, 0.5); },
  estatica_suave: () => { const n = SR * 1.4, x = new Float32Array(n), f = lp1(rng(22), 0.1); for (let i = 0; i < n; i++) { const t = i / SR; x[i] = f() * (0.7 + 0.3 * Math.sin(t * 23)); } return suave(x, 0.12, 0.3, 0.6); },
  destello_suave: () => { const n = SR * 0.9, x = new Float32Array(n); for (let i = 0; i < n; i++) { const t = i / SR; x[i] = (Math.sin(2 * Math.PI * 523 * t) + 0.5 * Math.sin(2 * Math.PI * 784 * t)) * Math.exp(-t * 4); } return suave(x, 0.14, 0.12, 0.5); },
  glitch_suave: () => { const n = SR * 0.4, x = new Float32Array(n), f = lp1(rng(23), 0.07); for (let i = 0; i < n; i++) x[i] = f() * (Math.floor(i / 1500) % 2 ? 1 : 0.3); return suave(x, 0.12, 0.05, 0.2); },
  reverb_suave: () => { const n = SR * 2.4, x = new Float32Array(n), f = lp1(rng(24), 0.03); for (let i = 0; i < n; i++) { const t = i / SR; x[i] = (Math.sin(2 * Math.PI * 80 * t) * 0.7 + f() * 1.5) * Math.exp(-t * 1.3); } return suave(x, 0.2, 0.3, 1.2); },
});

// ---------- música ----------
const ESC = { Am: [57, [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]], Dm: [50, [[50, 53, 57], [46, 50, 53], [41, 45, 48], [48, 52, 55]]], Em: [52, [[52, 55, 59], [48, 52, 55], [43, 47, 50], [50, 54, 57]]] };
export const musica = (g, duracion) => {
  const cfg = g.audio?.musica?.generar ?? {}; const bpm = cfg.bpm ?? 120; const beat = 60 / bpm; const [, acordes] = ESC[cfg.escala ?? 'Am']; const r = rng(cfg.semilla ?? 1);
  const n = Math.ceil(SR * (duracion + 1)), x = new Float32Array(n);
  const escenas = []; let t0 = 0; for (const e of g.escenas) { escenas.push({ t0, t1: t0 + e.duracion, i: e.musica?.intensidad ?? 0.7, golpe: !!e.musica?.golpe, riser: !!e.musica?.riser }); t0 += e.duracion; }
  const sceneAt = (t) => escenas.find((s) => t >= s.t0 && t < s.t1) ?? escenas[escenas.length - 1];
  const add = (t, f, nota, lim) => { const i0 = Math.floor(t * SR); for (let i = 0; i < nota.length && i0 + i < n; i++) x[i0 + i] += nota[i] * (lim ?? 1); };
  const kick = (() => { const m = SR * 0.35, k = new Float32Array(m); for (let i = 0; i < m; i++) { const t = i / SR; k[i] = Math.sin(2 * Math.PI * (45 + 110 * Math.exp(-t * 30)) * t) * Math.exp(-t * 11); } return k; })();
  const hat = (() => { const m = SR * 0.05, k = new Float32Array(m), rr = rng(9); for (let i = 0; i < m; i++) k[i] = (rr() * 2 - 1) * Math.exp(-i / SR * 90); return k; })();
  const totalBeats = Math.ceil(duracion / beat) + 2;
  for (let b = 0; b < totalBeats; b++) {
    const t = b * beat; const s = sceneAt(t); const acorde = acordes[Math.floor(b / 4) % 4];
    if (s.i > 0.45) add(t, 0, kick, 0.9 * Math.min(1, s.i + 0.2));
    if (s.i > 0.55) for (let h = 0; h < 2; h++) add(t + beat * (0.5 + h * 0.25 * (s.i > 0.8 ? 1 : 0)), 0, hat, 0.25 * s.i);
    // bajo en corcheas
    for (let h = 0; h < 2; h++) { const tt = t + h * beat / 2; const f = hz(acorde[0] - 12); const m = Math.floor(SR * beat / 2 * 0.9), nt = new Float32Array(m); let ph = 0; for (let i = 0; i < m; i++) { ph += f / SR; nt[i] = (saw(ph) * 0.6 + Math.sin(2 * Math.PI * ph) * 0.5) * Math.exp(-i / SR * 6); } add(tt, 0, nt, 0.38 * (0.6 + s.i * 0.5)); }
    // arpegio (solo con intensidad alta)
    if (s.i > 0.72) for (let h = 0; h < 4; h++) { const tt = t + h * beat / 4; const f = hz(acorde[h % 3] + 12); const m = Math.floor(SR * beat / 4 * 0.9), nt = new Float32Array(m); let ph = 0; for (let i = 0; i < m; i++) { ph += f / SR; nt[i] = (Math.sign(Math.sin(2 * Math.PI * ph)) * 0.35 + saw(ph) * 0.25) * Math.exp(-i / SR * 9); } add(tt, 0, nt, 0.2); }
  }
  // pad continuo (acordes de 2 s)
  for (let c = 0; c * beat * 4 < duracion + beat * 4; c++) { const t = c * beat * 4; const acorde = acordes[c % 4]; const m = Math.floor(SR * beat * 4), nt = new Float32Array(m); const s = sceneAt(t);
    for (const nota of acorde) { const f = hz(nota); let ph1 = r(), ph2 = r(); for (let i = 0; i < m; i++) { ph1 += f * 1.003 / SR; ph2 += f * 0.997 / SR; const env = Math.min(1, i / (SR * 0.4)) * Math.min(1, (m - i) / (SR * 0.3)); nt[i] += (saw(ph1) + saw(ph2)) * 0.07 * env; } }
    add(t, 0, nt, 0.55 + 0.4 * s.i); }
  // golpe grave en los cortes marcados + riser antes del corte siguiente
  escenas.forEach((s, idx) => { if (s.golpe) { const m = SR * 1.2, k = new Float32Array(m); for (let i = 0; i < m; i++) { const t = i / SR; k[i] = Math.sin(2 * Math.PI * (40 + 70 * Math.exp(-t * 9)) * t) * Math.exp(-t * 3.2); } add(s.t0, 0, k, 1.1); }
    if (s.riser && idx + 1 < escenas.length) { const rs = sfx.riser(); const ini = s.t1 - 2.2; if (ini >= 0) add(ini, 0, rs, 0.5); } });
  return norm(x, 0.85).slice(0, Math.floor(SR * duracion));
};

if (process.argv[1] && process.argv[1].endsWith('generar-audio.mjs')) {
  const nombre = process.argv[2]; if (!nombre) { console.error('Uso: node scripts/generar-audio.mjs <guion>'); process.exit(2); }
  const { guion } = leerGuion(nombre);
  for (const [k, f] of Object.entries(sfx)) escribirWav(path.join(RAIZ, 'public/audio/sfx', k + '.wav'), f());
  const dur = guion.escenas.reduce((a, e) => a + e.duracion, 0);
  if (guion.audio?.musica?.generar) { escribirWav(path.join(RAIZ, 'public/audio', guion.id, 'musica.wav'), musica(guion, dur)); console.log(`música: ${dur} s a ${guion.audio.musica.generar.bpm ?? 120} bpm`); }
  else console.log('Sin música generada (el guion no tiene audio.musica.generar)');
  console.log('efectos: ' + Object.keys(sfx).join(', '));
}
