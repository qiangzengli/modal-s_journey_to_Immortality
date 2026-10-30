"""Bake tracked face meshes/textures from landmark JSON + portraits. No runtime ML dependency.
Input folder: <id>.source.png, <id>.landmarks.json (MediaPipe FaceLandmarker xyz).
Usage: python scripts/bake-character-faces.py --input /path/to/landmarks
"""
import argparse,json
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
import cv2
parser=argparse.ArgumentParser();parser.add_argument('--input',type=Path,required=True);args=parser.parse_args()
root=Path(__file__).resolve().parents[1];out=root/'game/assets/characters';out.mkdir(parents=True,exist_ok=True)
canonical=[];indices=[]
for line in (root/'scripts/face-topology.obj').read_text().splitlines():
 if line.startswith('v '):canonical.append([float(v) for v in line.split()[1:]])
 if line.startswith('f '):indices.extend([int(v.split('/')[0])-1 for v in line.split()[1:]])
canonical=np.asarray(canonical);canonical-=canonical.mean(axis=0)
# Fill the eye and mouth openings with UV-mapped surfaces. Eyelids/lips retain their 3D contours.
loops=[[33,7,163,144,145,153,154,155,133,173,157,158,159,160,161,246],[263,249,390,373,374,380,381,382,362,398,384,385,386,387,388,466],[78,95,88,178,87,14,317,402,318,324,308,415,310,311,312,13,82,81,80,191]]
boundary=[10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109]
faces={}
for path in sorted(args.input.glob('*.landmarks.json')):
 name=path.name.split('.')[0];image=Image.open(args.input/(name+'.source.png')).convert('RGB');w,h=image.size
 lm=np.asarray(json.loads(path.read_text()))[:468];pixels=lm[:,:2]*[w,h]
 points=lm*np.array([w,-h,-w]);points-=points.mean(axis=0)
 u,_,vt=np.linalg.svd(points.T@canonical);rotation=u@vt
 if np.linalg.det(rotation)<0:u[:,-1]*=-1;rotation=u@vt
 points=points@rotation
 # Bilateral averaging reduces perspective distortion in three-quarter reference frames.
 mirror=canonical.copy();mirror[:,0]*=-1
 mates=np.argmin(((mirror[:,None,:]-canonical[None,:,:])**2).sum(axis=2),axis=1)
 reflected=points[mates].copy();reflected[:,0]*=-1
 points=(points+reflected)*.5 if name in ['hanli','nangong'] else points*.4+reflected*.6
 points*= (.39 if name in ['nangong','mocaihuan'] else .405)/(points[10,1]-points[152,1])
 points[:,1]-=(points[10,1]+points[152,1])/2
 points[:,2]-=(points[234,2]+points[454,2])/2-.012
 points[:,2]*=.55
 # Nose remains genuinely raised and the jaw stays on the full head's silhouette.
 mn=pixels.min(axis=0)-8;mx=pixels.max(axis=0)+8
 box=(int(mn[0]),int(mn[1]),int(mx[0]),int(mx[1]));crop=image.crop(box)
 samples=[]
 for index in [50,101,118,280,330,347,151]:
  x,y=pixels[index].astype(int);samples.append(np.asarray(image)[max(0,y-2):y+3,max(0,x-2):x+3,:].reshape(-1,3).mean(axis=0))
 average=np.median(samples,axis=0)
 target=np.array([213,178,156] if name in ['mocaihuan','nangong'] else [196,164,145] if name in ['wangchan','hanli','lifeiyu'] else [179,148,129])
 data=np.asarray(crop).astype(float);gain=target/np.maximum(average,1)
 if name=='wangchan': gain=np.clip(gain,.85,1.16)
 data=np.clip(data*gain,0,255).astype('uint8')
 if name in ['hanli','nangong']:
  # Estimate lighting from skin only. Eyes, brows, lips and dark hair must not
  # contaminate the field, otherwise the old blur baked orange nose shadows into
  # the albedo and the game lit the face a second time against a much paler neck.
  valid=Image.new('L',crop.size,0);draw=ImageDraw.Draw(valid)
  local=pixels-np.array(box[:2]);draw.polygon([tuple(local[i]) for i in boundary],fill=255)
  exclusions=[loops[0],loops[1],loops[2],[70,63,105,66,107,55,65,52,53,46],[300,293,334,296,336,285,295,282,283,276]]
  excluded=Image.new('L',crop.size,0)
  for loop in exclusions:ImageDraw.Draw(excluded).polygon([tuple(local[i]) for i in loop],fill=255)
  excluded=cv2.dilate(np.array(excluded),np.ones((max(3,crop.width//35),)*2,np.uint8))
  weight=(np.array(valid)/255)*(excluded==0)*(data.mean(axis=2)>65)
  sigma=crop.width*.13;denominator=cv2.GaussianBlur(weight,(0,0),sigma)
  field=np.stack([cv2.GaussianBlur(data[:,:,i]*weight,(0,0),sigma)/np.maximum(denominator,.001) for i in range(3)],axis=2)
  correction=np.clip(target/np.maximum(field,1),.68,1.8)
  data=np.clip(data*(.12+.88*correction),0,255).astype('uint8')
 mask=Image.new('L',crop.size,0);ImageDraw.Draw(mask).polygon([tuple(pixels[i]-np.array(box[:2])) for i in boundary],fill=255)
 distance=cv2.distanceTransform(np.array(mask),cv2.DIST_L2,5)
 blend=np.clip(distance/(crop.width*.09),0,1)[...,None]
 data=np.clip(data*blend+target*(1-blend),0,255).astype('uint8')
 crop=Image.fromarray(data).resize((512,512),Image.Resampling.LANCZOS);crop.save(out/(name+'-face.jpg'),quality=91,optimize=True)
 uv=(pixels-np.array(box[:2]))/np.array([box[2]-box[0],box[3]-box[1]]);uv[:,1]=1-uv[:,1]
 positions=points.tolist();uvs=uv.tolist();topology=indices.copy()
 for loop in loops:
  index=len(positions);positions.append(points[loop].mean(axis=0).tolist());uvs.append(uv[loop].mean(axis=0).tolist())
  for i in range(len(loop)):topology.extend([index,loop[i],loop[(i+1)%len(loop)]])
 # Ensure every triangle winds toward the viewer, including the aperture fills.
 for i in range(0,len(topology),3):
  a,b,c=[np.asarray(positions[k]) for k in topology[i:i+3]]
  if np.cross(b-a,c-a)[2]<0:topology[i+1],topology[i+2]=topology[i+2],topology[i+1]
 faces[name]={'positions':[round(v,5) for p in positions for v in p],'uvs':[round(v,5) for p in uvs for v in p],'skin':int(target[0])*65536+int(target[1])*256+int(target[2])}
print('Baked',len(faces),'faces')
(root/'game/character-face-data.js').write_text('// Generated by scripts/bake-character-faces.py. Topology: MediaPipe, Apache-2.0 (see assets/characters/LICENSE.mediapipe).\nexport const FACE_INDICES='+json.dumps(topology,separators=(',',':'))+';\nexport const FACE_BOUNDARY='+json.dumps(boundary)+';\nexport const CHARACTER_FACES='+json.dumps(faces,separators=(',',':'))+';\n')
