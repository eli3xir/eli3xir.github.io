import test from 'node:test';
import assert from 'node:assert/strict';
import {parseExpression,createCompiler} from '../../js/experience/compiler-expression.js';

test('precedence, grouping, unary minus and left associativity produce dependency-ordered values',()=>{
  for(const [source,result,values] of [
    ['x := 2 + 3 * 4;',14,[12,14,14]],['x := (2 + 3) * 4;',20,[5,20,20]],
    ['value := 12 - 5 - 2;',5,[7,5,5]],['n := -(2 + 3) * -2;',10,[5,-5,-2,10,10]],
    ['x := 2147483647 - 2147483647;',0,[0,0]],['x:=0-2147483647-1;',-2147483648,[-2147483647,-2147483648,-2147483648]],
  ]){const p=parseExpression(source);assert.equal(p.result,result);assert.deepEqual(p.steps.map(s=>s.value),values);assert.equal(p.nodes[p.root].label,':=');
    assert.ok(p.nodes.every(n=>source.slice(n.start,n.end)===n.label||n.label==='0'&&n.start===n.end));
    const done=new Set(p.nodes.filter(n=>!n.children.length).map(n=>n.id));for(const step of p.steps){assert.ok(step.children.every(id=>done.has(id)));done.add(step.id);}
  }
  assert.deepEqual(parseExpression('x := (2 + 3) * 4;').nodes.map(n=>n.label),['x','2','3','+','4','*',':=']);
});

test('invalid and excessive inputs fail at a source column without executing arbitrary code',()=>{
  for(const source of ['','x = 2;','x := 2 + ;','x := (2 + 3;','x := 1; y := 2;','x:=a+1;','x:=2/0;','x:=3 div 2;','x:=2.3;','x:=2147483648;','x:=2147483647*2;','begin:=2;','long_name:=1;','x:=1+2+3+4+5+6+7+8;','x:=((((((1))))));','x:=globalThis.process.exit();','x'.repeat(65)]){
    assert.throws(()=>parseExpression(source),e=>e instanceof Error&&e.column>=1&&e.column<=source.length+1,source);
  }
  assert.throws(()=>parseExpression('x := 2 + ;'),e=>e.column===10);
  for(const source of ['true:=2;','WHILE:=1;','write:=2;'])assert.throws(()=>parseExpression(source),e=>e.column===1);
  const compiler=createCompiler(),columns=[];compiler.subscribe(state=>columns.push(state.error.column));
  compiler.run('x:=+;');compiler.run('x:=  +;');assert.deepEqual(columns,[4,6]);
});

test('the lesson waits for its launch beat, survives paused music, settles reduced motion and cancels on disposal',()=>{
  const c=createCompiler(),events=[];c.subscribe(s=>events.push([s.phase,s.step]));
  assert.equal(c.run('x:=2+3*4;',{now:10,delay:.2,beat:.5}),true);
  assert.equal(c.run('x:=7;',{now:10}),false);c.advance(10.1);assert.equal(c.state.progress,0);
  c.advance(11.21);assert.equal(c.state.phase,'evaluating');assert.equal(c.state.step,0);
  c.advance(12.71);assert.equal(c.state.phase,'done');assert.equal(c.state.program.result,14);assert.equal(c.state.busy,false);
  assert.equal(c.run('x:=2+;'),false);assert.equal(c.state.error.column,6);assert.equal(c.state.program.result,14);
  c.run('x:=7;',{reduced:true});assert.equal(c.state.phase,'done');assert.equal(c.state.program.result,7);assert.equal(c.state.error,null);
  c.run('x:=7+3;',{now:20});c.dispose();const count=events.length;c.advance(100);assert.equal(events.length,count);assert.equal(c.run('x:=3;'),false);
});
