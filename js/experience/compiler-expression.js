// A deliberately bounded integer-expression lesson, not the original LLVM compiler.
export const COMPILER_EXAMPLE='x := 2 + 3 * 4;';
const RESERVED=new Set('and abs array begin boolean case const char chr downto do div end else false for function goto integer if mod maxint not odd of ord or pred program procedure read real record repeat sqrt sqr string succ to then true type until var while write'.split(' '));
export function parseExpression(source){
  const fail=(message,at=0)=>{const error=new Error(message);error.column=at+1;throw error;};
  if(source.length>64)fail('这一台最多放下 64 个字符。',64);
  const tokens=[];let offset=0;
  while(offset<source.length){
    if(/\s/.test(source[offset])){offset++;continue;}
    const match=/^(?::=|[A-Za-z][A-Za-z0-9_]*|\d+|[+*();-])/.exec(source.slice(offset));
    if(!match)fail('这里支持整数、+、−、* 和括号。',offset);
    tokens.push({text:match[0],start:offset,end:offset+match[0].length});offset+=match[0].length;
  }
  if(tokens.length>32)fail('符号太多了，试着缩短一点。');
  let cursor=0;const nodes=[],steps=[];
  const peek=()=>tokens[cursor],take=text=>{const t=peek();if(!t||text&&t.text!==text)fail(`这里需要 ${text||'一个符号'}。`,t?.start??source.length);cursor++;return t;};
  const node=(label,token,children=[],value=null)=>{
    if(nodes.length>=15)fail('最多展示 15 个树节点，请缩短表达式。',token.start);
    const n={id:nodes.length,label,start:token.start,end:token.end,children,value};nodes.push(n);return n;
  };
  const checked=(value,token)=>{if(value< -2147483648n||value>2147483647n)fail('计算超出本演示的 32 位有符号整数范围。',token.start);return Number(value);};
  const binary=(op,left,right,token)=>{
    const a=BigInt(left.value),b=BigInt(right.value),value=checked(op==='+'?a+b:op==='-'?a-b:a*b,token);
    const n=node(op,token,[left.id,right.id],value);steps.push({id:n.id,children:n.children,text:`${left.value} ${op} ${right.value} = ${value}`,value,start:token.start,end:token.end});return n;
  };
  function factor(depth){
    if(depth>5)fail('括号嵌套太深了，最多 5 层。',peek()?.start??source.length);
    const t=take();
    if(t.text==='('){const n=expression(depth+1);take(')');return n;}
    if(t.text==='-'){const zero=node('0',{start:t.start,end:t.start},[],0);return binary('-',zero,factor(depth+1),t);}
    if(!/^\d+$/.test(t.text))fail('这里需要一个整数或括号。',t.start);
    return node(t.text,t,[],checked(BigInt(t.text),t));
  }
  function term(depth){let n=factor(depth);while(peek()?.text==='*'){const t=take();n=binary('*',n,factor(depth),t);}return n;}
  function expression(depth=0){let n=term(depth);while(['+','-'].includes(peek()?.text)){const t=take();n=binary(t.text,n,term(depth),t);}return n;}
  const name=take();if(!/^[A-Za-z][A-Za-z0-9_]{0,7}$/.test(name.text))fail('左侧写一个 1–8 位的变量名。',name.start);
  if(RESERVED.has(name.text.toLowerCase()))fail('左侧需要变量名，不能使用保留字。',name.start);
  const target=node(name.text,name),assign=take(':='),value=expression();take(';');
  if(peek())fail('一次只处理一条赋值语句。',peek().start);
  const root=node(':=',assign,[target.id,value.id],value.value);
  steps.push({id:root.id,children:[value.id],text:`${name.text} ← ${value.value}`,value:value.value,start:assign.start,end:assign.end});
  const depth=id=>1+Math.max(0,...nodes[id].children.map(depth));
  if(depth(root.id)>6)fail('树太深了，请缩短表达式。');
  return{source,tokens,nodes,steps,root:root.id,target:name.text,result:value.value};
}

export function createCompiler(){
  const state={program:parseExpression(COMPILER_EXAMPLE),serial:0,phase:'ready',progress:0,step:-1,busy:false,error:null};
  const listeners=new Set();let flight=null,disposed=false,stamp='';
  const notify=()=>{const next=[state.serial,state.phase,state.step,state.error?.message,state.error?.column].join(':');if(next===stamp)return;stamp=next;listeners.forEach(fn=>fn(state));};
  return{state,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
    run(source,{now=0,delay=0,beat=.5,reduced=false}={}){
      if(disposed||state.busy)return false;
      try{state.program=parseExpression(source);state.error=null;}catch(error){state.error={message:error.message,column:error.column};state.phase='error';notify();return false;}
      state.serial++;state.busy=true;state.phase='assembling';state.progress=0;state.step=-1;
      flight={start:now+delay,beat};notify();if(reduced)this.advance(now,true);return true;
    },
    advance(now,reduced=false){
      if(!flight||disposed)return;
      const elapsed=Math.max(0,(now-flight.start)/flight.beat),count=state.program.steps.length;
      state.progress=reduced?2+count:Math.min(2+count,elapsed);
      state.step=Math.min(count-1,Math.floor(state.progress-2));
      state.phase=state.progress<2?'assembling':state.progress<2+count?'evaluating':'done';
      if(state.phase==='done'){state.busy=false;flight=null;}notify();
    },
    dispose(){disposed=true;flight=null;state.busy=false;listeners.clear();}
  };
}
