"""Adapt Blender transmission to predictable mobile WebGL alpha rendering.
Run after export-web-models.py. Safe to run repeatedly.
"""
import json,struct
from pathlib import Path
for path in (Path(__file__).resolve().parents[1]/'docs/assets/models').glob('*.glb'):
 b=path.read_bytes();n=struct.unpack_from('<I',b,12)[0];j=json.loads(b[20:20+n]);binary=b[20+n:]
 for mesh in j.get('meshes',[]):
  for p in mesh['primitives']:
   # Vertex colors are already included in the baked base-color atlas.
   p['attributes'].pop('COLOR_0',None)
 for m in j.get('materials',[]):
  name=m.get('name','');pbr=m.setdefault('pbrMetallicRoughness',{});ext=m.get('extensions',{})
  if name=='MAT_clear_glass':
   ext.pop('KHR_materials_transmission',None);ext.pop('KHR_materials_ior',None)
   pbr.pop('baseColorTexture',None);pbr['baseColorFactor']=[.82,.91,.90,.16];pbr['roughnessFactor']=.12;m['alphaMode']='BLEND';m['doubleSided']=False
  elif name in ['MAT_golden_tea','MAT_amber_barley_tea','MAT_golden_green_tea']:
   ext.pop('KHR_materials_transmission',None);ext.pop('KHR_materials_ior',None)
   pbr.pop('baseColorTexture',None);pbr['baseColorFactor']=([.65,.34,.06,.7] if name=='MAT_golden_tea' else [.45,.36,.09,.85] if name=='MAT_golden_green_tea' else [.25,.07,.009,.8]);pbr['roughnessFactor']=.22;m['alphaMode']='BLEND';m['doubleSided']=False
  elif name in ['MAT_wrapper_steamed','MAT_clear_white_flange']:
   ext.pop('KHR_materials_transmission',None);ext.pop('KHR_materials_ior',None);pbr['roughnessFactor']=.42;pbr['baseColorFactor']=[.78,.75,.66,1]
  if not ext:m.pop('extensions',None)
 encoded=json.dumps(j,separators=(',',':')).encode();encoded+=b' '*((-len(encoded))%4)
 path.write_bytes(struct.pack('<III',0x46546c67,2,20+len(encoded)+len(binary))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+binary)
 print(path.name)
