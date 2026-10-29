"""Extract face landmarks locally; no model calls or game saves are involved.
Requires mediapipe, pillow and numpy. See docs/CHARACTER_MODELS.md.
"""
import argparse,json
from pathlib import Path
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from PIL import Image
import numpy as np
parser=argparse.ArgumentParser();parser.add_argument('--portraits',type=Path,required=True);parser.add_argument('--references',type=Path,required=True);parser.add_argument('--model',type=Path,required=True);parser.add_argument('--output',type=Path,required=True);args=parser.parse_args();args.output.mkdir(parents=True,exist_ok=True)
options=vision.FaceLandmarkerOptions(base_options=python.BaseOptions(model_asset_path=str(args.model)),num_faces=1,min_face_detection_confidence=.2,min_face_presence_confidence=.2)
with vision.FaceLandmarker.create_from_options(options) as detector:
 for name in ['hanli','modafu','mocaihuan','lifeiyu','zhangtie','jinguang','quhun','gangmaster','examiner','nangong','wangchan']:
  if name=='nangong': image=Image.open(args.references/'nangong-face.jpg').convert('RGB')
  elif name=='wangchan': image=Image.open(args.references/'yanbao-0.jpg').convert('RGB').crop((400,60,630,320))
  else:
   image=Image.open(args.portraits/(name+'.png')).convert('RGB');image=image.crop((int(image.width*.25),0,int(image.width*.75),int(image.height*.45)))
  result=detector.detect(mp.Image(image_format=mp.ImageFormat.SRGB,data=np.asarray(image)))
  if len(result.face_landmarks)!=1:raise ValueError(f'{name}: expected one face; check the source crop')
  (args.output/(name+'.landmarks.json')).write_text(json.dumps([[p.x,p.y,p.z] for p in result.face_landmarks[0]]))
  image.save(args.output/(name+'.source.png'))
  print(name,'extracted')
