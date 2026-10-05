"""Independent numerical reference: NumPy kernels + original Python postprocessing.

Requires numpy, opencv-python and h5py. No browser/TFJS code is imported.
The pinned original checkout remains read-only; no personal images are read.
"""
import os
os.environ['OPENBLAS_NUM_THREADS']='1'
import argparse,ast,hashlib,json,pathlib,subprocess
import cv2,h5py,numpy as np

parser=argparse.ArgumentParser();parser.add_argument('--source',type=pathlib.Path,required=True)
parser.add_argument('--output',type=pathlib.Path,default=pathlib.Path('tools/fixtures/vision-reference.json'))
args=parser.parse_args();root=pathlib.Path(__file__).resolve().parents[1]
commit='630512dacf9715d4bb5a798814bf6282b34a5417'
assert subprocess.check_output(['git','-C',str(args.source),'rev-parse','HEAD'],text=True).strip()==commit
sample=root/'assets/vision/astronaut.png';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(sample)=='88431cd9653ccd539741b555fb0a46b61558b301d4110412b5bc28b5e3ea6cb5'
original=args.source/'utils/utils.py';names={'calculateScales','rect2square','NMS','detect_face_12net','filter_face_24net','filter_face_48net'}
module=ast.parse(original.read_text(encoding='utf-8'));selected=ast.Module(body=[node for node in module.body if isinstance(node,ast.FunctionDef) and node.name in names],type_ignores=[])
scope={'np':np};exec(compile(selected,str(original),'exec'),scope)
models={};sources={}
for name in ['pnet','rnet','onet']:
    weights={};source=args.source/'model_data'/(name+'.h5');sources[name]=sha(source)
    with h5py.File(source,'r') as model:
        def record(key,value):
            if isinstance(value,h5py.Dataset):weights[key.split('/')[0]+'/'+key.rsplit('/',1)[1].replace(':0','')]=np.asarray(value,dtype=np.float32)
        model.visititems(record)
    models[name]=weights

def conv(x,w,b):
    kh,kw,channels,outputs=w.shape
    windows=np.lib.stride_tricks.sliding_window_view(x,(kh,kw),axis=(1,2))
    flattened=windows.transpose(0,1,2,4,5,3).reshape(-1,kh*kw*channels)
    return (flattened@w.reshape(-1,outputs)+b).reshape(x.shape[0],x.shape[1]-kh+1,x.shape[2]-kw+1,outputs)

def pool(x,k,s,padding='valid'):
    if padding=='same':
        h,w=x.shape[1:3];ph=max(0,(int(np.ceil(h/s))-1)*s+k-h);pw=max(0,(int(np.ceil(w/s))-1)*s+k-w)
        x=np.pad(x,((0,0),(ph//2,ph-ph//2),(pw//2,pw-pw//2),(0,0)),constant_values=-np.inf)
    windows=np.lib.stride_tricks.sliding_window_view(x,(k,k),axis=(1,2))
    return windows[:,::s,::s].max(axis=(-1,-2))

def predict(x,name):
    x=x.astype(np.float32);weights=models[name]
    def layer(x,index,prelu=None,dense=False):
        key='conv'+str(index);w=weights[key+'/kernel'];b=weights[key+'/bias'];x=x@w+b if dense else conv(x,w,b)
        return np.where(x>=0,x,x*weights[prelu+'/alpha']) if prelu else x
    if name=='pnet':
        x=pool(layer(x,1,'PReLU1'),2,2);x=layer(x,2,'PReLU2');x=layer(x,3,'PReLU3');outputs=[layer(x,'4-1'),layer(x,'4-2')]
    else:
        x=pool(layer(x,1,'prelu1'),3,2,'same');x=pool(layer(x,2,'prelu2'),3,2);x=layer(x,3,'prelu3')
        if name=='onet':x=layer(pool(x,2,2),4,'prelu4')
        x=x.transpose(0,3,2,1).reshape(x.shape[0],-1);last=4 if name=='rnet' else 5;x=layer(x,last,'prelu'+str(last),True)
        outputs=[layer(x,str(last+1)+'-'+str(i),dense=True) for i in range(1,3 if name=='rnet' else 4)]
    e=np.exp(outputs[0]-outputs[0].max(axis=-1,keepdims=True));outputs[0]=e/e.sum(axis=-1,keepdims=True);return outputs

def cascade(rgb):
    h,w=rgb.shape[:2];normalized=(rgb.copy()-127.5)/127.5;scales=scope['calculateScales'](rgb);rectangles=[];counts=[]
    for scale in scales:
        image=cv2.resize(normalized,(int(w*scale),int(h*scale)));prob,roi=predict(np.expand_dims(image,0),'pnet');prob=prob[0,:,:,1];roi=roi[0]
        boxes=scope['detect_face_12net'](prob,roi,max(prob.shape),1/scale,w,h,.5);rectangles.extend(boxes);counts.append(len(boxes))
    rectangles=np.array(scope['NMS'](rectangles,.7));stages=[{'name':'pnet','boxes':rectangles.tolist()}]
    for name,size,threshold in [('rnet',24,.7),('onet',48,.8)]:
        images=np.array([cv2.resize(normalized[int(box[1]):int(box[3]),int(box[0]):int(box[2])],(size,size)) for box in rectangles])
        outputs=predict(images,name)
        rectangles=scope['filter_face_24net'](*outputs,rectangles,w,h,threshold) if name=='rnet' else scope['filter_face_48net'](*outputs,rectangles,w,h,threshold)
        stages.append({'name':name,'boxes':rectangles.tolist()})
    return {'width':w,'height':h,'counts':counts,'stages':stages}
rgb=cv2.cvtColor(cv2.imread(str(sample)),cv2.COLOR_BGR2RGB)
report={'reference':'NumPy float32 kernels; original Python postprocessing; OpenCV float64 resize then float32 network input. Not original Keras execution.','sourceCommit':commit,'sourceHashes':sources,'sampleSha256':sha(sample),**cascade(rgb)}
report['variants']=[cascade(rgb[:512,:320]),cascade(rgb[:320,:512])]
args.output.parent.mkdir(parents=True,exist_ok=True)
with args.output.open('w',encoding='utf-8',newline='\n') as output:json.dump(report,output,separators=(',',':'));output.write('\n')
print(json.dumps({'fixture':str(args.output),'counts':[[len(stage['boxes']) for stage in case['stages']] for case in [report,*report['variants']]]}))
