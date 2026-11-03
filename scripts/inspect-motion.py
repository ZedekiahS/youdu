import bpy, pathlib
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.scene.render.fps=30
bpy.ops.import_scene.gltf(filepath=str(pathlib.Path(__file__).resolve().parents[1]/'tools/desk-break/exercises.glb'))
print('OBJECTS',[(o.name,o.type,tuple(o.dimensions)) for o in bpy.data.objects])
for a in bpy.data.actions:
    if any(s in a.name for s in ['march-in-place','calf-raise','mini-squat','glute-bridge','bird-dog']):print('ACTION',a.name,tuple(a.frame_range),[(s.identifier,s.target_id_type) for s in a.slots])
for o in bpy.data.objects:
    if o.type=='ARMATURE':print('RIG',o.name,[(b.name,tuple(b.head_local)) for b in o.data.bones]);print('NLA',len(o.animation_data.nla_tracks))
