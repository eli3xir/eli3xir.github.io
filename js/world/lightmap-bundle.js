const signature='E3LIGHT1';
const validName=name=>/^[\w.-]+\.jpg$/i.test(name);

// The archive stores original JPEG bytes. It changes transport, not image data.
export function encodeLightmapBundle(files) {
  const index={version:1,files:{}};let offset=0;
  for(const {name,bytes,sha256} of files){
    if(!validName(name)||index.files[name]||!bytes.length||!/^[a-f0-9]{64}$/.test(sha256))throw new Error('Invalid lightmap entry');
    index.files[name]={offset,length:bytes.length,sha256};offset+=bytes.length;
  }
  const metadata=new TextEncoder().encode(JSON.stringify(index));
  const result=new Uint8Array(12+metadata.length+offset);
  result.set(new TextEncoder().encode(signature));new DataView(result.buffer).setUint32(8,metadata.length,true);
  result.set(metadata,12);offset=12+metadata.length;
  for(const {bytes} of files){result.set(bytes,offset);offset+=bytes.length;}
  return result;
}

export function decodeLightmapBundle(buffer) {
  const bytes=buffer instanceof Uint8Array?buffer:new Uint8Array(buffer),decoder=new TextDecoder();
  if(bytes.length<12||decoder.decode(bytes.subarray(0,8))!==signature)throw new Error('Invalid lightmap bundle');
  const length=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint32(8,true),start=12+length;
  if(!length||length>262144||start>=bytes.length)throw new Error('Invalid lightmap index size');
  const index=JSON.parse(decoder.decode(bytes.subarray(12,start)));
  if(index.version!==1||!index.files||Array.isArray(index.files))throw new Error('Unsupported lightmap bundle');
  const entries=Object.entries(index.files),result=new Map();let end=0;
  if(!entries.length||entries.length>1024)throw new Error('Invalid lightmap count');
  for(const [name,entry] of entries){
    if(!validName(name)||!Number.isSafeInteger(entry.offset)||!Number.isSafeInteger(entry.length)||entry.offset!==end||entry.length<=0||
      start+entry.offset+entry.length>bytes.length||!/^[a-f0-9]{64}$/.test(entry.sha256))throw new Error('Invalid lightmap range');
    end=entry.offset+entry.length;
    result.set(name,{bytes:bytes.subarray(start+entry.offset,start+end),sha256:entry.sha256});
  }
  if(start+end!==bytes.length)throw new Error('Unexpected lightmap payload');
  return result;
}
