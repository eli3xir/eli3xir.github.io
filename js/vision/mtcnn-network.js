// Architecture and unchanged weights: the original project's net/mtcnn.py.
// R/ONet use N,C,W,H order before their dense layer (Keras Permute(3,2,1)).
export function predict(tf,input,weights,name){return tf.tidy(()=>{
  const layer=(x,index,prelu,dense=false)=>{
    const key='conv'+index;
    const value=tf.add(dense?tf.matMul(x,weights[key+'/kernel']):tf.conv2d(x,weights[key+'/kernel'],1,'valid'),weights[key+'/bias']);
    return prelu?tf.prelu(value,weights[prelu+'/alpha']):value;
  };
  let x=input,outputs;
  if(name==='pnet'){
    x=tf.maxPool(layer(x,1,'PReLU1'),2,2,'valid');x=layer(x,2,'PReLU2');x=layer(x,3,'PReLU3');
    outputs=[layer(x,'4-1'),layer(x,'4-2')];
  }else{
    x=tf.maxPool(layer(x,1,'prelu1'),3,2,'same');x=tf.maxPool(layer(x,2,'prelu2'),3,2,'valid');x=layer(x,3,'prelu3');
    if(name==='onet')x=layer(tf.maxPool(x,2,2,'valid'),4,'prelu4');
    x=tf.reshape(tf.transpose(x,[0,3,2,1]),[input.shape[0],-1]);const last=name==='rnet'?4:5;
    x=layer(x,last,'prelu'+last,true);
    outputs=Array.from({length:name==='rnet'?2:3},(_,i)=>layer(x,`${last+1}-${i+1}`,null,true));
  }
  outputs[0]=tf.softmax(outputs[0]);return outputs;
});}
