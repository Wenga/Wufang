"""Improve glass silhouettes and tea clarity without changing source geometry."""
from pathlib import Path
import struct,json
root=Path(__file__).resolve().parents[1]
for key in ['guangzhou-tea','shenyang-tea']:
 p=root/'docs/assets/models'/f'{key}.glb'
 b=p.read_bytes();n=struct.unpack_from('<I',b,12)[0];j=json.loads(b[20:20+n]);binary=b[20+n:]
 for m in j['materials']:
  mat=m['pbrMetallicRoughness'];name=m['name']
  if name=='MAT_clear_glass':
   mat['baseColorFactor']=[.55,.64,.63,.28];mat['roughnessFactor']=.11
   m['extensions']={'KHR_materials_clearcoat':{'clearcoatFactor':.45,'clearcoatRoughnessFactor':.12}}
   j.setdefault('extensionsUsed',[])
   if 'KHR_materials_clearcoat' not in j['extensionsUsed']:j['extensionsUsed'].append('KHR_materials_clearcoat')
  elif name=='MAT_golden_tea':
   mat['baseColorFactor']=[.76,.46,.09,.52];mat['roughnessFactor']=.2
  elif name=='MAT_amber_barley_tea':
   mat['baseColorFactor']=[.36,.13,.025,.52];mat['roughnessFactor']=.2
 s=json.dumps(j,separators=(',',':')).encode();s+=b' '*((-len(s))%4)
 p.write_bytes(struct.pack('<III',0x46546c67,2,20+len(s)+len(binary))+struct.pack('<II',len(s),0x4e4f534a)+s+binary)
