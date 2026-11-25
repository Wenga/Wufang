"""Apply soft-studio material response to the other nine existing web models."""
from pathlib import Path
import json,struct,shutil
root=Path(__file__).resolve().parents[1]
backup=root/'output/atlas/material-backups';backup.mkdir(parents=True,exist_ok=True)
for path in (root/'docs/assets/models').glob('*.glb'):
 if path.stem=='nanjing-dish':continue
 original=backup/(path.stem+'-original.glb')
 if not original.exists():shutil.copy2(path,original)
 b=original.read_bytes();n=struct.unpack_from('<I',b,12)[0];j=json.loads(b[20:20+n]);binary=b[20+n:]
 for m in j['materials']:
  name=m['name'].lower();pbr=m['pbrMetallicRoughness'];rough=pbr.get('roughnessFactor',1)
  if 'glass' in name:rough=.18
  elif 'porcelain' in name:rough=.43
  elif any(s in name for s in ['tea_volume','golden_tea','amber_barley_tea','golden_green_tea','deep_red_brown_puer','broth']):rough=.34
  elif 'pear_skin' in name:rough=.52
  elif 'pear_flesh' in name:rough=.55
  elif 'wrapper' in name or 'flange' in name:rough=.5
  else:rough=max(rough,.48)
  pbr['roughnessFactor']=rough
  coat=m.get('extensions',{}).get('KHR_materials_clearcoat')
  if coat:
   coat['clearcoatFactor']=min(coat.get('clearcoatFactor',0),.08);coat['clearcoatRoughnessFactor']=.4
 s=json.dumps(j,separators=(',',':')).encode();s+=b' '*((-len(s))%4)
 path.write_bytes(struct.pack('<III',0x46546c67,2,20+len(s)+len(binary))+struct.pack('<II',len(s),0x4e4f534a)+s+binary)
 print(path.stem)
