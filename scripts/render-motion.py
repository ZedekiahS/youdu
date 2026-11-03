"""blender -b -t 4 --python scripts/render-motion.py -- march-in-place mini-squat
Offline only. Loads a pinned GLB, never modifies the animation timing or poses.
"""
import bpy, pathlib, json, sys, math, hashlib
from mathutils import Vector
ROOT=pathlib.Path(__file__).resolve().parents[1]
SRC=ROOT/'tools/desk-break'
OUT=ROOT/'public/motion/deskbreak-8d475aa-grey-v1'
OUT.mkdir(parents=True,exist_ok=True)
source=json.loads((SRC/'source.json').read_text())
for name,digest in source['files'].items():
    assert hashlib.sha256((SRC/pathlib.Path(name).name).read_bytes()).hexdigest()==digest,name
catalog={e['id']:e for e in json.loads((SRC/'exercises.json').read_text(encoding='utf-8'))['exercises']}
clips=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['march-in-place','mini-squat','glute-bridge','bird-dog','calf-raise']
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene
scene.render.fps=30
bpy.ops.import_scene.gltf(filepath=str(SRC/'exercises.glb'))
rig=next(o for o in bpy.data.objects if o.type=='ARMATURE')
body=bpy.data.objects['mannequin']
for o in list(bpy.data.objects):
    if o not in [body,rig]:bpy.data.objects.remove(o,do_unlink=True)
for track in rig.animation_data.nla_tracks:track.mute=True
scene.render.engine='BLENDER_WORKBENCH'
scene.render.resolution_x=640;scene.render.resolution_y=640;scene.render.resolution_percentage=100
scene.display.shading.light='STUDIO';scene.display.shading.studiolight_rotate_z=0.4
scene.display.shading.color_type='OBJECT';scene.display.shading.show_shadows=True
scene.display.shading.show_cavity=True;scene.display.shading.cavity_type='BOTH'
scene.display.shading.show_specular_highlight=False
scene.display.shading.background_type='WORLD';scene.world=bpy.data.worlds.new('Soft studio')
scene.world.color=(0.88,0.89,0.87);scene.render.film_transparent=False
scene.view_settings.view_transform='Standard'
body.color=(0.42,0.44,0.45,1)
for mat in body.data.materials:
    if mat:mat.diffuse_color=(0.42,0.44,0.45,1)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-0.025));floor=bpy.context.object;floor.color=(0.87,0.88,0.86,1)
bpy.ops.object.camera_add();camera=bpy.context.object;scene.camera=camera;camera.data.type='ORTHO';camera.data.lens=50
manifest={}
for clip_id in clips:
    e=catalog[clip_id];action=bpy.data.actions.get(clip_id)
    assert action is not None,clip_id
    rig.animation_data.action=action;rig.animation_data.action_slot=action.slots[0]
    # Each loop includes all original samples except the duplicate closing pose.
    first,last=map(round,action.frame_range);scene.frame_start=first;scene.frame_end=last-1
    props=[]
    if clip_id=='calf-raise':
        scene.frame_set(first)
        hands=[rig.matrix_world@rig.pose.bones[n].head for n in ['handL','handR']]
        print('CALF_HANDS',[(tuple(p)) for p in hands],flush=True)
        center=(hands[0]+hands[1])/2;z=center.z
        across=hands[0]-hands[1];across.z=0;across.normalize()
        forward=Vector((center.x,center.y,0)).normalized()
        # Align the support to the actual hand positions, including root rotation.
        angle=math.atan2(across.y,across.x)
        def cube(name,loc,scale):
            pos=center+across*loc[0]+forward*loc[1];pos.z=loc[2]
            bpy.ops.mesh.primitive_cube_add(size=1,location=pos);o=bpy.context.object;o.name=name;o.scale=scale;o.rotation_euler.z=angle;o.color=(0.72,0.75,0.71,1);props.append(o)
        cube('chair-back',(0,0,z-0.06),(0.6,0.08,0.12))
        cube('chair-seat',(0,0.23,0.45),(0.5,0.5,0.04))
        for x in [-0.22,0.22]:
            cube('chair-back-post',(x,0,z/2),(0.035,0.035,z))
            cube('chair-front-leg',(x,0.44,0.22),(0.035,0.035,0.44))
    points=[]
    for frame in range(first,last+1,3):
        scene.frame_set(frame);deps=bpy.context.evaluated_depsgraph_get();obj=body.evaluated_get(deps)
        points.extend(obj.matrix_world@v.co for v in obj.data.vertices)
    low=Vector(tuple(min(p[i] for p in points) for i in range(3)));high=Vector(tuple(max(p[i] for p in points) for i in range(3)))
    target=(low+high)/2
    direction=Vector((3.8,-5.8,2.2)) if e.get('view')!='floor' else Vector((4.5,-5.0,3.6))
    if clip_id in ['mini-squat','calf-raise']:direction=Vector((5,-4,1.8))
    camera.location=target+direction;camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
    inv=camera.matrix_world.inverted() if False else camera.rotation_euler.to_matrix().transposed()
    projected=[inv@(p-target) for p in points]
    span=max(max(p[i] for p in projected)-min(p[i] for p in projected) for i in [0,1])
    camera.data.ortho_scale=max(2.0,span*1.28)
    if props:camera.data.ortho_scale=max(camera.data.ortho_scale,2.5)
    scene.render.image_settings.file_format='PNG'
    keys=sorted(set([0,*e.get('keyTimes',[]),max(0,e['duration']-1/30)]))
    for idx,t in enumerate(keys):
        scene.frame_set(min(last-1,first+round(t*30)));scene.render.filepath=str(OUT/f'{clip_id}-key-{idx}.png');bpy.ops.render.render(write_still=True)
    poster=OUT/f'{clip_id}-poster.png';poster.write_bytes((OUT/f'{clip_id}-key-0.png').read_bytes())
    scene.render.image_settings.file_format='FFMPEG';scene.render.ffmpeg.format='MPEG4';scene.render.ffmpeg.codec='H264';scene.render.ffmpeg.constant_rate_factor='MEDIUM';scene.render.ffmpeg.ffmpeg_preset='GOOD';scene.render.ffmpeg.audio_codec='NONE'
    scene.render.filepath=str(OUT/f'{clip_id}.mp4');bpy.ops.render.render(animation=True)
    manifest[clip_id]={'clipId':clip_id,'mediaVersion':OUT.name,'duration':(last-first)/30,'fps':30,'frames':last-first,'keyTimes':keys,'bounds':{'min':list(low),'max':list(high)},'files':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in OUT.glob(clip_id+'*') if p.suffix!='.json'},'sourceCommit':source['commit'],'renderTool':bpy.app.version_string}
    (OUT/f'{clip_id}.json').write_text(json.dumps(manifest[clip_id],indent=2))
    for o in props:bpy.data.objects.remove(o,do_unlink=True)
    print('COMPLETE',clip_id,flush=True)

# Keep the frontend manifest in sync with every re-render, including changed hashes.
mapping_path=ROOT/'src/motion.json'
mapping=json.loads(mapping_path.read_text(encoding='utf-8')) if mapping_path.exists() else {}
for entry in json.loads((ROOT/'src/motion-exercises.json').read_text(encoding='utf-8')):
    clip=entry.get('clipId') or mapping.get(entry['id'],{}).get('clipId')
    if clip in manifest: mapping[entry['id']]=manifest[clip]
mapping_path.write_text(json.dumps(mapping,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
