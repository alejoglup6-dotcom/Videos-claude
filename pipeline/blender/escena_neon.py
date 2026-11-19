"""Calle neón nocturna con lluvia, 100 % procedural (sin assets ni marcas). Se ejecuta DENTRO de Blender, sin interfaz:

    blender -b -P blender/escena_neon.py -- --params params.json

params.json (todo opcional salvo "salida"): salida (carpeta de PNG), ancho, alto, fps, duracion (s), semilla, samples, escala (0.1-1, % de resolución),
  camara {tipo, lente_mm, apertura_f}, paleta [#RRGGBB...], niebla (densidad), lluvia (bool), auto (bool), personajes (0-3), gpu (bool),
  primer_cuadro, ultimo_cuadro (para renderizar un tramo), guardar_blend (ruta).
Probado con Blender 4.5 LTS. La API del compositor cambia en 5.x: ver README.
"""
import bpy, bmesh, json, math, random, sys, os
from mathutils import Vector

ESTADO = {}

def argumentos():
    a = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    if len(a) != 2 or a[0] != '--params': sys.exit('Uso: blender -b -P escena_neon.py -- --params params.json')
    return json.load(open(a[1], encoding='utf-8'))

def rgb(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c) + (1.0,)

# ---------- materiales ----------
def _nodos(m):
    m.use_nodes = True; nt = m.node_tree; nt.nodes.clear(); return nt, nt.nodes, nt.links

def mat_emision(nombre, color, fuerza):
    m = bpy.data.materials.new(nombre); nt, n, l = _nodos(m)
    e = n.new('ShaderNodeEmission'); e.inputs['Color'].default_value = color; e.inputs['Strength'].default_value = fuerza
    o = n.new('ShaderNodeOutputMaterial'); l.new(e.outputs[0], o.inputs['Surface']); return m

def mat_principled(nombre, color, rugosidad=0.5, metal=0.0, coat=0.0):
    m = bpy.data.materials.new(nombre); nt, n, l = _nodos(m)
    p = n.new('ShaderNodeBsdfPrincipled'); p.inputs['Base Color'].default_value = color; p.inputs['Roughness'].default_value = rugosidad
    p.inputs['Metallic'].default_value = metal; p.inputs['Coat Weight'].default_value = coat
    o = n.new('ShaderNodeOutputMaterial'); l.new(p.outputs[0], o.inputs['Surface']); return m

def mat_asfalto_mojado():
    """Rugosidad por ruido: charcos casi espejo (0.03) junto a zonas mate (0.55)."""
    m = bpy.data.materials.new('asfalto'); nt, n, l = _nodos(m)
    tc = n.new('ShaderNodeTexCoord'); mp = n.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (0.35, 0.35, 0.35)
    ru = n.new('ShaderNodeTexNoise'); ru.inputs['Scale'].default_value = 1.2; ru.inputs['Detail'].default_value = 6.0
    cr = n.new('ShaderNodeValToRGB'); cr.color_ramp.elements[0].position = 0.42; cr.color_ramp.elements[0].color = (0.03, 0.03, 0.03, 1)
    cr.color_ramp.elements[1].position = 0.58; cr.color_ramp.elements[1].color = (0.6, 0.6, 0.6, 1)
    p = n.new('ShaderNodeBsdfPrincipled'); p.inputs['Base Color'].default_value = (0.012, 0.012, 0.02, 1); p.inputs['Metallic'].default_value = 0.0
    o = n.new('ShaderNodeOutputMaterial')
    l.new(tc.outputs['Object'], mp.inputs['Vector']); l.new(mp.outputs[0], ru.inputs['Vector']); l.new(ru.outputs['Fac'], cr.inputs['Fac'])
    l.new(cr.outputs['Color'], p.inputs['Roughness']); l.new(p.outputs[0], o.inputs['Surface']); return m

def textura_ventanas(nombre, semilla, paleta, cols=6, filas=12):
    """Atlas de ventanas (encendidas con colores de la paleta) dibujado una sola vez como imagen."""
    t = 8; W, H = cols * t, filas * t; rng = random.Random(semilla); px = [0.012, 0.012, 0.02, 1.0] * (W * H)
    for fy in range(filas):
        for fx in range(cols):
            if rng.random() < 0.42: continue
            c = rng.choice(paleta) if rng.random() < 0.7 else (1.0, 0.8, 0.5, 1.0); k = 0.55 + 0.45 * rng.random()
            for y in range(fy * t + 2, fy * t + 6):
                for x in range(fx * t + 1, fx * t + 7):
                    i = (y * W + x) * 4; px[i:i + 4] = [c[0] * k, c[1] * k, c[2] * k, 1.0]
    img = bpy.data.images.new(nombre, W, H, alpha=False); img.pixels.foreach_set(px); img.pack(); return img

def mat_edificio(nombre, img, tile):
    m = bpy.data.materials.new(nombre); nt, n, l = _nodos(m)
    tc = n.new('ShaderNodeTexCoord'); mp = n.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (1 / tile[0], 1 / tile[0], 1 / tile[1])
    it = n.new('ShaderNodeTexImage'); it.image = img; it.interpolation = 'Closest'; it.projection = 'BOX'; it.projection_blend = 0.0
    p = n.new('ShaderNodeBsdfPrincipled'); p.inputs['Roughness'].default_value = 0.35; p.inputs['Metallic'].default_value = 0.2; p.inputs['Emission Strength'].default_value = 2.4
    o = n.new('ShaderNodeOutputMaterial')
    l.new(tc.outputs['Object'], mp.inputs['Vector']); l.new(mp.outputs[0], it.inputs['Vector'])
    l.new(it.outputs['Color'], p.inputs['Base Color']); l.new(it.outputs['Color'], p.inputs['Emission Color']); l.new(p.outputs[0], o.inputs['Surface']); return m

def mat_silueta(neon):
    """Figura oscura con borde de luz (fresnel → emisión): silueta legible sin rostro."""
    m = bpy.data.materials.new('silueta'); nt, n, l = _nodos(m)
    p = n.new('ShaderNodeBsdfPrincipled'); p.inputs['Base Color'].default_value = (0.004, 0.004, 0.008, 1); p.inputs['Roughness'].default_value = 0.6
    lw = n.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = 0.25
    cr = n.new('ShaderNodeValToRGB'); cr.color_ramp.elements[0].position = 0.55; cr.color_ramp.elements[1].position = 0.9
    em = n.new('ShaderNodeEmission'); em.inputs['Strength'].default_value = 7.0; em.inputs['Color'].default_value = neon
    mz = n.new('ShaderNodeAddShader'); o = n.new('ShaderNodeOutputMaterial'); mul = n.new('ShaderNodeMix'); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'; mul.inputs['Factor'].default_value = 1.0
    l.new(lw.outputs['Fresnel'], cr.inputs['Fac']); l.new(cr.outputs['Color'], mul.inputs['A']); mul.inputs['B'].default_value = neon
    l.new(mul.outputs['Result'], em.inputs['Color']); l.new(p.outputs[0], mz.inputs[0]); l.new(em.outputs[0], mz.inputs[1]); l.new(mz.outputs[0], o.inputs['Surface']); return m

# ---------- geometría ----------
def caja(nombre, dim, pos, mat, bisel=0.0, rot=(0, 0, 0)):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0); bmesh.ops.scale(bm, vec=dim, verts=bm.verts)
    me = bpy.data.meshes.new(nombre); bm.to_mesh(me); bm.free(); ob = bpy.data.objects.new(nombre, me)
    ob.location = pos; ob.rotation_euler = rot; ob.data.materials.append(mat); bpy.context.collection.objects.link(ob)
    if bisel: b = ob.modifiers.new('bisel', 'BEVEL'); b.width = bisel; b.segments = 2
    return ob

def cilindro(nombre, radio, alto, pos, mat, rot=(0, 0, 0), vertices=24):
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=vertices, radius1=radio, radius2=radio, depth=alto)
    me = bpy.data.meshes.new(nombre); bm.to_mesh(me); bm.free(); ob = bpy.data.objects.new(nombre, me)
    ob.location = pos; ob.rotation_euler = rot; ob.data.materials.append(mat); bpy.context.collection.objects.link(ob)
    for p in me.polygons: p.use_smooth = True
    return ob

def esfera(nombre, radio, pos, mat, escala=(1, 1, 1)):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=24, v_segments=16, radius=radio)
    me = bpy.data.meshes.new(nombre); bm.to_mesh(me); bm.free(); ob = bpy.data.objects.new(nombre, me)
    ob.location = pos; ob.scale = escala; ob.data.materials.append(mat); bpy.context.collection.objects.link(ob)
    for p in me.polygons: p.use_smooth = True
    return ob

def tubo_neon(nombre, puntos, color, fuerza=18.0, grosor=0.07, cerrado=False):
    cu = bpy.data.curves.new(nombre, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = grosor; cu.bevel_resolution = 3
    sp = cu.splines.new('POLY'); sp.points.add(len(puntos) - 1)
    for p, c in zip(sp.points, puntos): p.co = (c[0], c[1], c[2], 1.0)
    sp.use_cyclic_u = cerrado; ob = bpy.data.objects.new(nombre, cu); ob.data.materials.append(mat_emision(nombre + '_m', color, fuerza)); bpy.context.collection.objects.link(ob); return ob

def luz(nombre, tipo, pos, color, energia, tam=1.0, rot=None):
    d = bpy.data.lights.new(nombre, tipo); d.color = color[:3]; d.energy = energia
    if tipo == 'AREA': d.size = tam
    else: d.shadow_soft_size = tam
    ob = bpy.data.objects.new(nombre, d); ob.location = pos
    if rot: ob.rotation_euler = rot
    bpy.context.collection.objects.link(ob); return ob

# ---------- personajes originales (siluetas estilizadas) ----------
class Caminante:
    def __init__(self, nombre, neon, altura=1.75):
        m = mat_silueta(neon); h = altura; self.raiz = bpy.data.objects.new(nombre, None); bpy.context.collection.objects.link(self.raiz)
        self.partes = {}
        def pieza(k, dim, pos, pivote=None):
            ob = caja(f'{nombre}_{k}', dim, pos, m, bisel=0.03); ob.parent = self.raiz; self.partes[k] = ob; return ob
        pieza('torso', (0.46 * h / 1.75, 0.26 * h / 1.75, 0.62 * h / 1.75), (0, 0, 1.08 * h / 1.75))
        esfera_h = esfera(f'{nombre}_cabeza', 0.115 * h / 1.75, (0, 0, 1.56 * h / 1.75), m, (0.9, 1, 1.1)); esfera_h.parent = self.raiz
        for lado, sx in (('i', -1), ('d', 1)):
            for nom, z0, dim in (('pierna', 0.78, (0.17, 0.18, 0.78)), ('brazo', 1.36, (0.11, 0.11, 0.62))):
                piv = bpy.data.objects.new(f'{nombre}_{nom}_{lado}', None); bpy.context.collection.objects.link(piv); piv.parent = self.raiz
                piv.location = (sx * (0.11 if nom == 'pierna' else 0.29) * h / 1.75, 0, z0 * h / 1.75)
                ob = caja(f'{nombre}_{nom}_{lado}_m', tuple(d * h / 1.75 for d in dim), (0, 0, -dim[2] / 2 * h / 1.75), m, bisel=0.03); ob.parent = piv
                self.partes[f'{nom}_{lado}'] = piv

    def poner(self, pos, rumbo, t, vel=1.3):
        """Ciclo de caminata calculado a partir del tiempo (sin keyframes)."""
        self.raiz.location = pos; self.raiz.rotation_euler = (0, 0, rumbo); f = 1.8 * vel * 2 * math.pi * t / 1.4
        self.partes['pierna_i'].rotation_euler.x = 0.55 * math.sin(f); self.partes['pierna_d'].rotation_euler.x = -0.55 * math.sin(f)
        self.partes['brazo_i'].rotation_euler.x = -0.4 * math.sin(f); self.partes['brazo_d'].rotation_euler.x = 0.4 * math.sin(f)
        self.raiz.location.z = pos[2] + 0.03 * abs(math.sin(f))

# ---------- vehículo original ----------
def crear_auto(color, neon, pos, rumbo):
    pintura = mat_principled('pintura', color, 0.18, 0.6, coat=1.0); vidrio = mat_principled('vidrio', (0.01, 0.015, 0.03, 1), 0.05, 0.0)
    goma = mat_principled('goma', (0.01, 0.01, 0.012, 1), 0.7); raiz = bpy.data.objects.new('auto', None); bpy.context.collection.objects.link(raiz)
    partes = [caja('carroceria', (1.95, 4.4, 0.5), (0, 0, 0.62), pintura, 0.12), caja('cofre', (1.8, 1.7, 0.18), (0, 1.15, 0.9), pintura, 0.08), caja('cabina', (1.55, 1.9, 0.5), (0, -0.25, 1.0), vidrio, 0.18),
              caja('aleron', (1.7, 0.4, 0.07), (0, -2.15, 1.18), pintura, 0.02), caja('faro_i', (0.5, 0.06, 0.1), (-0.62, 2.2, 0.78), mat_emision('faro', (1, 0.95, 0.8, 1), 40)),
              caja('faro_d', (0.5, 0.06, 0.1), (0.62, 2.2, 0.78), mat_emision('faro2', (1, 0.95, 0.8, 1), 40)), caja('luz_t', (1.7, 0.05, 0.08), (0, -2.22, 0.8), mat_emision('trasera', (1, 0.1, 0.2, 1), 30)),
              caja('neon_bajo', (1.85, 4.0, 0.03), (0, 0, 0.2), mat_emision('bajo', neon, 25))]
    for x, y in ((-1, 1.4), (1, 1.4), (-1, -1.4), (1, -1.4)): partes.append(cilindro('rueda', 0.36, 0.28, (x * 0.97, y, 0.36), goma, (0, math.pi / 2, 0)))
    for p in partes: p.parent = raiz
    raiz.location = pos; raiz.rotation_euler = (0, 0, rumbo); return raiz

# ---------- escena ----------
def construir(P):
    rng = random.Random(P.get('semilla', 7)); paleta = [rgb(c) for c in P.get('paleta', ['#FF2E93', '#1FB6FF', '#B07CFF', '#FFB02E'])]
    sc = bpy.context.scene
    # suelo y calle
    suelo = caja('suelo', (400, 400, 0.2), (0, -80, -0.1), mat_asfalto_mojado())
    mat_acera = mat_principled('acera', (0.05, 0.05, 0.08, 1), 0.45)
    for s in (-1, 1): caja('acera', (4.0, 260, 0.3), (s * 8.0, -80, 0.0), mat_acera, 0.05)
    raya = mat_emision('raya', (0.9, 0.85, 0.6, 1), 1.6)
    for k in range(22): caja('raya', (0.18, 2.2, 0.02), (0, 8 - k * 5.5, 0.015), raya)
    # edificios en dos filas + telón de fondo
    imgs = [textura_ventanas(f'vent{i}', 100 + i, paleta) for i in range(4)]
    mats = [mat_edificio(f'edif{i}', imgs[i], (13.2, 36.0)) for i in range(4)]
    for s in (-1, 1):
        z = 14.0
        while z > -150:
            w = rng.uniform(8, 13); h = rng.uniform(26, 85); d = rng.uniform(9, 14)
            caja('edificio', (w, d, h), (s * (10.5 + w / 2 + rng.uniform(0, 1.5)), z - d / 2, h / 2), mats[rng.randrange(4)], 0.12)
            if rng.random() < 0.5:
                c = rng.choice(paleta); x = s * (10.5 + rng.uniform(0, 1)); tubo_neon('borde', [(x, z - 1, 2.0), (x, z - 1, h * 0.8)], c, 14, 0.09)
            z -= d + rng.uniform(0.5, 2.5)
    for i in range(14):
        h = rng.uniform(60, 130); caja('fondo', (rng.uniform(10, 18), 12, h), (-70 + i * 10.5, -165 - rng.uniform(0, 20), h / 2), mats[i % 4])
    # carteles de neón abstractos (sin texto ni marcas) y luces de color que los acompañan
    for i, (x, y, z) in enumerate([(-9.5, -6, 6.5), (9.5, -18, 9), (-9.5, -34, 7), (9.5, -48, 11), (-9.5, -62, 8.5), (9.5, -75, 6.5)]):
        c = paleta[i % len(paleta)]; sx = 1 if x < 0 else -1; w, hh = rng.uniform(2.4, 3.4), rng.uniform(1.0, 1.8)
        tubo_neon(f'cartel{i}', [(x, y - w / 2, z - hh / 2), (x, y + w / 2, z - hh / 2), (x, y + w / 2, z + hh / 2), (x, y - w / 2, z + hh / 2)], c, 20, 0.08, True)
        tubo_neon(f'flecha{i}', [(x, y - w / 3, z), (x, y + w / 3, z), (x, y + w / 6, z + hh / 4)], c, 20, 0.06)
        luz(f'luz_cartel{i}', 'POINT', (x + sx * 1.2, y, z), c, 2500, 0.4)
    # farolas
    for i in range(6):
        for s in (-1, 1):
            x, z = s * 6.2, 4 - i * 20; caja('poste', (0.18, 0.18, 6.5), (x, z, 3.25), mat_principled('poste', (0.02, 0.02, 0.03, 1), 0.5, 0.8))
            caja('lampara', (0.7, 0.35, 0.12), (x - s * 0.45, z, 6.5), mat_emision('lamp', (1.0, 0.82, 0.55, 1), 30))
            if i % 2 == 0: luz('farola', 'POINT', (x - s * 0.45, z, 6.2), (1, 0.8, 0.5, 1), 1200, 0.3)
    # protagonistas del encuadre: auto deportivo y siluetas
    auto = crear_auto(rgb('#161C30'), paleta[1], (2.6, -12, 0), math.radians(200)) if P.get('auto', True) else None
    walkers = [Caminante(f'caminante{i}', paleta[i % len(paleta)], 1.78 - 0.08 * i) for i in range(P.get('personajes', 2))]
    # niebla volumétrica + cielo
    w = bpy.data.worlds.new('mundo'); sc.world = w; w.use_nodes = True; nt = w.node_tree; nt.nodes.clear()
    bg = nt.nodes.new('ShaderNodeBackground'); bg.inputs['Color'].default_value = (0.03, 0.02, 0.07, 1); bg.inputs['Strength'].default_value = 0.25
    vs = nt.nodes.new('ShaderNodeVolumeScatter'); vs.inputs['Color'].default_value = (0.55, 0.45, 0.9, 1); vs.inputs['Density'].default_value = P.get('niebla', 0.007); vs.inputs['Anisotropy'].default_value = 0.35
    ow = nt.nodes.new('ShaderNodeOutputWorld'); nt.links.new(bg.outputs[0], ow.inputs['Surface']); nt.links.new(vs.outputs[0], ow.inputs['Volume'])
    # lluvia
    if P.get('lluvia', True):
        gota = cilindro('gota', 0.02, 0.9, (0, 0, -50), mat_emision('gota', (0.7, 0.85, 1.0, 1), 12.0), vertices=6); gota.hide_render = True
        em = caja('emisor', (36, 60, 0.1), (0, -30, 38), mat_principled('emisor', (0, 0, 0, 1))); em.hide_render = True
        em.modifiers.new('lluvia', 'PARTICLE_SYSTEM'); ps = em.particle_systems[0].settings; ps.count = 2200; ps.frame_start = -90; ps.frame_end = 600; ps.lifetime = 90; ps.lifetime_random = 0.2
        ps.emit_from = 'FACE'; ps.normal_factor = 0.0; ps.physics_type = 'NEWTON'; ps.render_type = 'OBJECT'; ps.instance_object = gota; ps.particle_size = 1.0; ps.size_random = 0.4
        ps.effector_weights.gravity = 3.0; ps.use_rotations = False; ps.use_dynamic_rotation = False
        ESTADO['emisor'] = em
    return auto, walkers, rng

def camara(P, W, H):
    c = P.get('camara', {}); d = bpy.data.cameras.new('cam'); d.lens = c.get('lente_mm', 28); d.sensor_fit = 'HORIZONTAL'; d.sensor_width = 36
    d.dof.use_dof = True; d.dof.aperture_fstop = c.get('apertura_f', 2.8); d.clip_end = 600
    ob = bpy.data.objects.new('cam', d); bpy.context.collection.objects.link(ob); bpy.context.scene.camera = ob
    tg = bpy.data.objects.new('objetivo', None); bpy.context.collection.objects.link(tg); d.dof.focus_object = tg
    tr = ob.constraints.new('TRACK_TO'); tr.target = tg; tr.track_axis = 'TRACK_NEGATIVE_Z'; tr.up_axis = 'UP_Y'
    return ob, tg

def pose_camara(tipo, u, t, ob, tg):
    """Posición de cámara y punto de mira según el tipo y el avance u (0-1) / tiempo t. Sin keyframes: se fija antes de cada cuadro."""
    e = 1 - (1 - u) ** 3; blanco = Vector((1.8, -12, 1.1))
    if tipo == 'dolly_in': ob.location = (0.4, 16 - 11 * e, 1.7); tg.location = Vector((1.5, -14, 1.2))
    elif tipo == 'dolly_out': ob.location = (0.4, 5 + 11 * e, 1.6); tg.location = blanco
    elif tipo == 'orbita':
        a = math.radians(-50 + 100 * u); ob.location = (2.6 + 9.5 * math.sin(a), -12 + 9.5 * math.cos(a), 1.5 + 0.8 * u); tg.location = Vector((2.6, -12, 1.0))
    elif tipo == 'grua': ob.location = (-6 + 3 * u, 11 - 4 * u, 1.2 + 12 * e); tg.location = Vector((1.5, -18, 3 + 1 * u))
    elif tipo == 'travelling': ob.location = (-5 + 10 * u, 5, 1.5); tg.location = Vector((0 + 3 * u, -22, 2.0))
    elif tipo == 'mano_alzada':
        ob.location = (0.5 + 0.06 * math.sin(t * 5.1) + 0.03 * math.sin(t * 11.7), 12 - 4 * u + 0.05 * math.sin(t * 6.3), 1.7 + 0.05 * math.sin(t * 7.7)); tg.location = blanco + Vector((0.12 * math.sin(t * 3.1), 0, 0.08 * math.sin(t * 4.3)))
    else: ob.location = (0.5, 9, 1.6); tg.location = blanco

def configurar_render(P, W, H, fps):
    sc = bpy.context.scene; sc.render.engine = 'CYCLES'; cy = sc.cycles
    sc.render.resolution_x, sc.render.resolution_y = W, H; sc.render.resolution_percentage = int(100 * P.get('escala', 1.0)); sc.render.fps = fps
    cy.samples = P.get('samples', 48); cy.use_adaptive_sampling = True; cy.adaptive_threshold = 0.04; cy.use_denoising = True; cy.denoiser = 'OPENIMAGEDENOISE'
    cy.max_bounces = 6; cy.diffuse_bounces = 2; cy.glossy_bounces = 4; cy.transmission_bounces = 2; cy.volume_bounces = 1; cy.volume_step_rate = 2.0; cy.volume_max_steps = 64
    cy.sample_clamp_indirect = 10.0; cy.caustics_reflective = False; cy.caustics_refractive = False
    sc.render.use_motion_blur = P.get('motion_blur', False)
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_depth = '8'; sc.render.image_settings.compression = 15
    vs = sc.view_settings; vs.view_transform = 'AgX'
    for pref in ('AgX - High Contrast', 'AgX - Punchy'):          # la lista de enum de 'look' no es fiable en 4.5: se prueba la asignación
        try: vs.look = pref; break
        except TypeError: continue
    vs.exposure = P.get('exposicion', -0.7)
    if P.get('gpu'):
        pr = bpy.context.preferences.addons['cycles'].preferences
        for tipo in ('OPTIX', 'CUDA', 'HIP', 'METAL', 'ONEAPI'):
            try:
                pr.compute_device_type = tipo; pr.get_devices()
                gpus = [d for d in pr.devices if d.type != 'CPU']
                if gpus:
                    for d in pr.devices: d.use = d.type != 'CPU'
                    cy.device = 'GPU'; print(f'VIDGEN_GPU {tipo} {[d.name for d in gpus]}'); break
            except Exception: continue
        else: print('VIDGEN_AVISO sin GPU compatible: se usa CPU')
    # compositor: resplandor de neón + ligera dispersión cromática
    sc.use_nodes = True; nt = sc.node_tree; nt.nodes.clear()
    rl = nt.nodes.new('CompositorNodeRLayers'); co = nt.nodes.new('CompositorNodeComposite'); ult = rl.outputs['Image']
    try:
        gl = nt.nodes.new('CompositorNodeGlare'); gl.glare_type = 'FOG_GLOW'; gl.quality = 'MEDIUM'
        gl.inputs['Threshold'].default_value = 0.8; gl.inputs['Strength'].default_value = 0.7; gl.inputs['Size'].default_value = 0.6     # 4.5: son sockets
        nt.links.new(ult, gl.inputs['Image']); ult = gl.outputs['Image']
    except Exception as ex: print('VIDGEN_AVISO glare no disponible:', ex)
    try:
        ld = nt.nodes.new('CompositorNodeLensdist'); ld.inputs['Dispersion'].default_value = 0.012
        nt.links.new(ult, ld.inputs['Image']); ult = ld.outputs['Image']
    except Exception as ex: print('VIDGEN_AVISO distorsión no disponible:', ex)
    nt.links.new(ult, co.inputs['Image'])

def main():
    P = argumentos(); W, H, fps = P.get('ancho', 1080), P.get('alto', 1920), P.get('fps', 30); dur = P.get('duracion', 3.0)
    bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene
    auto, walkers, rng = construir(P); ob, tg = camara(P, W, H); configurar_render(P, W, H, fps)
    n = max(1, round(dur * fps)); a, b = P.get('primer_cuadro', 1), P.get('ultimo_cuadro', n); os.makedirs(P['salida'], exist_ok=True)
    if P.get('guardar_blend'): bpy.ops.wm.save_as_mainfile(filepath=P['guardar_blend'])
    for f in range(-90, 1): sc.frame_set(f)               # precarga de la lluvia (simulación de partículas)
    tipo = P.get('camara', {}).get('tipo', 'dolly_in')
    for f in range(1, b + 1):
        sc.frame_set(f)
        if f < a: continue
        t = (f - 1) / fps; u = (f - 1) / max(1, n - 1)
        pose_camara(tipo, u, t, ob, tg)
        if f == a and 'emisor' in ESTADO:
            eo = ESTADO['emisor'].evaluated_get(bpy.context.evaluated_depsgraph_get()); print('VIDGEN_LLUVIA partículas vivas:', len(eo.particle_systems[0].particles))
        for i, w in enumerate(walkers): w.poner((-4.2 + 8.4 * ((i * 0.37 + 0.2 * t) % 1.0) * 1.0, -6 - 6 * i, 0.15), math.pi / 2 if i % 2 == 0 else -math.pi / 2, t + i)
        sc.render.filepath = os.path.join(P['salida'], f'frame_{f:04d}.png'); bpy.ops.render.render(write_still=True)
        print(f'VIDGEN_CUADRO {f}/{n}', flush=True)
    print('VIDGEN_BLENDER_OK', n)

main()
