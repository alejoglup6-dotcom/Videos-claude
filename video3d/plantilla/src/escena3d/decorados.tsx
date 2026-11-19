// Decorados 3D del video. Cada decorado es un componente que recibe el tiempo global (t), el avance de la toma (u, 0 a 1)
// y el índice de su variante (k). El registro DECORADOS dice qué variantes tiene, su niebla y su cielo.
// En video.config.json cada toma elige "decorado" y, si hace falta, "variante" (p. ej. "torre" + "cima").
import React from 'react';
import { lerp, rnd, sale, cl } from '../motor';
import { Calle, Interior, Datos } from './decoradosGenericos';
import { Vice, Mapa, Persecucion, Atardecer, Fondo } from './decoradosCine';
import { Auto, Ovni, Persona, Skyline, Palmera, Carretera, Sol, Mar, Huevo, Bigfoot, Hedor, Perro, MotoAcuatica, Estela, ArtDeco, Torre, Cipres, CieloTipo, Farolas, Nubes } from './Piezas';

export type PropsDecorado = { t: number; u: number; k: number; datos?: number[] };
// luz = [color, intensidad] de la luz ambiente, del sol y del relleno; si falta, se usa la de ocaso/noche/pantano de Escena.tsx.
export type Luz = { amb: [string, number]; sol: [string, number]; relleno: [string, number] };
export type Decorado = { variantes: string[]; usaDatos?: boolean; niebla: [string, number, number]; cielo: (k: number) => CieloTipo; luz?: Luz; Mundo: React.FC<PropsDecorado> };

const Suelo: React.FC<{ color?: string }> = ({ color = '#160B38' }) => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, -60]} receiveShadow><planeGeometry args={[400, 400]} /><meshStandardMaterial color={color} roughness={0.55} metalness={0.3} /></mesh>
);
const Palmeras: React.FC<{ t: number; zs: number[]; ancho?: number }> = ({ t, zs, ancho = 8 }) => (
  <group>{zs.map((z, i) => <Palmera key={i} x={(i % 2 ? 1 : -1) * (ancho + (i % 3))} z={z} h={4.5 + (i % 3)} t={t} i={i} />)}</group>
);

const Ciudad: React.FC<PropsDecorado> = ({ t, u, k }) => {
  const e = sale(u);
  const ciudad = (ufo: boolean) => (
    <>
      <Sol /><Nubes t={t} /><Suelo /><Skyline semilla={3} z={-62} />
      <Carretera t={t} /><Farolas zs={[-2, -12, -22, -32, -42, -52]} />
      <Palmeras t={t} zs={[4, -6, -16, -26, -36, -46, -58, -70]} />
      <group position={[1.9, 0, 6 - ((t * 9) % 70)]} rotation={[0, Math.PI, 0]}><Auto color="#F2F4FF" neon="#FF4FA8" /></group>
      {ufo ? <group position={[0, 9, -22 + 2 * Math.sin(t * 0.8)]}><Ovni t={t} rayo={1} escala={1.3} /></group> : null}
    </>
  );
  return ciudad(true);
};

const Cierre: React.FC<PropsDecorado> = ({ t, u, k }) => {
  const e = sale(u);
  const ciudad = (ufo: boolean) => (
    <>
      <Sol /><Nubes t={t} /><Suelo /><Skyline semilla={3} z={-62} />
      <Carretera t={t} /><Farolas zs={[-2, -12, -22, -32, -42, -52]} />
      <Palmeras t={t} zs={[4, -6, -16, -26, -36, -46, -58, -70]} />
      <group position={[1.9, 0, 6 - ((t * 9) % 70)]} rotation={[0, Math.PI, 0]}><Auto color="#F2F4FF" neon="#FF4FA8" /></group>
      {ufo ? <group position={[0, 9, -22 + 2 * Math.sin(t * 0.8)]}><Ovni t={t} rayo={1} escala={1.3} /></group> : null}
    </>
  );
  return (
    <>
      {ciudad(false)}
      <group position={[-16, 15, -55]}><Ovni t={t} rayo={0} escala={1.4} /></group>
    </>
  );
};

const Noche: React.FC<PropsDecorado> = ({ t, u, k }) => {
  const e = sale(u);
  const bajada = k === 0 ? lerp(24, 14, e) : k === 1 ? lerp(14, 10.5, e) : 10;
  const hay = k < 3;
  const alza = k === 2 ? 5.2 * e : k < 2 ? 0 : 0;
  return (
    <>
      <Suelo color="#0C0830" />
      <Skyline semilla={9} z={-90} ancho={160} n={26} alto={20} />
      <Carretera t={k === 2 ? t * 0.1 : t * 0.3} color="#44E6FF" />
      <Palmeras t={t} zs={[6, -4, -14, -24, -34, -48]} />
      <group position={[-3.7, 0, -1.5]} rotation={[0, 2.9, 0]}><Auto color="#B07CFF" neon="#B07CFF" /></group>
      {k < 3 ? (
        <group position={[0, alza, -3]} rotation={[0, k === 1 ? Math.PI : 0.3, k === 2 ? 0.2 * Math.sin(t * 4) : 0]}>
          <Persona t={t} camisa="#44E6FF" brazos={k === 2 ? 0.45 : k === 1 ? 0.08 : 0} mira={k === 1 ? 0.6 : 0.1} />
        </group>
      ) : (
        <group position={[0, 0.25, -3]} rotation={[-1.45, 0.3, 0]}><Persona t={t} camisa="#44E6FF" brazos={0.4 * Math.sin(t * 3) ** 2} mira={0.2} /></group>
      )}
      {hay ? <group position={[0, bajada, -9]}><Ovni t={t} rayo={k === 0 ? e * 0.4 : 1} escala={1.4} /></group> : null}
      <mesh position={[-22, 40, -140]}><sphereGeometry args={[5, 20, 16]} /><meshBasicMaterial color="#F2EEFF" fog={false} /></mesh>
      {k === 3 ? <Sol x={0} y={6} z={-150} r={16} /> : null}
    </>
  );
};

const Torre3D: React.FC<PropsDecorado> = ({ t, u, k }) => {
  const e = sale(u);
  const huevoVuelo = k === 2 ? { x: lerp(0, 9, u), y: 20.7 + 6 * u - 14 * u * u, z: lerp(-6, -3, u) } : null;
  const caida = k === 3 ? { y: lerp(14, 2.3, u * u) } : null;
  return (
    <>
      <Sol /><Suelo /><Skyline semilla={5} z={-75} ancho={150} />
      <Palmeras t={t} zs={[10, 2, -8, -20]} ancho={9} />
      <group position={[0, 0, -6]}><Torre t={t} /></group>
      {k !== 0 && k !== 3 ? (
        <group position={[1.7, 20.25, -5.2]} rotation={[0, -0.6, 0]}><Persona t={t} camisa="#FF4FA8" brazos={k === 2 ? 0.5 + 0.35 * sale(u * 3) : 0} mira={0.1} /></group>
      ) : null}
      {huevoVuelo ? <group position={[huevoVuelo.x, huevoVuelo.y, huevoVuelo.z]} rotation={[t * 8, 0, t * 5]}><Huevo color="#FFE86A" s={1.6} /></group> : null}
      {k === 3 ? (
        <>
          <group position={[2, 0, 4]} rotation={[0, 0.15, 0]}><Persona t={t} camisa="#7CFF3A" mira={u > 0.6 ? 0.9 : 0.1} brazos={u > 0.75 ? 0.35 : 0} /></group>
          {u < 0.72 ? <group position={[2, caida!.y + 1.3, 4]} rotation={[t * 8, 0, 0]}><Huevo color="#FF4FA8" s={2.2} /></group> : null}
          {u >= 0.72 ? Array.from({ length: 16 }, (_, i) => { const w = cl((u - 0.72) / 0.28); const a = i * 0.95; return <mesh key={i} position={[2 + Math.cos(a) * 0.9 * w, 2.9 + Math.sin(a * 2) * 0.4 * w - 0.5 * w * w, 4 + Math.sin(a) * 0.9 * w]} scale={0.8 * (1 - w * 0.6)}><sphereGeometry args={[0.14, 8, 8]} /><meshBasicMaterial color={i % 2 ? '#FFE86A' : '#FF4FA8'} /></mesh>; }) : null}
        </>
      ) : null}
    </>
  );
};

const Pantano: React.FC<PropsDecorado> = ({ t, u, k }) => {
  const e = sale(u);
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -20]}><planeGeometry args={[200, 200]} /><meshStandardMaterial color="#10301F" roughness={0.15} metalness={0.5} /></mesh>
      {[[-6, -2], [7, -4], [-9, -12], [10, -14], [-4, -22], [5, -24], [-13, -6], [13, -8]].map((c, i) => <Cipres key={i} x={c[0]} z={c[1]} h={6 + (i % 3) * 1.5} i={i} />)}
      <group position={[0, 0, -6]}><Bigfoot t={t} asoma={k === 0 ? lerp(0.55, 1, e) : 1} /></group>
      <group position={[0, 0, -6]}><Hedor t={t} k={k === 1 ? 1.8 : 1} /></group>
      <pointLight position={[0, 5, 2]} color="#B8FF6A" intensity={k === 1 ? 14 : 7} distance={14} />
      <pointLight position={[0, 3, 4]} color="#7CFF3A" intensity={3} distance={9} />
    </>
  );
};

const Bahia: React.FC<PropsDecorado> = ({ t, u, k }) => {
  const e = sale(u);
  const x = lerp(-11, 12, u);
  return (
    <>
      <Sol y={10} /><Mar t={t} color="#2A0E5A" />
      <Skyline semilla={13} z={-110} ancho={170} n={20} />
      <group position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <MotoAcuatica t={t} color="#FF4FA8" /><group position={[0, 0.3, 0.15]}><Perro t={t} /></group><Estela t={t} />
      </group>
      <group position={[x - 4, 0, 0.1]} />
      {Array.from({ length: 12 }, (_, i) => <mesh key={i} position={[x - 1.5 - i * 0.6, 0.12, (rnd(i) - 0.5) * (0.5 + i * 0.25)]} scale={0.5 + i * 0.12}><sphereGeometry args={[0.22, 8, 6]} /><meshBasicMaterial color="#FFFFFF" transparent opacity={0.55 * (1 - i / 14)} depthWrite={false} /></mesh>)}
      <pointLight position={[x, 3, 4]} color="#FFD0A0" intensity={14} distance={14} />
    </>
  );
};

const Apto: React.FC<PropsDecorado> = ({ t, u, k }) => {
  const e = sale(u);
  return (
    <>
      <Sol /><Suelo color="#1A0E40" /><Skyline semilla={21} z={-70} ancho={140} />
      <group position={[0, 0, -8]} rotation={[0, k === 2 ? 0.0 : 0, 0]}><ArtDeco t={t} /></group>
      <Palmeras t={t} zs={[0, -4, -10, -18]} ancho={7} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0, -2]}><planeGeometry args={[30, 8]} /><meshStandardMaterial color="#2A1A60" roughness={0.4} metalness={0.3} /></mesh>
    </>
  );
};

export const DECORADOS: Record<string, Decorado> = {
  ciudad: { variantes: [], niebla: ['#7A2A8A', 25, 140], cielo: () => 'ocaso', Mundo: Ciudad },
  noche: { variantes: ['llega', 'cerca', 'sube', 'alba'], niebla: ['#0A0A3A', 18, 120], cielo: (k) => (k === 3 ? 'alba' : 'noche'), Mundo: Noche },
  torre: { variantes: ['base', 'cima', 'lanza', 'splat'], niebla: ['#7A2A8A', 25, 140], cielo: () => 'ocaso', Mundo: Torre3D },
  pantano: { variantes: ['asoma', 'huele'], niebla: ['#2F4A2A', 8, 42], cielo: () => 'pantano', Mundo: Pantano },
  bahia: { variantes: [], niebla: ['#8A2A7A', 25, 150], cielo: () => 'ocaso', Mundo: Bahia },
  apto: { variantes: [], niebla: ['#8A3A8A', 28, 150], cielo: () => 'ocaso', Mundo: Apto },
  cierre: { variantes: [], niebla: ['#6A2088', 25, 140], cielo: () => 'ocaso', Mundo: Cierre },
  // genéricos (decoradosGenericos.tsx)
  calle: { variantes: ['avenida', 'plaza', 'esquina'], niebla: ['#CFE6FA', 45, 180], cielo: () => 'dia', luz: { amb: ['#FFFFFF', 1.0], sol: ['#FFF1D0', 2.4], relleno: ['#BFD8FF', 0.9] }, Mundo: Calle },
  interior: { variantes: ['mesa', 'ventana', 'estante'], niebla: ['#EBDCC8', 40, 120], cielo: () => 'dia', luz: { amb: ['#FFE9CC', 1.0], sol: ['#FFF0DA', 1.7], relleno: ['#FFD9A8', 0.9] }, Mundo: Interior },
  // cinemáticos (decoradosCine.tsx)
  vice: { variantes: ['aerea', 'calle', 'playa'], niebla: ['#12082E', 30, 170], cielo: () => 'noche', luz: { amb: ['#7A5AFF', 0.7], sol: ['#8AA0FF', 1.2], relleno: ['#FF4FA8', 1.3] }, Mundo: Vice },
  mapa: { variantes: ['costa', 'ciudad', 'pantano', 'carreteras'], niebla: ['#070B26', 45, 130], cielo: () => 'estudio', luz: { amb: ['#9AA8FF', 1.0], sol: ['#FFFFFF', 1.5], relleno: ['#FF4FA8', 0.8] }, Mundo: Mapa },
  persecucion: { variantes: ['detras', 'lateral', 'giro'], niebla: ['#12082E', 25, 160], cielo: () => 'noche', luz: { amb: ['#7A5AFF', 0.7], sol: ['#8AA0FF', 1.0], relleno: ['#FF4FA8', 1.1] }, Mundo: Persecucion },
  atardecer: { variantes: ['orbita', 'helicoptero', 'costa'], niebla: ['#8A2A7A', 60, 260], cielo: () => 'ocaso', Mundo: Atardecer },
  fondo: { variantes: ['particulas', 'negro'], niebla: ['#000000', 30, 120], cielo: () => 'negro', luz: { amb: ['#FFFFFF', 0.6], sol: ['#B07CFF', 0.6], relleno: ['#FF4FA8', 0.6] }, Mundo: Fondo },
  datos: { variantes: ['barras', 'cifra', 'ascenso'], usaDatos: true, niebla: ['#0B1030', 30, 110], cielo: () => 'estudio', luz: { amb: ['#9AA8FF', 0.9], sol: ['#FFFFFF', 1.6], relleno: ['#FF4FA8', 0.8] }, Mundo: Datos },
};
