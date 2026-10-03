"""Rebake existing room UVs into isolated, reviewable lightmap candidates.

Blender --background --python this.py -- --source path/room.blend --out path
The source .blend and the published GLB are read only. Float EXRs remain in out.
"""
import argparse, hashlib, json, sys, time
from pathlib import Path
import bpy
import numpy as np
from mathutils import Matrix, Vector

repo = next(parent for parent in Path(__file__).resolve().parents if (parent / 'assets/room/room.glb').is_file())
parser = argparse.ArgumentParser()
parser.add_argument('--source', required=True)
parser.add_argument('--out', required=True)
parser.add_argument('--objects', default='wall_back')
parser.add_argument('--samples', type=int, default=512)
parser.add_argument('--resume', action='store_true')
parser.add_argument('--web-max-size', type=int, default=1024)
parser.add_argument('--encode-only', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
source = Path(args.source).resolve()
out = Path(args.out).resolve()
out.mkdir(parents=True, exist_ok=True)
glb = repo / 'assets/room/room.glb'
manifest_path = out / 'manifest.json' if args.resume and (out / 'manifest.json').exists() else repo / 'assets/room/lightmaps/manifest.json'
manifest = json.loads(manifest_path.read_text())
names = list(manifest) if args.objects == 'all' else args.objects.split(',')
previous = json.loads((out / 'bake-report.json').read_text()) if args.resume and (out / 'bake-report.json').exists() else None
glb_hash = hashlib.sha256(glb.read_bytes()).hexdigest()
source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
if previous and (previous['glbSha256'] != glb_hash or previous['samples'] != args.samples):
    raise ValueError('Candidate geometry or sample settings changed; use a new output directory')
if previous and previous.get('sourceSha256', source_hash) != source_hash:
    raise ValueError('Source scene changed; use a new output directory')
if args.samples < 1 or args.web_max_size < 64:
    parser.error('samples must be positive and web-max-size must be at least 64')
if previous and previous.get('webMaxSize', args.web_max_size) != args.web_max_size and not args.encode_only:
    parser.error('web-max-size changed; first re-encode the completed candidates with --encode-only')
finished = {entry['name'] for entry in previous['textures']} if previous else set()
names = [name for name in names if name not in finished]

def output_settings(comp):
    comp.view_settings.view_transform = 'Standard'
    comp.view_settings.look = 'None'
    comp.view_settings.exposure = 0
    comp.view_settings.gamma = 1
    comp.render.image_settings.file_format = 'JPEG'
    comp.render.image_settings.color_mode = 'RGB'
    comp.render.image_settings.quality = 94

def encode_web(name, clean, comp):
    size = clean.size[0]
    pixels = np.empty(size * size * 4, dtype=np.float32)
    clean.pixels.foreach_get(pixels)
    pixels = pixels.reshape(-1, 4)
    if not np.isfinite(pixels).all():
        raise ValueError(name + ': non-finite irradiance')
    scale = max(1., float(pixels[:, :3].max()))
    pixels[:, :3] = np.maximum(0, pixels[:, :3]) / scale
    encoded = bpy.data.images.new(name + '_web', size, size, alpha=False, float_buffer=True)
    encoded.pixels.foreach_set(pixels.ravel())
    encoded.update()
    web_size = min(size, args.web_max_size)
    if web_size != size:
        encoded.scale(web_size, web_size)
    encoded.save_render(str(out / (name + '.jpg')), scene=comp)
    bpy.data.images.remove(encoded)
    return {'file': name + '.jpg', 'size': web_size, 'bakeSize': size, 'scale': scale}

if args.encode_only:
    if not previous:
        parser.error('--encode-only requires an existing report and --resume')
    output_settings(bpy.context.scene)
    for entry in previous['textures']:
        name = entry['name']
        clean = bpy.data.images.load(str(out / (name + '-clean-0001.exr')), check_existing=False)
        manifest[name] = encode_web(name, clean, bpy.context.scene)
        entry['bytes'] = (out / (name + '.jpg')).stat().st_size
        bpy.data.images.remove(clean)
    previous['blender'] = bpy.app.version_string
    previous['webMaxSize'] = args.web_max_size
    (out / 'manifest.json').write_text(json.dumps(manifest))
    (out / 'bake-report.json').write_text(json.dumps(previous, indent=2))
    print('REENCODED', len(previous['textures']), 'WEB_SIZE_LIMIT', args.web_max_size)
    sys.exit(0)

# Import only to snapshot the exact exported geometry, transforms and UVs.
# This avoids UV drift around bevels when re-unwrapping the original .blend.
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(glb))
bpy.context.view_layer.update()
snapshots = {}
for name in names:
    obj = bpy.data.objects[name]
    data = obj.data
    snapshots[name] = {
        'vertices': [tuple(v.co) for v in data.vertices],
        'faces': [tuple(poly.vertices) for poly in data.polygons],
        'uv': [tuple(loop.uv) for loop in data.uv_layers[1].data],
        'base_uv': [tuple(loop.uv) for loop in data.uv_layers[0].data],
        'normals': [tuple(normal.vector) for normal in data.corner_normals],
        'smooth': [poly.use_smooth for poly in data.polygons],
        'materials': [poly.material_index for poly in data.polygons],
        'matrix': [tuple(row) for row in obj.matrix_world],
    }

bpy.ops.wm.open_mainfile(filepath=str(source))
scene = bpy.context.scene
targets = []
for name, snapshot in snapshots.items():
    obj = bpy.data.objects[name]
    old_bounds = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    materials = list(obj.data.materials)
    data = bpy.data.meshes.new(name + '_exported_bake')
    data.from_pydata(snapshot['vertices'], [], snapshot['faces'])
    for material in materials:
        data.materials.append(material)
    base_uv = data.uv_layers.new(name='UVMap')
    for loop, value in zip(base_uv.data, snapshot['base_uv']):
        loop.uv = value
    base_uv.active_render = True
    uv = data.uv_layers.new(name='LM')
    data.uv_layers.active = uv
    for loop, value in zip(uv.data, snapshot['uv']):
        loop.uv = value
    for poly, smooth, material in zip(data.polygons, snapshot['smooth'], snapshot['materials']):
        poly.use_smooth = smooth
        poly.material_index = material
    data.normals_split_custom_set(snapshot['normals'])
    obj.data = data
    obj.modifiers.clear()
    obj.matrix_world = Matrix(snapshot['matrix'])
    bpy.context.view_layer.update()
    new_bounds = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    error = max(abs(f(points[i] for points in old_bounds) - f(points[i] for points in new_bounds))
                for f in [min, max] for i in range(3))
    if error > .0002:
        raise ValueError(f'{name}: exported geometry bounds changed by {error}')
    targets.append(obj)
    print('EXACT_UV', name, len(snapshot['uv']), 'BOUND_ERROR', error, flush=True)

scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.012, .009, .007, 1)
for obj in bpy.data.objects:
    if obj.type != 'LIGHT':
        continue
    if obj.data.type == 'POINT':
        obj.data.energy = 110
        obj.data.color = (1, .62, .30)
        obj.data.shadow_soft_size = .08
    elif obj.data.type == 'AREA':
        obj.data.energy = 35 if obj.data.size >= 3.5 else 12
        obj.data.color = (1, .72, .48) if obj.data.size >= 3.5 else (1, .76, .55)
for x in [6.1, 3.7]:
    bpy.ops.object.light_add(type='POINT', location=(x, .35, 1.9))
    light = bpy.context.object
    light.data.energy = 45
    light.data.color = (1, .58, .28)
    light.data.shadow_soft_size = .35

scene.render.engine = 'CYCLES'
scene.cycles.samples = args.samples
scene.cycles.use_denoising = False  # Baking does not run the render denoiser.
scene.cycles.use_adaptive_sampling = True
scene.cycles.adaptive_threshold = .01
scene.cycles.adaptive_min_samples = min(64, args.samples)
scene.cycles.max_bounces = 8
scene.cycles.device = 'CPU'
prefs = bpy.context.preferences.addons['cycles'].preferences
backend = 'CPU'
for candidate in ['OPTIX', 'CUDA', 'HIP']:
    try:
        prefs.compute_device_type = candidate
        prefs.get_devices()
        devices = [device for device in prefs.devices if device.type == candidate]
        if devices:
            for device in prefs.devices:
                device.use = device.type == candidate
            scene.cycles.device = 'GPU'
            backend = candidate
            break
    except Exception:
        continue
print('BAKE_BACKEND', backend, flush=True)

comp = bpy.data.scenes.new('Lightmap compositor')
comp.render.engine = 'BLENDER_WORKBENCH'
camera = bpy.data.objects.new('Compositor camera', bpy.data.cameras.new('Compositor camera'))
comp.collection.objects.link(camera)
camera.location = (0, 0, 3)
comp.camera = camera
comp.use_nodes = True
output_settings(comp)
report = {'source': str(source), 'sourceSha256': source_hash, 'glbSha256': glb_hash,
          'blender': bpy.app.version_string, 'samples': args.samples, 'backend': backend, 'webMaxSize': args.web_max_size,
          'textures': previous['textures'] if previous else []}

def activate(obj, image):
    for material in obj.data.materials:
        node = material.node_tree.nodes.get('Candidate lightmap')
        if not node:
            node = material.node_tree.nodes.new('ShaderNodeTexImage')
            node.name = 'Candidate lightmap'
        node.image = image
        material.node_tree.nodes.active = node

for obj in targets:
    started = time.monotonic()
    name = obj.name
    size = manifest[name]['size']
    bpy.context.window.scene = scene
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    raw = bpy.data.images.new(name + '_irradiance', size, size, alpha=False, float_buffer=True)
    activate(obj, raw)
    bpy.ops.object.bake(type='DIFFUSE', pass_filter={'DIRECT', 'INDIRECT'}, uv_layer='LM', margin=16, use_clear=True)
    raw.filepath_raw = str(out / (name + '-raw.exr'))
    raw.file_format = 'OPEN_EXR'
    raw.save()
    normal = bpy.data.images.new(name + '_normal', size, size, alpha=False, float_buffer=True)
    normal.colorspace_settings.name = 'Non-Color'
    activate(obj, normal)
    bpy.ops.object.bake(type='NORMAL', normal_space='OBJECT', uv_layer='LM', margin=16, use_clear=True)
    vectors = np.empty(size * size * 4, dtype=np.float32)
    normal.pixels.foreach_get(vectors)
    vectors = vectors.reshape(-1, 4)
    empty = np.all(vectors[:, :3] == 0, axis=1)
    vectors[:, :3] = vectors[:, :3] * 2 - 1
    vectors[empty, :3] = 0
    normal.pixels.foreach_set(vectors.ravel())
    normal.update()
    nodes = comp.node_tree.nodes
    nodes.clear()
    image = nodes.new('CompositorNodeImage')
    image.image = raw
    guide = nodes.new('CompositorNodeImage')
    guide.image = normal
    denoise = nodes.new('CompositorNodeDenoise')
    denoise.prefilter = 'ACCURATE'
    denoise.use_hdr = True
    comp.node_tree.links.new(image.outputs['Image'], denoise.inputs['Image'])
    comp.node_tree.links.new(guide.outputs['Image'], denoise.inputs['Normal'])
    output = nodes.new('CompositorNodeOutputFile')
    output.base_path = str(out)
    output.file_slots[0].path = name + '-clean-'
    output.format.file_format = 'OPEN_EXR'
    output.format.color_depth = '32'
    comp.node_tree.links.new(denoise.outputs['Image'], output.inputs[0])
    comp.render.resolution_x = size
    comp.render.resolution_y = size
    comp.render.resolution_percentage = 100
    bpy.ops.render.render(scene=comp.name)
    clean = bpy.data.images.load(str(out / (name + '-clean-0001.exr')), check_existing=False)
    # Keep actual HDR illumination in the manifest multiplier. JPEG contains
    # normalized linear RGB, encoded with Standard/sRGB rather than a film look.
    manifest[name] = encode_web(name, clean, comp)
    report['textures'].append({'name': name, 'scale': manifest[name]['scale'], 'seconds': time.monotonic() - started,
                               'bytes': (out / (name + '.jpg')).stat().st_size})
    (out / 'manifest.json').write_text(json.dumps(manifest))
    (out / 'bake-report.json').write_text(json.dumps(report, indent=2))
    print('BAKED_CANDIDATE', report['textures'][-1], flush=True)
    nodes.clear()
    activate(obj, None)
    for image in [raw, normal, clean]:
        bpy.data.images.remove(image)
print('REVIEWABLE_LIGHTMAPS', out, flush=True)
