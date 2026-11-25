"""Refine only the web duck materials; preserve original geometry and baked color."""
from pathlib import Path
import json,struct,math
root=Path(__file__).resolve().parents[1]
p=root/'docs/assets/models/nanjing-dish.glb'
b=p.read_bytes();n=struct.unpack_from('<I',b,12)[0];j=json.loads(b[20:20+n]);binary=b[20+n:]
for m in j['materials']:
 name=m['name'];mat=m['pbrMetallicRoughness']
 # The exporter incorrectly emitted the source color photograph as a tangent normal.
 m.pop('normalTexture',None)
 if name=='MAT_black_glazed_plate':mat['roughnessFactor']=.68
 elif name in ['MAT_cooked_duck_meat','MAT_leg_cross_section','MAT_duck_side_fibers']:mat['roughnessFactor']=.72
 elif name=='MAT_pale_salted_duck_skin':
  mat['roughnessFactor']=.57;mat['baseColorFactor']=[.94,.97,1,1]
 else:mat['roughnessFactor']=.6
 m.pop('extensions',None)
s=json.dumps(j,separators=(',',':')).encode();s+=b' '*((-len(s))%4)
p.write_bytes(struct.pack('<III',0x46546c67,2,20+len(s)+len(binary))+struct.pack('<II',len(s),0x4e4f534a)+s+binary)
# Broad neutral studio illumination; no bright rectangular hotspots.
w,h=512,256;pixels=bytearray()
for y in range(h):
 lat=math.pi*(.5-(y+.5)/h)
 for x in range(w):
  lon=2*math.pi*((x+.5)/w-.5)
  def light(center,width,alt,height):
   d=math.atan2(math.sin(lon-center),math.cos(lon-center))
   return math.exp(-.5*((d/width)**2+((lat-alt)/height)**2))
  power=.22+.15*max(0,math.sin(lat))+2.4*light(-.8,.7,.65,.45)+.45*light(2.1,1,.3,.7)
  r,g,bl=power*1.01,power,power*.98
  mant,exp=math.frexp(max(r,g,bl));scale=mant*256/max(r,g,bl)
  pixels.extend([int(r*scale),int(g*scale),int(bl*scale),exp+128])
(root/'docs/assets/soft-studio.hdr').write_bytes(b'#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y 256 +X 512\n'+pixels)
