#!/usr/bin/env python3
"""Importa piezas elegidas del «Downtown City MegaKit» (Quaternius, CC0) a public/modelos/, reduciendo las texturas.
Uso: python3 -I scripts/biblioteca/importar-downtown.py <carpeta glTF (Godot)> <carpeta Textures>
Color base y ORM -> JPG 1024; normales -> PNG 512; con transparencia -> PNG 1024."""
import json, os, shutil, sys
from PIL import Image
ent, texdir = sys.argv[1], sys.argv[2]
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(RAIZ, 'public', 'modelos'); TEX = os.path.join(OUT, 'texturas', 'downtown'); os.makedirs(TEX, exist_ok=True)
EDIF = ['Building_Small_1', 'Building_Medium_2_001']
PROPS = ['Prop_ACUnit', 'Prop_Bollard', 'Prop_Drain', 'Prop_ManholeCover', 'Prop_Planter_Single', 'Sidewalk_Straight_3m', 'Sidewalk_Corner_Round_3m', 'Sidewalk_NoCurb_3m', 'Street_2Lane', 'Decal_Crosswalk']
hechas = {}
def textura(nombre):
    if nombre in hechas: return hechas[nombre]
    src = os.path.join(ent, nombre) if os.path.exists(os.path.join(ent, nombre)) else os.path.join(texdir, nombre)
    im = Image.open(src); base = os.path.splitext(nombre)[0]; es_normal = 'Normal' in nombre
    alfa = im.mode in ('RGBA', 'LA') and im.getchannel('A').getextrema()[0] < 250
    lado = 512 if es_normal else 1024
    if max(im.size) > lado: im = im.resize((lado, lado), Image.LANCZOS)
    if alfa: dst = base + '.png'; im.save(os.path.join(TEX, dst), optimize=True)
    elif es_normal: dst = base + '.png'; im.convert('RGB').save(os.path.join(TEX, dst), optimize=True)
    else: dst = base + '.jpg'; im.convert('RGB').save(os.path.join(TEX, dst), quality=85, optimize=True)
    hechas[nombre] = '../texturas/downtown/' + dst; return hechas[nombre]
for carpeta, lista in (('edificios', EDIF), ('props', PROPS)):
    os.makedirs(os.path.join(OUT, carpeta), exist_ok=True)
    for n in lista:
        g = json.load(open(os.path.join(ent, n + '.gltf')))
        for i in g.get('images', []): i['uri'] = textura(i['uri'])
        shutil.copy(os.path.join(ent, n + '.bin'), os.path.join(OUT, carpeta, n + '.bin'))
        json.dump(g, open(os.path.join(OUT, carpeta, n + '.gltf'), 'w'), separators=(',', ':'))
print('texturas:', len(hechas), 'peso MB:', round(sum(os.path.getsize(os.path.join(TEX, f)) for f in os.listdir(TEX)) / 1e6, 2))
