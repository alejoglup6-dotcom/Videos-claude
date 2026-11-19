#!/usr/bin/env python3
"""Extrae solo algunas animaciones (sin malla ni texturas) de un GLB, para la biblioteca.
Uso: python3 -I scripts/biblioteca/extraer-animaciones.py <entrada.glb> <salida.glb> <Anim1,Anim2,...>"""
import json, struct, sys, os
ent, sal, nombres = sys.argv[1], sys.argv[2], sys.argv[3].split(',')
b = open(ent, 'rb').read(); lj = struct.unpack('<I', b[12:16])[0]; g = json.loads(b[20:20 + lj]); off = 20 + lj
lb = struct.unpack('<I', b[off:off + 4])[0]; binario = b[off + 8:off + 8 + lb]
anims = [a for a in g['animations'] if a['name'] in nombres]
faltan = set(nombres) - {a['name'] for a in anims}
if faltan: sys.exit('No existen: ' + ', '.join(sorted(faltan)))
nuevo = bytearray(); bvs = []; accs = []; mapa = {}
def acc(i):
    if i in mapa: return mapa[i]
    a = dict(g['accessors'][i]); bv = g['bufferViews'][a['bufferView']]
    n = {'componentType': 5126, 'count': a['count'], 'type': a['type']}
    ancho = {'SCALAR': 1, 'VEC3': 3, 'VEC4': 4}[a['type']] * 4
    ini = bv.get('byteOffset', 0) + a.get('byteOffset', 0); paso = bv.get('byteStride', ancho)
    while len(nuevo) % 4: nuevo.append(0)
    p0 = len(nuevo)
    for k in range(a['count']): nuevo.extend(binario[ini + k * paso: ini + k * paso + ancho])
    bvs.append({'buffer': 0, 'byteOffset': p0, 'byteLength': a['count'] * ancho}); n['bufferView'] = len(bvs) - 1
    if 'min' in a: n['min'] = a['min']; n['max'] = a['max']
    accs.append(n); mapa[i] = len(accs) - 1; return mapa[i]
for an in anims:
    for s in an['samplers']: s['input'] = acc(s['input']); s['output'] = acc(s['output'])
nodos = [{k: v for k, v in n.items() if k not in ('mesh', 'skin')} for n in g['nodes']]
out = {'asset': g['asset'], 'scene': g.get('scene', 0), 'scenes': g['scenes'], 'nodes': nodos, 'animations': anims, 'accessors': accs, 'bufferViews': bvs, 'buffers': [{'byteLength': len(nuevo)}]}
j = json.dumps(out, separators=(',', ':')).encode()
while len(j) % 4: j += b' '
while len(nuevo) % 4: nuevo.append(0)
os.makedirs(os.path.dirname(sal), exist_ok=True)
open(sal, 'wb').write(b'glTF' + struct.pack('<II', 2, 12 + 8 + len(j) + 8 + len(nuevo)) + struct.pack('<I', len(j)) + b'JSON' + j + struct.pack('<I', len(nuevo)) + b'BIN\0' + bytes(nuevo))
print(os.path.basename(sal), len(anims), 'animaciones', round(os.path.getsize(sal) / 1024), 'KB')
