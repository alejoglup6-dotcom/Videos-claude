import React from 'react';
import * as THREE from 'three';
import { lerp } from '../lib/motor';
import { Edificio, Palmera } from '../three/piezas';
import { ease, Brillo, Plano, Caja, Reflejo, Lluvia } from '../three/comunes';
import type { PropsEscena } from '../three/tipos';
import { PersonajeA } from '../three/Personaje';
import type { Ropa } from '../three/Personaje';
import { Auto } from '../three/Vehiculos';
import { Modelo } from '../three/Modelo';
import { Acera, FarolaLib, Letrero } from '../three/Ciudad';
import { Instancias } from '../three/Instancias';
import type { Colocacion } from '../three/Instancias';

// la ropa debe ser un objeto estable (el material se crea una vez por personaje)
const ROPA_H: Ropa = { chaqueta: '#2B2F6B', pantalon: '#17171F', zapatos: '#E9E9EF' };
const ROPA_M: Ropa = { chaqueta: '#F2EEE6', pantalon: '#3A2A66', zapatos: '#FF4FA8' };
const SIN_ASFALTO = /asphalt/i;   // los edificios del kit traen un trozo de calle: se oculta, la calle ya existe
// Piezas opcionales: el guion elige cuáles con config.activar, o el banco de pruebas las alterna con config.secuencia (ver scripts/medir-props.mjs)
const POR_DEFECTO = ['acera-2', 'bolardos-inst', 'jardinera', 'semaforo', 'alto', 'registro', 'paso-peatones', 'farolas-inst', 'edif-small-lite', 'edif-medium-lite'];
const BOLARDOS: Colocacion[] = [1, -1].flatMap((s) => [4.6, -5.5, -17].map((z) => ({ pos: [s * 4.7, 0.1, z] as [number, number, number] })));
const FAROLAS: Colocacion[] = [4, -10, -24, -38].flatMap((z) => [{ pos: [4.9, 0, z] as [number, number, number], escala: 5 }, { pos: [-4.9, 0, z - 7] as [number, number, number], escala: 5, rot: Math.PI }]);

export const CalleSiluetas: React.FC<PropsEscena> = ({ t, u, f, config }) => {
  const e = ease(u); const z0 = -4;
  const W = config?.cuadros ?? 12;
  const act = new Set<string>(config?.secuencia ? config.secuencia[Math.min(config.secuencia.length - 1, Math.floor((f ?? 0) / W))] : (config?.activar ?? POR_DEFECTO)); const on = (n: string) => act.has(n);
  const aceras = Array.from({ length: 14 }, (_, i) => 7.5 - i * 3);
  return (
    <>
      <Plano pos={[0, 0, -40]} tam={[200, 220]} color="#0C0A22" />
      <Plano pos={[0, 0.02, -40]} tam={[9, 220]} color="#14102E" metal={0.7} rough={0.12} />
      {[-3.6, 3.6].map((x, i) => <Caja key={i} pos={[x, 0.05, -40]} tam={[0.16, 0.1, 220]} color={i ? '#FF4FA8' : '#44E6FF'} basico />)}
      <Reflejo x={-2} z={-18} largo={60} color="#FF4FA8" ancho={1.4} op={0.22} /><Reflejo x={2.4} z={-18} largo={60} color="#44E6FF" ancho={1.4} op={0.22} /><Reflejo x={0} z={-14} largo={30} color="#FFE9A0" ancho={3} op={0.12} />
      {/* edificios: dos de la biblioteca cerca de la cámara; el resto, siluetas procedurales baratas */}
      {on('edif-small') ? <Modelo archivo="edificios/Building_Small_1.gltf" pos={[-6.6, 0, -19]} rot={[0, Math.PI / 2, 0]} ocultar={SIN_ASFALTO} /> : null}
      {on('edif-medium') ? <Modelo archivo="edificios/Building_Medium_2_001.gltf" pos={[6.6, 0, -30]} rot={[0, -Math.PI / 2, 0]} ocultar={SIN_ASFALTO} /> : null}
      {on('edif-small-lite') ? <Modelo archivo="edificios/Building_Small_1.gltf" pos={[-6.6, 0, -19]} rot={[0, Math.PI / 2, 0]} ocultar={SIN_ASFALTO} lite /> : null}
      {on('edif-medium-lite') ? <Modelo archivo="edificios/Building_Medium_2_001.gltf" pos={[6.6, 0, -30]} rot={[0, -Math.PI / 2, 0]} ocultar={SIN_ASFALTO} lite /> : null}
      {on('sin-edif-proc') ? null : [-1, 1].map((s) => [2, 3, 4, 5].map((i) => <Edificio key={s + '_' + i} x={s * (11 + (i % 2) * 2)} z={6 - i * 15} w={9} h={14 + ((i * 7) % 5) * 5} d={9} k={i + (s > 0 ? 3 : 0)} neon={i % 2 ? '#FF4FA8' : '#44E6FF'} />))}
      {on('sin-edif-proc') ? null : <><Edificio x={11} z={6} w={9} h={22} d={9} k={4} neon="#FF4FA8" /><Edificio x={-11} z={-24} w={9} h={26} d={9} k={2} neon="#44E6FF" /></>}
      <Letrero txt="LUNA BAR" color="#FF4FA8" pos={[-6.4, 3.2, -4]} rot={0.9} w={2.6} /><Letrero txt="MOTEL" color="#44E6FF" pos={[6.4, 3.4, -14]} rot={-0.9} w={2.8} /><Letrero txt="24 H" color="#FFB02E" pos={[-6.4, 3.8, -34]} rot={0.9} w={2.4} />
      {on('acera-2') ? <><Acera x={-6} z={-40} largo={120} ancho={3} /><Acera x={6} z={-40} largo={120} ancho={3} /></> : null}
      {on('acera-lib') ? aceras.map((z) => <React.Fragment key={z}><Modelo archivo="props/Sidewalk_Straight_3m.gltf" pos={[-6, 0, z]} /><Modelo archivo="props/Sidewalk_Straight_3m.gltf" pos={[6, 0, z]} rot={[0, Math.PI, 0]} /></React.Fragment>) : null}
      {on('paso-peatones') ? <Modelo archivo="props/Decal_Crosswalk.gltf" pos={[0, 0.03, -13]} rot={[0, Math.PI / 2, 0]} escala={[1.7, 1, 1.0]} /> : null}
      {on('bolardos') ? BOLARDOS.map((b, i) => <Modelo key={i} archivo="props/Prop_Bollard.gltf" pos={b.pos} />) : null}
      {on('bolardos-inst') ? <Instancias archivo="props/Prop_Bollard.gltf" colocaciones={BOLARDOS} /> : null}
      {on('jardinera') ? <Modelo archivo="props/Prop_Planter_Single.gltf" pos={[5.8, 0.1, 0.5]} escala={0.9} /> : null}
      {on('semaforo') ? <Modelo archivo="props/TrafficLight_2.glb" pos={[4.9, 0, -13.5]} rot={[0, -Math.PI / 2, 0]} escala={5} /> : null}
      {on('alto') ? <Modelo archivo="props/Sign_Stop.glb" pos={[-4.9, 0, -9.5]} rot={[0, 0.3, 0]} escala={5} /> : null}
      {on('registro') ? <><Modelo archivo="props/Prop_ManholeCover.gltf" pos={[1.4, 0.04, -6]} /><Modelo archivo="props/Prop_Drain.gltf" pos={[-4.1, 0.04, -9]} /></> : null}
      {on('farolas-lib') ? FAROLAS.map((c, i) => <FarolaLib key={i} x={c.pos[0]} z={c.pos[2]} rot={c.rot} />) : null}
      {on('farolas-inst') ? <Instancias archivo="props/Streetlight_Single.glb" colocaciones={FAROLAS} /> : null}
      {on('sin-palmeras') ? null : [-6.5, 6.5].map((x, i) => [10, -12, -26].map((z, j) => <Palmera key={i + '_' + j} x={x} z={z} h={5.2} t={t} i={i * 4 + j} />))}
      <group position={[0.2, 0, z0 - 6]}><Auto modelo="SportsCar2" neon="#FF4FA8" />
        <Brillo pos={[-0.62, 0.64, 2.4]} esc={2.2} color="#FFF3C4" op={0.6} /><Brillo pos={[0.62, 0.64, 2.4]} esc={2.2} color="#FFF3C4" op={0.6} />
      </group>
      <group position={[-0.8, 0, z0 - 3.5 + lerp(0, 1.4, e)]}><PersonajeA genero="h" ropa={ROPA_H} pelo="#2A1C14" barba pose={{ t, paso: 0.55, brazos: 0.0, giro: 0.3 }} /></group>
      <group position={[0.8, 0, z0 - 3.2 + lerp(0, 1.4, e)]}><PersonajeA genero="m" ropa={ROPA_M} pelo="#4A2A1A" pose={{ t: t + 1, paso: 0.55, brazos: 0.0, giro: -0.3 }} /></group>
      {on('sin-lluvia') ? null : <Lluvia t={t} n={40} x={[-12, 12]} z={[-40, 8]} alto={16} vel={22} />}
    </>
  );
};
