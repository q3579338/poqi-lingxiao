'use strict';
const assert=require('node:assert/strict');
global.window=global;
require('../web/assets/text-engine.js');
require('../web/assets/story-engine.js');
require('../web/assets/expedition-data.js');
require('../web/assets/expedition-engine.js');
const copy=x=>JSON.parse(JSON.stringify(x)),phaseSaves=new Map();let audits=0;
function audit(e){const save=e.snapshot(),other=new ExpeditionEngine(999);assert.equal(other.restore(save),true,'self save '+e.s.phase);assert.deepEqual(other.snapshot(),save);if(!phaseSaves.has(e.s.phase))phaseSaves.set(e.s.phase,save);audits++;}
function unchanged(e,fn){const before=e.snapshot();assert.equal(fn(),false);assert.deepEqual(e.snapshot(),before);}
const priorities={slash:['edge','fury','guard','leech','echo','reserve','refine','counter'],refine:['refine','reserve','guard','leech','fury','echo','edge','counter'],counter:['counter','echo','guard','leech','fury','reserve','edge','refine']};
function pick(e,strategy){const id=priorities[strategy].find(x=>e.s.choices.includes(x));assert.equal(e.pick(id),true);}
function move(e,strategy,ultimate=true,adaptive=true){let id=strategy;if(strategy==='refine'&&e.s.energy<45)id='slash';if(adaptive&&e.intent().id==='guard'&&e.s.energy>=45)id='refine';if(adaptive&&e.intent().id==='heavy')id='counter';if(ultimate&&e.s.momentum>=100)id='ultimate';assert.equal(e.action(id),true);}
function mainRun(seed,strategy,{optional=false,shops=true,ultimate=true,allowRetries=true,adaptive=true}={}){
 const e=new ExpeditionEngine(seed);audit(e);e.begin(strategy==='counter'?'counter':'edge');let retries=0,events=0,elites=0,minHp=e.s.hp;
 for(let guard=0;guard<10000&&!['endingChoice','ending'].includes(e.s.phase);guard++){
  const s=e.s;
  if(s.phase==='map'){
   if(optional&&!s.chapterFlags.event){assert.equal(e.enter('event'),true);audit(e);assert.equal(e.event(s.chapter%2?'safe':'risk'),true);events++;unchanged(e,()=>e.event('risk'));unchanged(e,()=>e.enter('event'));}
   else if(shops&&!s.chapterFlags.event){e.enter('event');e.event('safe');events++;}
   if(shops){if(s.hp<s.maxHp*.7)e.heal();e.forge();}
   assert.equal(e.enter(optional&&!s.chapterFlags.elite?'elite':'main'),true);
  }else if(s.phase==='battle'){move(e,strategy,ultimate,adaptive);minHp=Math.min(minHp,s.hp);}
  else if(s.phase==='relic'){if(s.pending.kind==='elite')elites++;pick(e,strategy);}
  else if(s.phase==='dead'){retries++;if(!allowRetries)break;assert.ok(retries<40,'strategy is not trapped in a death loop');assert.equal(e.retry(),true);}
  else assert.fail('unhandled phase '+s.phase);
  audit(e);
 }
 return{e,retries,events,elites,minHp};
}
const results=[];
for(const strategy of ['slash','refine','counter'])for(const seed of [7,123,2026]){
 const r=mainRun(seed,strategy),e=r.e;assert.equal(e.s.phase,'endingChoice');assert.equal(e.s.mainWins,15);assert.equal(e.s.wins,15);assert.equal(e.s.level,16);
 assert.equal(e.s.history.filter(x=>x.kind==='main').length,15);assert.equal(e.s.history.reduce((n,h)=>n+14+h.chapter*12+(+h.id.split(':')[2])*7,0),675);
 assert.equal(Object.values(e.s.talents).reduce((a,b)=>a+b,0),6,'start talent plus five boss choices');
 unchanged(e,()=>e.pick('edge'));unchanged(e,()=>e._win());unchanged(e,()=>e.finish('bad'));
 const bossTurns=e.s.history.filter(x=>+x.id.split(':')[2]===2).map(x=>x.turns),actions=e.s.actions;
 assert.ok(actions>=30,'main route requires actual individual combat decisions');
 assert.equal(e.finish(seed===123?'school':'wander'),true);audit(e);
 results.push({seed,strategy,actions,retries:r.retries,bossTurns,minHp:r.minHp,remainingSand:e.s.shards});
}

// Optional five elites/events have separate identities and one-time rewards.
const full=mainRun(123,'refine',{optional:true}),e=full.e;
assert.equal(e.s.phase,'endingChoice');assert.equal(e.s.mainWins,15);assert.equal(e.s.wins,20);assert.equal(e.s.level,21);assert.equal(full.events,5);assert.equal(full.elites,5);
assert.equal(e.s.history.filter(x=>x.kind==='elite').length,5);
assert.equal(Object.values(e.s.talents).reduce((a,b)=>a+b,0),11);
assert.equal(new Set(e.s.history.map(x=>x.id)).size,20);const optionalActions=e.s.actions;e.finish('wander');audit(e);
const untouchedPurse=mainRun(123,'counter',{shops:false}).e;
assert.equal(untouchedPurse.s.phase,'endingChoice');assert.equal(untouchedPurse.s.shards,675,'all main currency is awarded exactly once without purchases');
const completePurse=mainRun(123,'counter',{optional:true,shops:false}).e;
assert.equal(completePurse.s.phase,'endingChoice');assert.equal(completePurse.s.shards,675+425+3*50+2*20,'main, five elites and five one-time events balance exactly');

// Continuous trial has five genuinely different archetypes, multi-stage fifth
// floors, and only every THIRD victory grants a talent choice.
let trialChoices=0,trialRetries=0;const trialNames=new Set(),trialPatterns=new Set(),trialBosses=[];
assert.equal(e.startTrial(),true);assert.equal(e.s.trialFloor,0);
for(let guard=0;guard<20000&&e.s.bestFloor<12;guard++){
 if(e.s.phase==='battle'){
  const enemy=e.s.enemy;trialNames.add(enemy.name.replace(/^第\d+层·/,''));trialPatterns.add(enemy.initialPattern.join(','));
  if(enemy.boss&&!trialBosses.includes(e.s.trialFloor+1))trialBosses.push(e.s.trialFloor+1);
  const id=e.s.momentum>=100?'ultimate':e.intent().id==='heavy'?'counter':e.s.energy>=45?'refine':'slash';e.action(id);
 }else if(e.s.phase==='relic'){trialChoices++;assert.equal(e.s.trialFloor%3,0);pick(e,'refine');}
 else if(e.s.phase==='trialRest'){if(e.s.hp<e.s.maxHp*.8)e.heal();e.forge();assert.equal(e.continueTrial(),true);}
 else if(e.s.phase==='dead'){trialRetries++;assert.ok(trialRetries<30);e.retry();}
 else assert.fail('trial phase '+e.s.phase);
 audit(e);
}
assert.equal(e.s.bestFloor,12);assert.equal(e.s.trialFloor,12);assert.equal(e.s.phase,'relic');trialChoices++;pick(e,'refine');audit(e);
assert.equal(trialChoices,4);assert.equal(e.s.phase,'trialRest');assert.ok(trialNames.size>=5);assert.equal(trialPatterns.size,5);assert.deepEqual(trialBosses,[5,10]);
const completedTrial=e.snapshot();assert.equal(e.retreat(),true);assert.equal(e.s.phase,'ending');assert.equal(e.s.bestFloor,12);assert.equal(e.startTrial(),true);assert.equal(e.s.trialFloor,12);assert.equal(e.s.enemy.id,'t:13');

// Each move has a mechanical niche, independently of the chosen attack build.
{
 const actor=new ExpeditionEngine(19);actor.begin('edge');actor.enter('elite');
 function against(intent,moveId){const a=new ExpeditionEngine();a.restore(actor.snapshot());a.s.enemy.pattern=[intent];a.s.enemy.initialPattern=[intent];a.s.enemy.hp=a.s.enemy.maxHp=100000;a.s.hp=a.s.maxHp;a.s.energy=100;a.s.momentum=100;const hp=a.s.hp,energy=a.s.energy,momentum=a.s.momentum;const foe=a.s.enemy.hp;a.action(moveId);return{damage:foe-a.s.enemy.hp,hurt:hp-a.s.hp,energy:a.s.energy-energy,momentum:a.s.momentum-momentum};}
 assert.ok(against('guard','refine').damage>against('guard','slash').damage*3);
 assert.equal(against('seal','refine').hurt,0);assert.ok(against('seal','slash').hurt>0);
 assert.ok(against('heavy','counter').hurt<against('heavy','slash').hurt/3);
 assert.ok(against('heavy','counter').damage>against('guard','counter').damage*2);
 assert.equal(against('strike','slash').energy,20,'energy is capped, not fabricated above max');
 const a=new ExpeditionEngine();a.restore(actor.snapshot());a.s.momentum=0;a.s.energy=0;unchanged(a,()=>a.action('ultimate'));unchanged(a,()=>a.action('refine'));
 unchanged(a,()=>a.action('bad'));assert.ok(a.moves().find(x=>x.id==='refine').enabled===false);
 const start=a.snapshot();a.intent();a.moves();a.eventOptions();a.talentInfo('edge');assert.deepEqual(a.snapshot(),start,'read helpers cannot advance turns');
 // The same node enemy does not inflate after increasing player attack/skills.
 const high=new ExpeditionEngine();high.restore(actor.snapshot());high.s.atk*=10;high.s.talents.edge+=5;
 assert.equal(high.s.enemy.maxHp,actor.s.enemy.maxHp);assert.equal(high.s.enemy.attack,actor.s.enemy.attack);
 assert.equal(high._enemy('elite').maxHp,actor._enemy('elite').maxHp,'future generation uses stage baseline, never the buffed attack');
 const forecast=new ExpeditionEngine();forecast.restore(actor.snapshot());forecast.s.talents.guard=3;forecast.s.enemy.pattern=['strike'];forecast.s.enemy.initialPattern=['strike'];forecast.s.enemy.hp=forecast.s.enemy.maxHp=100000;
 const incoming=forecast.intent().damage,hp=forecast.s.hp;forecast.action('slash');assert.equal(hp-forecast.s.hp,incoming,'forecast includes passive guard exactly once');
 const echo=new ExpeditionEngine();echo.restore(actor.snapshot());echo.s.talents.echo=2;echo.s.momentum=100;echo.s.enemy.hp=echo.s.enemy.maxHp=100000;echo.action('ultimate');assert.equal(echo.s.momentum,10,'echo returns momentum after an ultimate as after every move');
}

// A naturally poor slash-only, no-shop strategy can lose. Free retry resets
// the SAME enemy and grants no money, levels, wins, or duplicate history.
const poor=mainRun(2026,'slash',{shops:false,ultimate:false,allowRetries:false,adaptive:false}).e;
assert.equal(poor.s.phase,'dead');audit(poor);const dead=poor.snapshot(),before={sand:poor.s.shards,level:poor.s.level,wins:poor.s.wins,history:copy(poor.s.history)};
assert.equal(poor.retry(),true);assert.equal(poor.s.hp,poor.s.maxHp);assert.equal(poor.s.momentum,0);assert.equal(poor.s.enemy.id,dead.state.enemy.id);assert.equal(poor.s.enemy.hp,poor.s.enemy.maxHp);
assert.equal(poor.s.shards,before.sand);assert.equal(poor.s.level,before.level);assert.equal(poor.s.wins,before.wins);assert.deepEqual(poor.s.history,before.history);unchanged(poor,()=>poor.retry());audit(poor);
// A trial loss can also exit to the ending without claiming a floor.
{
 const a=new ExpeditionEngine();a.restore(completedTrial);a.continueTrial();a.s.hp=1;a.s.enemy.attack=100000;a.s.enemy.hp=a.s.enemy.maxHp=1000000;a.s.enemy.pattern=['strike'];a.s.enemy.initialPattern=['strike'];a.action('slash');assert.equal(a.s.phase,'dead');audit(a);
 const floor=a.s.bestFloor,sand=a.s.shards;assert.equal(a.retreat(),true);assert.equal(a.s.phase,'ending');assert.ok(a.s.hp>=Math.ceil(a.s.maxHp*.35));assert.equal(a.s.bestFloor,floor);assert.equal(a.s.shards,sand);audit(a);
}

// Legacy v2 and v3 are first validated by StoryEngine, then transferred without
// writing either old key. Current fight damage, growth and optional old endings
// are preserved; future main fights continue at the next unclaimed identity.
const legacy=new Map();
{
 const b=new TextEngine(123);legacy.set('v2-opening',b.snapshot());b.awaken();b.route('refine');b.action('cut');legacy.set('v2-partial',b.snapshot());
 b.action('refine');legacy.set('v2-reward',b.snapshot());b.breakthrough();legacy.set('v2-upgrade',b.snapshot());
 const w=new StoryEngine(7);w.choose('rescue');legacy.set('v3-reveal',w.snapshot());w.choose('return');legacy.set('v3-clear',w.snapshot());
 while(w.flow.mode!=='ending'){const id=w.flow.mode==='result'?(w.s.phase==='destiny'?'school':'trust'):w.flow.mode==='scene'?'refine':w.flow.mode==='interaction'?'bond':'edge';assert.equal(w.choose(id),true);}
 legacy.set('v3-ending',w.snapshot());
}
const imports=[];
for(const[name,oldSave]of legacy){const target=new ExpeditionEngine(90),validOld=new StoryEngine();assert.equal(validOld.restore(oldSave),true);assert.equal(target.importLegacy(oldSave),true,name);const old=validOld.s;
 for(const k of ['level','atk','hp','maxHp','shards'])assert.equal(target.s[k],old[k],name+' retains '+k);
 assert.equal(target.s.mainWins,old.history.filter(x=>x.result!=='dead').length);audit(target);
 if(old.phase==='battle'){assert.equal(target.s.enemy.hp,old.enemy.hp);assert.equal(target.s.enemy.maxHp,old.enemy.maxHp);assert.equal(target.s.node,old.fight);}
 if(name==='v3-ending'){assert.equal(target.s.phase,'ending');assert.equal(target.startTrial(),true);assert.equal(target.s.enemy.id,'t:1');}
 imports.push({name,phase:target.s.phase,level:target.s.level,completed:target.s.mainWins});
}

// All state visible to the UI is validated. Rejecting malformed saves is atomic.
{
 const a=new ExpeditionEngine(5),valid=phaseSaves.get('battle');
 const mutations=[s=>{s.phase='oops';},s=>{s.history=[null];},s=>{s.history=[{id:'m:0:0',chapter:99}];},s=>{s.enemy.pattern=['oops'];},s=>{s.enemy.initialPattern=null;},s=>{s.enemy.name=null;},s=>{s.report={};},s=>{s.log=[{}];},s=>{s.chapterFlags=null;},s=>{s.talents=null;},s=>{s.pending={};},s=>{s.choices=['edge'];},s=>{s.mainWins=15;},s=>{s.hp=-1;},s=>{s.energy=99999;},s=>{s.eventResult={id:'risk',text:null};},s=>{s.enemy.id='m:99:0';}];
 for(const change of mutations){const bad=copy(valid);change(bad.state);unchanged(a,()=>a.restore(bad));}
 for(const raw of [null,{},[],{version:8},'bad',{...valid,version:3}])unchanged(a,()=>a.restore(raw));
 for(const raw of [null,{},legacy.get('v3-ending')&&{...legacy.get('v3-ending'),flow:null}])unchanged(a,()=>a.importLegacy(raw));
 const relic=copy(phaseSaves.get('relic'));relic.state.choices=['edge','edge','guard'];unchanged(a,()=>a.restore(relic));
 assert.equal(a.restore(phaseSaves.get('event')),true);assert.equal(a.eventOptions().length,2);assert.equal(a.event('safe'),true);unchanged(a,()=>a.event('risk'));audit(a);
}
for(const phase of ['opening','map','battle','event','relic','endingChoice','ending','dead','trialRest'])assert.ok(phaseSaves.has(phase),'phase coverage '+phase);
console.log(JSON.stringify({results,optional:{actions:optionalActions,wins:20,events:5,elites:5},trial:{completed:12,talentChoices:trialChoices,retries:trialRetries,archetypes:trialNames.size},poorSlash:{phase:dead.state.phase,chapter:dead.state.chapter,node:dead.state.node,actions:dead.state.actions},imports,audits,phases:[...phaseSaves.keys()]},null,2));
console.log('ExpeditionEngine: three builds, fifteen main battles, optional rewards once, move tradeoffs, twelve varied trial floors, free retry, legacy imports and atomic phase-save validation passed.');
