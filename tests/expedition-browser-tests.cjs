const fs=require('fs'),path=require('path'),vm=require('vm'),{pathToFileURL}=require('url');
const {chromium}=require('playwright');
const BASE_URL=process.env.PREVIEW_URL||'http://127.0.0.1:61648';
const root=path.resolve(__dirname,'..'),out=path.join(__dirname,'expedition-out');fs.mkdirSync(out,{recursive:true});
const checks=[];function check(name,ok,detail){checks.push({name,ok,detail});console.log((ok?'PASS ':'FAIL ')+name+(detail?' '+JSON.stringify(detail):''));if(!ok)throw Error(name);}let browser;
async function capture(page,name){const img=page.locator('.journey-art img');if(await img.count())await img.evaluate(i=>i.decode());await page.screenshot({path:path.join(out,name+'.png'),animations:'disabled'});}
function prefer(choices){return ['echo','counter','refine','edge','guard','leech','reserve','fury'].find(x=>choices.includes(x));}
async function click(page,id){await page.locator('[data-act="'+id+'"]').click();}
async function play(page,{side=true,trial=6}={}){let loops=0,savedBattle=false,savedRelic=false,dead=0,art=false,clicks=0,trialBefore=null;
 while(loops++<650){const s=await page.evaluate(()=>EXP_DEBUG.state());
  if(s.phase==='battle'){
   if(!savedBattle&&s.enemy.turn>=1){const mark=await page.evaluate(()=>localStorage.getItem(EXP_DEBUG.key));await page.reload();await page.waitForFunction(()=>window.EXPEDITION_READY);await click(page,'continue');check('real battle bookmark continues without healing or replay',await page.evaluate(v=>localStorage.getItem(EXP_DEBUG.key)===v,mark));savedBattle=true;}
   if(!art&&s.enemy.turn>=1){await capture(page,'02-battle');art=true;}
   const m=await page.evaluate(()=>EXP_DEBUG.moves()),i=await page.evaluate(()=>EXP_DEBUG.intent());let id;
   if(m.find(x=>x.id==='ultimate').enabled&&(s.enemy.boss||s.enemy.kind==='elite'||s.hp<s.maxHp*.4))id='ultimate';else if(i.id==='heavy')id='counter';else if(['seal','guard'].includes(i.id)&&s.energy>=45)id='refine';else id='slash';
   await click(page,'move:'+id);clicks++;
  }else if(s.phase==='map'){
   if(side&&!s.chapterFlags.event){await click(page,'enter:event');clicks++;continue;}
   if(s.hp<s.maxHp*.55&&s.shards>=25&&!s.chapterFlags.rest){await click(page,'heal');clicks++;continue;}
   if(side&&!s.chapterFlags.elite){await capture(page,'03-map-'+s.chapter);await click(page,'enter:elite');clicks++;continue;}
   if(s.shards>=40&&!s.chapterFlags.forged){await click(page,'forge');clicks++;continue;}
   await click(page,'enter:main');clicks++;
  }else if(s.phase==='event'){await capture(page,'04-event');await click(page,'event:'+(s.chapter%2?'safe':'risk'));clicks++;check('event resolves once and disappears from map',await page.locator('[data-act="enter:event"]').count()===0);
  }else if(s.phase==='relic'){
   if(!savedRelic){const mark=await page.evaluate(()=>localStorage.getItem(EXP_DEBUG.key));await page.reload();await page.waitForFunction(()=>window.EXPEDITION_READY);await click(page,'continue');check('unpicked reward bookmark retains exactly the offered choices',await page.evaluate(v=>localStorage.getItem(EXP_DEBUG.key)===v,mark));savedRelic=true;await capture(page,'05-talents');}
   check('three genuinely different talents offered',s.choices.length===3&&new Set(s.choices).size===3);await click(page,'pick:'+prefer(s.choices));clicks++;
  }else if(s.phase==='endingChoice'){check('campaign contains all fifteen real main fights',s.mainWins===15&&s.actions>25,{actions:s.actions,wins:s.wins,level:s.level});if(side)check('five optional elites and events were played',s.wins===20&&s.history.filter(h=>h.kind==='elite').length===5);await click(page,'finish:wander');clicks++;
  }else if(s.phase==='ending'){if(!trial)break;if(trialBefore!==null&&s.bestFloor>=trial)break;trialBefore=s.actions;await capture(page,'06-ending');await click(page,'trial');clicks++;
  }else if(s.phase==='trialRest'){
   if(s.trialFloor>=trial){check('play continues after the story with saved trial progress',s.bestFloor>=trial&&s.actions>trialBefore,{floor:s.trialFloor,actions:s.actions,clicks});await capture(page,'07-trial');await click(page,'retreat');clicks++;break;}
   if(s.hp<s.maxHp*.5&&s.shards>=25&&!s.chapterFlags.rest){await click(page,'heal');clicks++;continue;}await click(page,'climb');clicks++;
  }else if(s.phase==='dead'){dead++;if(dead>5)throw Error('strategy repeatedly dies');await click(page,'retry');clicks++;}
  else throw Error('unhandled phase '+s.phase);
 }
 check('campaign loop terminates within the meaningful action budget',loops<650,{loops,clicks,dead});return page.evaluate(()=>EXP_DEBUG.state());
}
(async()=>{browser=await chromium.launch({...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),headless:true,args:['--mute-audio','--no-first-run']});
 const ctx=await browser.newContext({viewport:{width:390,height:844}}),page=await ctx.newPage(),errors=[],req=[];page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>req.push(r.url()));await page.goto(BASE_URL+'/?v=expedition08');await page.waitForFunction(()=>window.EXPEDITION_READY);check('menu starts without loading later artwork',!req.some(x=>x.includes('/art/')));await click(page,'start');await capture(page,'01-opening');await click(page,'begin:edge');check('awakening immediately enters a real fight',await page.evaluate(()=>EXP_DEBUG.state().phase==='battle'&&EXP_DEBUG.state().wins===0));
 const before=await page.evaluate(()=>JSON.stringify(EXP_DEBUG.state()));await page.waitForTimeout(200);check('reading time does not consume health or turns',await page.evaluate(v=>JSON.stringify(EXP_DEBUG.state())===v,before));
 await click(page,'move:refine');check('first powerful skill wins only the first encounter',await page.evaluate(()=>EXP_DEBUG.state().phase==='map'&&EXP_DEBUG.state().mainWins===1&&EXP_DEBUG.state().level===2));
 const s=await play(page);check('no browser errors in full campaign and trials',errors.length===0,errors);check('native save uses its own key',await page.evaluate(()=>localStorage.getItem('poqi_expedition_v8')!==null&&localStorage.getItem('poqi_text_v2')===null));await ctx.close();
 const small=await browser.newContext({viewport:{width:360,height:640}}),sp=await small.newPage();await sp.goto(BASE_URL+'/?v=expedition08');await click(sp,'start');await click(sp,'begin:counter');await click(sp,'font');await click(sp,'font');check('small screen large type keeps all three moves within view',await sp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&[...document.querySelectorAll('.move-row button')].length===3&&[...document.querySelectorAll('footer button')].every(e=>{const r=e.getBoundingClientRect();return r.height>=44&&r.bottom<=innerHeight+1&&r.right<=innerWidth+1;})));await capture(sp,'08-small');await small.close();
 // Produce an authentic old completed game and import via the visible menu.
 const sandbox={console,structuredClone};sandbox.window=sandbox;vm.createContext(sandbox);for(const f of ['text-data.js','text-engine.js','story-engine.js'])vm.runInContext(fs.readFileSync(path.join(root,'web/assets',f),'utf8'),sandbox);const old=vm.runInContext('new StoryEngine(91)',sandbox);for(let i=0;i<20&&old.flow.mode!=='ending';i++){const f=old.flow.mode,st=old.s;old.choose(f==='opening'?'rescue':f==='reveal'?'edge':f==='scene'?'force':f==='interaction'?'bond':st.chapter===4?'school':'trust');}const legacy=old.snapshot();const lc=await browser.newContext();await lc.addInitScript(v=>{if(!localStorage.getItem('poqi_text_v2'))localStorage.setItem('poqi_text_v2',JSON.stringify(v));},legacy);const lp=await lc.newPage();await lp.goto(BASE_URL+'/?v=expedition08');await click(lp,'import');check('old completed game keeps its stats and unlocks trial directly',await lp.evaluate(v=>{const s=EXP_DEBUG.state();return s.phase==='ending'&&s.level===v.base.state.level&&s.atk===v.base.state.atk&&s.shards===v.base.state.shards;},legacy));check('original legacy bookmark is never overwritten',await lp.evaluate(v=>JSON.stringify(JSON.parse(localStorage.getItem('poqi_text_v2')))===JSON.stringify(v),legacy));await click(lp,'trial');check('imported player can keep playing',await lp.evaluate(()=>EXP_DEBUG.state().phase==='battle'&&EXP_DEBUG.state().inTrial));await lc.close();
 const oc=await browser.newContext(),op=await oc.newPage(),external=[];op.on('request',r=>{if(/^https?:/.test(r.url()))external.push(r.url());});await op.goto(pathToFileURL(path.join(root,'release/破契凌霄-历练版v0.8.html')).href);await op.waitForFunction(()=>window.EXPEDITION_READY);await click(op,'start');await click(op,'begin:counter');await play(op,{side:false,trial:3});check('complete offline campaign and trial make no external requests',external.length===0,external);await oc.close();
 fs.writeFileSync(path.join(out,'browser-report.json'),JSON.stringify({version:'0.8.0-expedition',checks,final:s},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();});
