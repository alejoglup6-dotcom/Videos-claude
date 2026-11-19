// Mundo del video «El año que rompió el récord»: termómetro, franja de calor, récord que se rompe y promedio.
// Todo se dibuja con SVG y sale de t (segundos). Nada de números en pantalla aquí: el texto es una sola capa (Video.tsx).
import React from 'react';
import { cl, lerp, rnd, sale, suave } from '../motor';
import type { Paleta } from '../estilo';

export type Tm = {
  I: (id: string) => number;
  F: (id: string) => number;
  W: (id: string, palabra: string) => number;
  dur: number;
  cont4: { t0: number; t1: number };
};

const W_ = 1080;
const H_ = 1920;
const FUENTE = 'BigShouldersDisplay, sans-serif';

// aparece entre a y b (con fundido de f segundos) y se va
const vis = (t: number, a: number, b: number, f = 0.14) => cl((t - a) / f) * (1 - cl((t - (b - f)) / f));
const mezcla = (c1: number[], c2: number[], k: number) => c1.map((v, i) => Math.round(lerp(v, c2[i], k)));
const rgb = (c: number[]) => `rgb(${c[0]},${c[1]},${c[2]})`;

// ---------- fondo: calor que sube con el video, brasas, viñeta y grano ----------
const Fondo: React.FC<{ t: number; tm: Tm; p: Paleta }> = ({ t, tm, p }) => {
  const k = cl(t / tm.dur);
  const brasas = Array.from({ length: 70 }, (_, i) => {
    const vel = 40 + rnd(i + 4) * 120;
    const y = H_ + 40 - ((t * vel + rnd(i) * 2400) % 2300);
    const x = rnd(i + 20) * W_ + 30 * Math.sin(t * (0.6 + rnd(i + 7)) + i);
    const r = 1.5 + rnd(i + 11) * 4.5;
    const op = (0.25 + 0.55 * rnd(i + 31)) * (0.6 + 0.4 * Math.sin(t * 3 + i * 1.7)) * cl(1 - (H_ - y) / 2300 + 0.2);
    return <circle key={i} cx={x} cy={y} r={r} fill={i % 3 ? p.borde : p.acento} opacity={op} />;
  });
  return (
    <svg width={W_} height={H_} style={{ position: 'absolute', inset: 0 }}>
      <defs>
        <radialGradient id="calor" cx="50%" cy="100%" r="85%">
          <stop offset="0%" stopColor={p.brillo} stopOpacity={0.35 + 0.45 * k} />
          <stop offset="35%" stopColor={p.tierra} stopOpacity={0.18 + 0.28 * k} />
          <stop offset="100%" stopColor={p.fondo} stopOpacity={0} />
        </radialGradient>
        <radialGradient id="cielo" cx="50%" cy="8%" r="60%">
          <stop offset="0%" stopColor={p.mar} stopOpacity={0.85} />
          <stop offset="100%" stopColor={p.fondo} stopOpacity={0} />
        </radialGradient>
        <radialGradient id="vineta" cx="50%" cy="46%" r="75%">
          <stop offset="55%" stopColor="#000" stopOpacity={0} />
          <stop offset="100%" stopColor="#000" stopOpacity={0.78} />
        </radialGradient>
        <filter id="grano" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={Math.floor(t * 24) % 50} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>
      <rect width={W_} height={H_} fill="url(#cielo)" />
      <rect width={W_} height={H_} fill="url(#calor)" />
      {/* bandas de neblina de calor */}
      {[0, 1, 2].map((i) => (
        <ellipse key={i} cx={540 + 120 * Math.sin(t * 0.3 + i * 2)} cy={1500 - i * 230} rx={800} ry={90} fill={p.tierra} opacity={0.05 + 0.04 * k} />
      ))}
      {brasas}
      <rect width={W_} height={H_} fill="url(#vineta)" />
    </svg>
  );
};

// ---------- termómetro ----------
const yC = (c: number) => 1030 - 310 * c; // grados → y
const Termometro: React.FC<{ t: number; p: Paleta; nivel: number; nivel2: number; linea: number; vibra: number }> = ({ t, p, nivel, nivel2, linea, vibra }) => {
  const x0 = 485; const w = 110;
  const yTop = yC(2.1); const yBulbo = 1110;
  const alto = Math.max(0, nivel);
  const yN = yC(alto) + vibra;
  const yN2 = yC(Math.max(nivel2, 0)) + vibra;
  const ticks = Array.from({ length: 21 }, (_, i) => i * 0.1);
  const brilloLinea = 0.5 + 0.5 * linea;
  return (
    <g>
      {/* halo */}
      <circle cx={540} cy={yBulbo} r={260 + 20 * Math.sin(t * 2)} fill={p.brillo} opacity={0.12 + 0.1 * cl(alto / 1.5)} />
      <rect x={x0 - 40} y={yTop - 30} width={w + 80} height={yBulbo - yTop + 150} rx={70} fill={p.brillo} opacity={0.05 + 0.08 * cl(alto / 1.5)} />
      <defs>
        <linearGradient id="merc" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#FF2D3D" />
          <stop offset="55%" stopColor="#FF5A1F" />
          <stop offset="100%" stopColor="#FFC21A" />
        </linearGradient>
        <linearGradient id="merc2" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#FF5A1F" />
          <stop offset="100%" stopColor="#FFF1C2" />
        </linearGradient>
        <linearGradient id="vidrio" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fff" stopOpacity={0.28} />
          <stop offset="35%" stopColor="#fff" stopOpacity={0.04} />
          <stop offset="100%" stopColor="#fff" stopOpacity={0.14} />
        </linearGradient>
        <clipPath id="tubo">
          <rect x={x0} y={yTop} width={w} height={yBulbo - yTop} rx={w / 2} />
        </clipPath>
      </defs>
      {/* sombra del suelo */}
      <ellipse cx={540} cy={1255} rx={200} ry={26} fill="#000" opacity={0.45} />
      {/* cuerpo de vidrio */}
      <rect x={x0} y={yTop} width={w} height={yBulbo - yTop + 40} rx={w / 2} fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.35)" strokeWidth={5} />
      <circle cx={540} cy={yBulbo} r={105} fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.35)" strokeWidth={5} />
      {/* mercurio */}
      <circle cx={540} cy={yBulbo} r={88} fill="url(#merc)" />
      <g clipPath="url(#tubo)">
        <rect x={x0 + 14} y={yN} width={w - 28} height={yBulbo - yN + 40} fill="url(#merc)" />
        {nivel2 > nivel ? <rect x={x0 + 14} y={yN2} width={w - 28} height={yN - yN2 + 2} fill="url(#merc2)" /> : null}
      </g>
      {/* marcas */}
      {ticks.map((c, i) => {
        const largo = i % 10 === 0 ? 60 : i % 5 === 0 ? 44 : 24;
        return <line key={i} x1={x0 + w + 16} x2={x0 + w + 16 + largo} y1={yC(c)} y2={yC(c)} stroke="#fff" strokeWidth={i % 5 === 0 ? 5 : 3} opacity={0.5} />;
      })}
      {/* brillo de vidrio */}
      <rect x={x0 + 12} y={yTop + 20} width={14} height={yBulbo - yTop - 40} rx={7} fill="url(#vidrio)" opacity={0.9} />
      <circle cx={512} cy={yBulbo - 30} r={22} fill="#fff" opacity={0.18} />
      {/* raya roja de 1.5 */}
      <g opacity={brilloLinea}>
        <line x1={300} x2={780} y1={yC(1.5)} y2={yC(1.5)} stroke="#FF2D3D" strokeWidth={28} opacity={0.18 * (0.4 + linea)} />
        <line x1={320} x2={760} y1={yC(1.5)} y2={yC(1.5)} stroke="#FF2D3D" strokeWidth={7} strokeDasharray="26 16" />
      </g>
      {/* flechitas: NASA (1.47) y Copernicus (1.6) */}
      {alto > 0.05 ? <polygon points={`${x0 - 20},${yN} ${x0 - 70},${yN - 24} ${x0 - 70},${yN + 24}`} fill={p.acento} /> : null}
      {nivel2 > nivel + 0.02 ? <polygon points={`${x0 + w + 20},${yN2} ${x0 + w + 70},${yN2 - 24} ${x0 + w + 70},${yN2 + 24}`} fill="#FF2D3D" /> : null}
    </g>
  );
};

// ---------- cámara por tomas ----------
type Cam = { t: number; s: number; x: number; y: number };
const camaraEn = (t: number, ks: Cam[]) => {
  let j = 0;
  for (let i = 1; i < ks.length; i++) if (t >= ks[i].t) j = i;
  if (j === 0) return ks[0];
  const a = ks[j - 1]; const b = ks[j];
  const u = suave((t - b.t) / 0.7);
  return { t: b.t, s: lerp(a.s, b.s, u), x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) };
};

// ---------- escenas ----------
const Franja: React.FC<{ t: number; tm: Tm; p: Paleta }> = ({ t, tm, p }) => {
  const a = tm.I('p02'); const b = tm.F('p02');
  const k = suave((t - a) / (b - a - 0.25));
  const N = 90; const x0 = 100; const ancho = 850; const w = ancho / N;
  const frio = [58, 123, 255]; const medio = [235, 235, 245]; const calido = [255, 45, 61];
  const barras = Array.from({ length: N }, (_, i) => {
    const f = i / (N - 1);
    const ruido = (rnd(i + 3) - 0.5) * 0.14;
    const q = cl(f * f * 0.85 + f * 0.15 + ruido);
    const col = q < 0.5 ? mezcla(frio, medio, q / 0.5) : mezcla(medio, calido, (q - 0.5) / 0.5);
    return <rect key={i} x={x0 + i * w} y={520} width={w + 0.6} height={640} fill={rgb(col)} />;
  });
  const frente = x0 + ancho * k;
  const decadas = Array.from({ length: 15 }, (_, i) => x0 + (ancho * i * 10) / 144);
  return (
    <g>
      <rect x={x0 - 14} y={506} width={ancho + 28} height={668} rx={14} fill="#000" opacity={0.5} />
      <clipPath id="rev"><rect x={x0} y={500} width={Math.max(0, frente - x0)} height={700} /></clipPath>
      <g clipPath="url(#rev)">{barras}</g>
      {/* brillo en el borde que avanza */}
      <rect x={frente - 6} y={470} width={12} height={720} fill="#fff" opacity={0.9 * vis(t, a, b, 0.2)} />
      <rect x={frente - 70} y={500} width={70} height={660} fill="#fff" opacity={0.14 * vis(t, a, b, 0.2)} />
      {/* reflejo */}
      <g clipPath="url(#rev)" transform="translate(0 2320) scale(1 -1)" opacity={0.16}>{barras}</g>
      {decadas.map((x, i) => (x <= frente ? <line key={i} x1={x} x2={x} y1={1176} y2={1176 + (i % 5 === 0 ? 40 : 22)} stroke="#fff" strokeWidth={3} opacity={0.5} /> : null))}
      <rect x={x0 - 14} y={506} width={ancho + 28} height={668} rx={14} fill="none" stroke="#fff" strokeWidth={3} opacity={0.2} />
    </g>
  );
};

const Record: React.FC<{ t: number; tm: Tm; p: Paleta }> = ({ t, tm, p }) => {
  const a = tm.W('p03', 'ese'); const b = tm.W('p03', 'mucho');
  const k = sale((t - a) / (b - a + 0.1));
  const base = 1200; const yViejo = 800; const yNuevo = lerp(base, 690, k);
  const pasa = yNuevo < yViejo;
  const brotes = Array.from({ length: 26 }, (_, i) => {
    const u = cl((t - b + 0.1 - rnd(i) * 0.12) / 1.1);
    if (u <= 0 || u >= 1) return null;
    const ang = -Math.PI / 2 + (rnd(i + 5) - 0.5) * 2.2;
    const d = 40 + rnd(i + 9) * 340 * sale(u);
    return <circle key={i} cx={720 + Math.cos(ang) * d} cy={690 + Math.sin(ang) * d + 120 * u * u} r={3 + rnd(i + 2) * 6} fill={i % 2 ? p.acento : '#FF5A1F'} opacity={1 - u} />;
  });
  const onda = cl((t - b) / 1.2);
  return (
    <g>
      {/* suelo */}
      <rect x={120} y={base} width={840} height={10} rx={5} fill="#fff" opacity={0.35} />
      <ellipse cx={540} cy={base + 40} rx={430} ry={22} fill="#000" opacity={0.4} />
      {/* récord anterior */}
      <rect x={300} y={yViejo} width={140} height={base - yViejo} rx={10} fill="#fff" opacity={0.2} />
      <rect x={300} y={yViejo} width={140} height={10} fill="#fff" opacity={0.55} />
      {/* raya del récord */}
      <line x1={140} x2={940} y1={yViejo} y2={yViejo} stroke="#fff" strokeWidth={5} strokeDasharray="22 16" opacity={0.6} />
      <line x1={140} x2={940} y1={yViejo} y2={yViejo} stroke="#FF2D3D" strokeWidth={26} opacity={pasa ? 0.28 : 0} />
      {/* año nuevo */}
      <defs>
        <linearGradient id="col" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#FF2D3D" />
          <stop offset="60%" stopColor="#FF5A1F" />
          <stop offset="100%" stopColor="#FFC21A" />
        </linearGradient>
      </defs>
      <rect x={650} y={yNuevo - 40} width={140} height={base - yNuevo + 40} rx={10} fill={p.brillo} opacity={0.2 * k} />
      <rect x={650} y={yNuevo} width={140} height={base - yNuevo} rx={10} fill="url(#col)" />
      <rect x={650} y={yNuevo} width={140} height={12} fill="#FFF1C2" />
      {onda > 0 && onda < 1 ? <ellipse cx={720} cy={yViejo} rx={60 + 380 * sale(onda)} ry={14 + 40 * sale(onda)} fill="none" stroke={p.acento} strokeWidth={10 * (1 - onda)} opacity={1 - onda} /> : null}
      {brotes}
    </g>
  );
};

const Puntos: React.FC<{ t: number; tm: Tm; p: Paleta }> = ({ t, tm, p }) => {
  const a = tm.I('p07'); const alto = tm.W('p07', 'solo'); const prom = tm.W('p07', 'cuenta');
  const N = 14; const y0 = 940;
  const pts = Array.from({ length: N }, (_, i) => {
    const x = 130 + i * 62;
    const esElAlto = i === 10;
    const y = esElAlto ? lerp(y0, 560, sale((t - alto) / 0.45)) : y0 + (rnd(i + 2) - 0.5) * 70;
    const op = sale((t - (a + i * 0.07)) / 0.2);
    return { x, y, esElAlto, op };
  });
  const kp = sale((t - prom) / 0.8);
  return (
    <g>
      <rect x={110} y={460} width={760} height={660} rx={26} fill="#000" opacity={0.28} />
      {pts.map((q, i) => (
        <g key={i} opacity={q.op}>
          {q.esElAlto ? <circle cx={q.x} cy={q.y} r={46 + 10 * Math.sin(t * 6)} fill="#FF2D3D" opacity={0.25 * sale((t - alto) / 0.3)} /> : null}
          <circle cx={q.x} cy={q.y} r={q.esElAlto ? 26 : 17} fill={q.esElAlto ? '#FF2D3D' : '#FFF1C2'} />
          {q.esElAlto ? <line x1={q.x} x2={q.x} y1={q.y + 30} y2={y0 + 40} stroke="#FF2D3D" strokeWidth={4} strokeDasharray="8 10" opacity={0.6} /> : null}
        </g>
      ))}
      <line x1={110} x2={110 + 760 * kp} y1={y0} y2={y0} stroke={p.acento} strokeWidth={8} />
      <line x1={110} x2={110 + 760 * kp} y1={y0} y2={y0} stroke={p.acento} strokeWidth={30} opacity={0.15} />
    </g>
  );
};

const Promedio: React.FC<{ t: number; tm: Tm; p: Paleta }> = ({ t, tm, p }) => {
  const a = tm.I('p08'); const b = tm.F('p08'); const lle = tm.W('p08', 'llegó');
  const kLlega = sale((t - a) / 0.5);
  const kSube = suave((t - lle) / (b - lle));
  // curva del promedio: sube lento, se queda abajo de la raya roja
  const puntos: string[] = [];
  const N = 40;
  for (let i = 0; i <= N; i++) {
    const f = i / N;
    if (f > kLlega) break;
    puntos.push(`${i ? 'L' : 'M'}${130 + f * 760},${1130 - 360 * f * f - 50 * f}`);
  }
  const fin = Math.min(kLlega, 1);
  const xF = 130 + fin * 760; const yF = 1130 - 360 * fin * fin - 50 * fin;
  const yRaya = 600;
  return (
    <g>
      <line x1={110} x2={950} y1={yRaya} y2={yRaya} stroke="#FF2D3D" strokeWidth={26} opacity={0.2 + 0.1 * Math.sin(t * 5)} />
      <line x1={110} x2={950} y1={yRaya} y2={yRaya} stroke="#FF2D3D" strokeWidth={6} strokeDasharray="26 16" />
      <path d={puntos.join('')} fill="none" stroke={p.acento} strokeWidth={12} strokeLinecap="round" />
      <path d={puntos.join('')} fill="none" stroke={p.acento} strokeWidth={34} strokeLinecap="round" opacity={0.15} />
      {/* el año que ya llegó */}
      <circle cx={870} cy={yRaya + 6} r={30 + 8 * Math.sin(t * 6)} fill="#FF2D3D" opacity={0.3 * kLlega} />
      <circle cx={870} cy={yRaya + 6} r={20} fill="#FF2D3D" opacity={kLlega} />
      {/* el promedio sigue subiendo (punto guía) */}
      <circle cx={xF} cy={yF - 90 * kSube} r={18} fill="#FFF1C2" opacity={kLlega} />
      <line x1={xF} x2={xF} y1={yF - 90 * kSube + 24} y2={yF + 20} stroke="#FFF1C2" strokeWidth={4} strokeDasharray="6 8" opacity={0.5 * kSube} />
    </g>
  );
};

// ---------- el mundo completo ----------
export const Clima: React.FC<{ t: number; tm: Tm; p: Paleta }> = ({ t, tm, p }) => {
  const { I, F, W } = tm;
  // nivel del termómetro
  const rec = W('p01', 'récord');
  let n1 = 0.85 + 0.55 * suave(t / Math.max(0.4, rec));
  const c = tm.cont4;
  if (t >= I('p04')) n1 = 1.47 * sale((t - c.t0) / Math.max(0.3, c.t1 - c.t0));
  if (t >= I('p05')) n1 = 1.47;
  const tremor = t >= c.t1 ? 2.2 * Math.sin(t * 40) * (t < W('p05', 'cinco') ? 1 : 0.4) : 0;
  const seis = W('p06', 'seis');
  const n2 = t >= I('p06') ? lerp(1.47, 1.6, sale((t - W('p06', 'uno')) / Math.max(0.3, seis + 0.25 - W('p06', 'uno')))) : 0;
  const pasada = t >= seis ? cl((t - seis) / 0.6) : 0;
  const lineaPulso = t >= I('p05') ? 0.6 + 0.4 * Math.sin(t * 7) : 0.3;
  const termoVis = Math.max(cl((I('p02') - t) / 0.14), vis(t, I('p04'), I('p07')));
  // cámara del termómetro por tomas
  const cam = camaraEn(t, [
    { t: 0, s: 1.12, x: 540, y: 720 },
    { t: I('p04') - 0.05, s: 1.75, x: 540, y: 620 },
    { t: I('p05') - 0.05, s: 3.3, x: 560, y: 580 },
    { t: I('p06') - 0.05, s: 2.3, x: 520, y: 560 },
  ]);
  const tomaIni = t < I('p02') ? 0 : t < I('p07') ? t - I('p04') : 0;
  const empuje = 1 + 0.02 * Math.max(0, tomaIni);
  const termoT = `translate(540 820) scale(${cam.s * empuje}) translate(${-cam.x} ${-cam.y})`;
  // cámaras de las otras tomas
  const cf = lerp(1.04, 1.16, sale((t - I('p02')) / (F('p02') - I('p02'))));
  const franjaT = `translate(540 820) scale(${cf}) translate(${-540 + 40 * (1 - cl((t - I('p02')) / 2.4))} -840)`;
  const cr = lerp(1.0, 1.22, sale((t - I('p03')) / (F('p03') - I('p03'))));
  const recordT = `translate(540 900) scale(${cr}) rotate(${-2 + 2 * sale((t - I('p03')) / 1.5)}) translate(-540 -900)`;
  const cp = lerp(1.12, 1.0, sale((t - I('p07')) / (F('p07') - I('p07'))));
  const puntosT = `translate(540 800) scale(${cp}) translate(-490 -800)`;
  const cm = lerp(1.0, 1.25, sale((t - I('p08')) / (F('p08') - I('p08'))));
  const promT = `translate(540 860) scale(${cm}) rotate(${1.6 - 1.6 * sale((t - I('p08')) / 3)})translate(-540 -860)`;
  return (
    <>
      <Fondo t={t} tm={tm} p={p} />
      <svg width={W_} height={H_} style={{ position: 'absolute', inset: 0 }}>
        <g opacity={termoVis}>
          <g transform={termoT}>
            <Termometro t={t} p={p} nivel={n1} nivel2={n2} linea={Math.max(lineaPulso, pasada)} vibra={tremor} />
          </g>
        </g>
        <g opacity={vis(t, I('p02'), I('p03'))}><g transform={franjaT}><Franja t={t} tm={tm} p={p} /></g></g>
        <g opacity={vis(t, I('p03'), I('p04'))}><g transform={recordT}><Record t={t} tm={tm} p={p} /></g></g>
        <g opacity={vis(t, I('p07'), I('p08'))}><g transform={puntosT}><Puntos t={t} tm={tm} p={p} /></g></g>
        <g opacity={vis(t, I('p08'), tm.dur + 1)}><g transform={promT}><Promedio t={t} tm={tm} p={p} /></g></g>
        {/* destello cuando Copernicus pasa la raya */}
        {pasada > 0 && pasada < 1 ? <rect width={W_} height={H_} fill="#FF2D3D" opacity={0.28 * (1 - pasada)} /> : null}
      </svg>
    </>
  );
};
