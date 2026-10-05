"""Pack the original detector's float32 tensors without quantization or retraining.

Requires h5py and numpy. Supply the pinned original repository checkout, an npm
installation of TFJS core/wasm 4.22.0, and the unmodified scikit-image sample.
"""
import argparse, hashlib, json, pathlib, shutil, subprocess
import h5py, numpy as np

parser=argparse.ArgumentParser()
parser.add_argument('--source',type=pathlib.Path,required=True)
parser.add_argument('--runtime',type=pathlib.Path,required=True)
parser.add_argument('--sample',type=pathlib.Path,required=True)
parser.add_argument('--license',type=pathlib.Path,required=True)
args=parser.parse_args()
root=pathlib.Path(__file__).resolve().parents[1]
assets=root/'assets/vision';vendor=root/'vendor/tfjs'
assets.mkdir(parents=True,exist_ok=True);vendor.mkdir(parents=True,exist_ok=True)
commit='630512dacf9715d4bb5a798814bf6282b34a5417'
assert subprocess.check_output(['git','-C',str(args.source),'rev-parse','HEAD'],text=True).strip()==commit
sha=lambda data:hashlib.sha256(data).hexdigest()
chunks=[];offset=0;models={}
for name in ['pnet','rnet','onet']:
    source=args.source/'model_data'/(name+'.h5');weights=[]
    with h5py.File(source,'r') as model:
        def record(key,value):
            global offset
            if not isinstance(value,h5py.Dataset):return
            array=np.asarray(value,dtype='<f4');content=array.tobytes()
            key=key.split('/')[0]+'/'+key.rsplit('/',1)[1].replace(':0','')
            weights.append({'name':key,'shape':list(array.shape),'offset':offset,'length':int(array.size),'sha256':sha(content)})
            chunks.append(content);offset+=len(content)
        model.visititems(record)
    models[name]={'sourceFile':'model_data/'+source.name,'sourceSha256':sha(source.read_bytes()),'weights':weights}
data=b''.join(chunks);(assets/'weights.bin').write_bytes(data)
shutil.copyfile(args.source/'LICENSE',assets/'LICENSE-models.txt')
assert sha(args.sample.read_bytes())=='88431cd9653ccd539741b555fb0a46b61558b301d4110412b5bc28b5e3ea6cb5'
shutil.copyfile(args.sample,assets/'astronaut.png')
runtime=[]
for package,files in [('tfjs-core',['tf-core.min.js']),('tfjs-backend-wasm',['tf-backend-wasm.min.js','tfjs-backend-wasm.wasm','tfjs-backend-wasm-simd.wasm','tfjs-backend-wasm-threaded-simd.wasm'])]:
    directory=args.runtime/'@tensorflow'/package
    assert json.loads((directory/'package.json').read_text(encoding='utf-8'))['version']=='4.22.0'
    for name in files:
        content=(directory/'dist'/name).read_bytes();(vendor/name).write_bytes(content)
        runtime.append({'file':'/vendor/tfjs/'+name,'bytes':len(content),'sha256':sha(content),'package':'@tensorflow/'+package,'version':'4.22.0'})
    shutil.copyfile(directory/'README.md',vendor/(package+'-README.md'))
shutil.copyfile(args.license,vendor/'LICENSE.txt')
manifest={'version':1,'source':{'repository':'https://gitee.com/buptsg2019/flask-face-recognition-api','commit':commit,'license':'MIT','licenseFile':'/assets/vision/LICENSE-models.txt'},
 'weights':{'file':'/assets/vision/weights.bin','bytes':len(data),'sha256':sha(data),'format':'concatenated little-endian float32, no quantization'},'models':models,'runtime':runtime,
 'sample':{'file':'/assets/vision/astronaut.png','bytes':args.sample.stat().st_size,'sha256':sha(args.sample.read_bytes()),'width':512,'height':512,'credit':'NASA / Eileen Collins','source':'https://www.flickr.com/photos/nasacommons/16504233985/','archive':'https://raw.githubusercontent.com/scikit-image/scikit-image/v0.25.2/skimage/data/astronaut.png','license':'Public domain; NASA on The Commons / scikit-image data attribution'},
 'scope':'MTCNN face boxes and five landmarks from the original detector weights; no FaceNet identity matching or original personal dataset.'}
# The source URL is the canonical Flickr photo ID verified from its short URL.
with (assets/'manifest.json').open('w',encoding='utf-8',newline='\n') as file:json.dump(manifest,file,indent=2,ensure_ascii=False);file.write('\n')
print(json.dumps({'weightsBytes':len(data),'tensors':sum(len(m['weights']) for m in models.values()),'runtimeBytes':sum(item['bytes'] for item in runtime)}))
