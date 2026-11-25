"""Export existing Wufang assets without modifying the source .blend files.
Run with Blender --background --python scripts/export-web-models.py.
"""
import bpy,json,sys
from pathlib import Path
root=Path('/Users/jiaxinwen/.codex/.chatgpt-projects/g-p-695a16c34aac8191a5063572efff9ae8/wufang_3d/output')
out=Path(__file__).resolve().parents[1]/'docs/assets/models'
files={
'guangzhou-dish':'v005/WF_01_har_gow_v005.blend',
'guangzhou-tea':'chrysanthemum_v001/WF_06_chrysanthemum_v001.blend',
'xian-dish':'douhua_v001/WF_02_douhua_v001.blend',
'xian-tea':'fuzhuan_v001/WF_07_fuzhuan_v001.blend',
'nanjing-dish':'duck_v003/WF_03_salted_duck_v003.blend',
'nanjing-tea':'osmanthus_biluochun_v002/WF_09_osmanthus_biluochun_v002.blend',
'puer-dish':'mujiangzi_v001/WF_10_mujiangzi_v001.blend',
'puer-tea':'puer_v001/WF_07_puer_v001.blend',
'shenyang-dish':'frozen_pear_v002/WF_11_frozen_pear_v002.blend',
'shenyang-tea':'barley_tea_v003/WF_12_barley_tea_v003.blend'}
for key,file in files.items():
 if '--' in sys.argv and key not in sys.argv[sys.argv.index('--')+1:]: continue
 bpy.ops.wm.open_mainfile(filepath=str(root/file)); scene=bpy.context.scene; scene.frame_set(1)
 bpy.ops.object.select_all(action='DESELECT')
 objects=[o for o in scene.objects if o.type in {'MESH','CURVE','SURFACE'} and not o.hide_render]
 for o in objects:
  o.hide_set(False); o.select_set(True)
  for mod in o.modifiers:
   if mod.type=='SUBSURF': mod.levels=min(mod.levels,1)
 bpy.context.view_layer.objects.active=objects[0]
 bpy.ops.object.convert(target='MESH')
 # Explicitly retain original UVs for already textured porcelain and duck.
 for o in bpy.context.selected_objects:
  old=o.data.uv_layers.active
  if old: old.name='OriginalUV'
 for mat in bpy.data.materials:
  if not mat.use_nodes: continue
  for node in list(mat.node_tree.nodes):
   if node.type=='TEX_IMAGE' and not node.inputs['Vector'].is_linked:
    uv=mat.node_tree.nodes.new('ShaderNodeUVMap'); uv.uv_map='OriginalUV'
    mat.node_tree.links.new(uv.outputs['UV'],node.inputs['Vector'])
 bpy.ops.object.join(); obj=bpy.context.object; obj.name=key
 obj.animation_data_clear(); world=obj.matrix_world.copy();obj.parent=None;obj.matrix_world=world
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 # Build one shared texture atlas for procedural colors (unsupported by glTF).
 obj.data.uv_layers.new(name='WebUV');obj.data.uv_layers.active_index=len(obj.data.uv_layers)-1
 bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(island_margin=.008);bpy.ops.object.mode_set(mode='OBJECT')
 obj.data.uv_layers['WebUV'].active_render=True
 img=bpy.data.images.new(key+'_color',width=2048,height=2048)
 originals=[]
 for mat in set(s.material for s in obj.material_slots if s.material):
  if not mat.use_nodes: continue
  nodes=mat.node_tree.nodes; links=mat.node_tree.links;bs=next((n for n in nodes if n.type=='BSDF_PRINCIPLED'),None);output=next((n for n in nodes if n.type=='OUTPUT_MATERIAL'),None)
  if not bs or not output: continue
  emit=nodes.new('ShaderNodeEmission');base=bs.inputs['Base Color']; emit.inputs['Color'].default_value=base.default_value
  if base.is_linked: links.new(base.links[0].from_socket,emit.inputs['Color'])
  links.new(emit.outputs[0],output.inputs['Surface'])
  tex=nodes.new('ShaderNodeTexImage');tex.image=img;nodes.active=tex
  originals.append((mat,bs,output,emit,tex))
 scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=1
 scene.render.bake.margin=8;scene.render.bake.use_clear=True
 bpy.ops.object.bake(type='EMIT')
 for mat,bs,output,emit,tex in originals:
  links=mat.node_tree.links;nodes=mat.node_tree.nodes
  links.new(bs.outputs[0],output.inputs['Surface']);nodes.remove(emit)
  uv=nodes.new('ShaderNodeUVMap');uv.uv_map='WebUV';links.new(uv.outputs[0],tex.inputs['Vector']);links.new(tex.outputs['Color'],bs.inputs['Base Color'])
  # Procedural bumps remain in the source; geometry and baked colors are retained.
 img.pack()
 bpy.ops.export_scene.gltf(filepath=str(out/(key+'.glb')),export_format='GLB',use_selection=True,export_animations=False,export_cameras=False,export_lights=False,export_apply=True)
 print('EXPORTED',key,(out/(key+'.glb')).stat().st_size,flush=True)
(out/'sources.json').write_text(json.dumps(files,ensure_ascii=False,indent=2))
