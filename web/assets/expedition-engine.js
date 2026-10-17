(function(root){
 'use strict';
 const IDS=['edge','refine','counter','leech','guard','reserve','fury','echo'];
 const PHASES=['opening','map','battle','event','relic','endingChoice','ending','dead','trialRest'];
 const INTENTS={seal:{label:'封印',text:'刻链直扣经脉，命中时抽走20逆印。',factor:.7},heavy:{label:'重击',text:'整副重兵抡向胸前，这一击来势沉重。',factor:1.65},guard:{label:'护印',text:'契甲闭合，挡住大半斩击，同时递出一记轻掌。',factor:.35},strike:{label:'快攻',text:'短刃直取空隙，攻势已经压到身前。',factor:1},charge:{label:'蓄力',text:'敌人压住兵刃聚气，下一次攻击威力提升40%。',factor:0}};
 const TRIALS=[{name:'碎碑剑手',pattern:['seal','strike','guard'],line:'剑手刮掉碑上旧名：“先接住这一剑。”'},
  {name:'负岳重卫',pattern:['heavy','charge','heavy','strike'],line:'重卫把铁槌拖过石阶，碎石迸起。'},
  {name:'蚀纹术士',pattern:['seal','guard','seal','strike'],line:'术士捻开指间黑纹，三道刻链齐齐收紧。'},
  {name:'镜身游刃',pattern:['guard','strike','strike','heavy'],line:'镜面里的刀影先动，真人随后踏出。'},
  {name:'巡狱镇将',pattern:['charge','heavy','seal','guard'],line:'镇将提起断狱戟：“这层由我守。”'}];
 const copy=x=>JSON.parse(JSON.stringify(x)),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
 class ExpeditionEngine{
  constructor(seed=Date.now()){this.seed=seed>>>0;this.rng=this.seed||1;this.newRun();}
  _rand(){this.rng=(Math.imul(this.rng,1664525)+1013904223)>>>0;return this.rng/4294967296;}
  _chapter(){return root.PQ_EXP&&root.PQ_EXP.chapters&&root.PQ_EXP.chapters[this.s.chapter]||{};}
  _flags(){return{elite:false,event:false,rest:false,forged:false};}
  newRun(){this.rng=this.seed||1;this.s={version:8,phase:'opening',chapter:0,node:0,level:1,atk:90,hp:260,maxHp:260,energy:90,maxEnergy:120,momentum:0,shards:0,wins:0,mainWins:0,actions:0,talents:Object.fromEntries(IDS.map(id=>[id,0])),choices:[],enemy:null,log:[],report:null,history:[],chapterFlags:this._flags(),inTrial:false,trialFloor:0,bestFloor:0,ending:null,eventResult:null,lastChoice:null,pending:null};return this.s;}
  begin(id){if(this.s.phase!=='opening'||!['edge','counter'].includes(id))return false;this.s.talents[id]=1;this.s.lastChoice=id;this.s.phase='map';return true;}
  _log(line){this.s.log.push(line);if(this.s.log.length>12)this.s.log.shift();}
  _enemy(kind){const s=this.s,c=this._chapter(),boss=kind==='main'&&s.node===2||kind==='trial'&&(s.trialFloor+1)%5===0,progress=kind==='trial'?15:s.chapter*3+s.node,archetype=TRIALS[s.trialFloor%5];
   const baseline=90*Math.pow(1.13,progress),floorScale=kind==='trial'?Math.pow(1.16,s.trialFloor):1+s.chapter*.45;
   const hp=Math.round(baseline*(kind==='trial'?11:kind==='elite'?6.2:boss?7.8:s.chapter===0&&s.node===0?.85:s.node===0?2.8:3.4)*floorScale);
   const name=kind==='trial'?'第'+(s.trialFloor+1)+'层·'+archetype.name:kind==='elite'?(c.elite&&c.elite.name||'契阵精英'):(c.enemyNames&&c.enemyNames[s.node]||'封印守卫');
   const pattern=kind==='trial'?[...archetype.pattern]:boss?['seal','heavy','guard','charge']:kind==='elite'?['heavy','guard','seal','strike']:s.node===1?['guard','heavy','seal','strike']:['seal','strike','heavy'];
   return{id:kind==='trial'?'t:'+(s.trialFloor+1):kind==='elite'?'e:'+s.chapter:'m:'+s.chapter+':'+s.node,name,hp,maxHp:hp,attack:Math.round((25+s.chapter*9)*(kind==='elite'?1.15:boss?1.2:1)*(kind==='trial'?1.15*Math.pow(1.045,s.trialFloor+1):1)),kind,boss,pattern:[...pattern],initialPattern:pattern,turn:0,patternTurn:0,stage:1,charged:false,damageTaken:0};}
  _fight(kind){this.s.enemy=this._enemy(kind);this.s.phase='battle';this.s.log=[];this.s.report=null;this.s.eventResult=null;const c=this._chapter();this._log(kind==='trial'?TRIALS[this.s.trialFloor%5].line:kind==='elite'?(c.elite&&c.elite.line||'精英横起长兵，堵住了石门。'):(c.enemyLines&&c.enemyLines[this.s.node]||'守卫拔刃挡住去路。'));}
  enter(id){const s=this.s;if(s.phase!=='map'||s.inTrial||!['main','elite','event'].includes(id))return false;if(id==='main'&&s.node>=3)return false;if(id==='elite'&&s.chapterFlags.elite||id==='event'&&s.chapterFlags.event)return false;
   if(id==='event'){s.phase='event';s.eventResult=null;s.log=[];}else this._fight(id);return true;}
  event(id){const s=this.s;if(s.phase!=='event'||!['risk','safe'].includes(id)||s.chapterFlags.event)return false;const before=s.shards;let text;
   if(id==='risk'){const loss=Math.min(s.hp-1,Math.ceil(s.maxHp*.12));s.hp-=loss;s.shards+=50;s.momentum=Math.min(100,s.momentum+25);text='拆开余印：气血 −'+loss+'，契砂 +50，蓄势 +25（最多100）。';}
   else{const heal=Math.min(60,s.maxHp-s.hp),energy=Math.min(35,s.maxEnergy-s.energy);s.hp+=heal;s.energy+=energy;s.shards+=20;text='稳住气息：气血 +'+heal+'，逆印 +'+energy+'，契砂 +20。';}
   s.chapterFlags.event=true;s.lastChoice=id;s.eventResult={id,text};s.report={title:'余印已解',fromLevel:s.level,toLevel:s.level,shards:s.shards-before,text};s.phase='map';s.log=[text];return true;}
  eventOptions(){const s=this.s,c=this._chapter(),choices=c.event&&c.event.choices||[];return['risk','safe'].map(id=>({id,title:(choices.find(x=>x.id===id)||{}).title||(id==='risk'?'拆开余印':'稳住气息'),desc:id==='risk'?'气血 −'+Math.min(s.hp-1,Math.ceil(s.maxHp*.12))+'（至少保留1），契砂 +50，蓄势 +'+Math.min(25,100-s.momentum)+'。':'契砂 +20，气血 +'+Math.min(60,s.maxHp-s.hp)+'，逆印 +'+Math.min(35,s.maxEnergy-s.energy)+'。'}));}
  intent(){const e=this.s.enemy;if(!e)return null;const id=e.pattern[e.patternTurn%e.pattern.length],i=INTENTS[id];return{id,label:i.label,text:i.text,damage:i.factor?Math.max(1,Math.round(e.attack*i.factor*(e.charged?1.4:1)*Math.pow(.85,this.s.talents.guard))):0};}
  _damage(id){const s=this.s,e=s.enemy,intent=e?this.intent().id:'strike',base=s.atk*(e&&e.turn<2?Math.pow(1.2,s.talents.fury):1);
   return Math.round(base*(id==='ultimate'?4.5:id==='slash'?Math.pow(1.25,s.talents.edge)*(intent==='guard'?.45:1):id==='refine'?2.1*Math.pow(1.25,s.talents.refine)*(intent==='seal'?1.3:intent==='guard'?1.45:1):Math.pow(1.25,s.talents.counter)*(intent==='heavy'?1.8:intent==='seal'?1:.6)));}
  moves(){const s=this.s;return[{id:'slash',name:'裂印斩',desc:'造成'+this._damage('slash')+'伤害，回复25逆印；护印会削弱斩击。',enabled:s.phase==='battle'},
   {id:'refine',name:'逆契反炼',desc:'消耗45逆印，造成'+this._damage('refine')+'伤害；克制护印，打断封印。',enabled:s.phase==='battle'&&s.energy>=45},
   {id:'counter',name:'借势反击',desc:'造成'+this._damage('counter')+'伤害，回复12逆印，减伤80%；重击回合反击更强、蓄势更快。',enabled:s.phase==='battle'},
   {id:'ultimate',name:'天阙归刃',desc:'消耗100蓄势，造成'+this._damage('ultimate')+'伤害并打断攻势；蓄势跨战保留。',enabled:s.phase==='battle'&&s.momentum>=100}];}
  action(id){const s=this.s;if(s.phase!=='battle'||!['slash','refine','counter','ultimate'].includes(id)||id==='refine'&&s.energy<45||id==='ultimate'&&s.momentum<100)return false;
   const e=s.enemy,i=this.intent(),damage=this._damage(id),actual=Math.min(damage,e.hp);s.actions++;s.log=[];
   if(id==='refine')s.energy-=45;if(id==='slash')s.energy=Math.min(s.maxEnergy,s.energy+25);if(id==='counter')s.energy=Math.min(s.maxEnergy,s.energy+12);
   if(id==='ultimate')s.momentum=Math.min(100,s.talents.echo*5);else s.momentum=Math.min(100,s.momentum+(id==='counter'?(i.id==='heavy'?40:30):id==='refine'?20:14)+s.talents.echo*5);
   e.hp=Math.max(0,e.hp-damage);e.damageTaken+=actual;this._log(({slash:'裂印斩',refine:'逆契反炼',counter:'借势反击',ultimate:'天阙归刃'})[id]+'，造成'+damage+'伤害。');
   if(!e.hp){e.turn++;e.patternTurn++;this._win();return true;}
   const interrupted=id==='ultimate'||id==='refine'&&i.id==='seal';
   if(interrupted)this._log('敌方攻势被你当场拆散。');
   else if(i.id==='charge'){e.charged=true;this._log('对方开始蓄力，下一手攻势会更重。');}
   else{const incoming=Math.max(1,Math.round(i.damage*(id==='counter'?.2:1)));s.hp=Math.max(0,s.hp-incoming);e.charged=false;
    this._log(i.label+'落下，气血 −'+incoming+'。');if(i.id==='seal'){const drain=Math.min(s.energy,id==='counter'?5:20);s.energy-=drain;this._log('封印抽走'+drain+'逆印。');}}
   e.turn++;e.patternTurn++;
   if(e.boss&&e.stage===1&&e.hp<=e.maxHp*.5){e.stage=2;e.pattern=['heavy','seal','strike','guard'];e.patternTurn=0;this._log('镇守者半身契甲崩落，改用重击连阵！');}
   if(s.hp<=0){s.phase='dead';this._log('这一阵未过。可免费重试，蓄势将清空。');}
   return true;}
  _win(){const s=this.s,e=s.enemy;if(s.phase!=='battle'||!e||e.hp!==0||s.history.some(h=>h.id===e.id))return false;
   const fromLevel=s.level,gain=e.kind==='main'?14+s.chapter*12+s.node*7:e.kind==='elite'?45+s.chapter*20:25+(s.trialFloor+1)*5;
   s.wins++;s.shards+=gain;s.level++;s.atk=Math.round(s.atk*(e.kind==='trial'?1.07:1.13));s.maxHp+=16;
   const heal=Math.min(s.maxHp-s.hp,28+s.talents.leech*15);s.hp+=heal;s.energy=Math.min(s.maxEnergy,s.energy+20);s.momentum=Math.min(100,s.momentum+12);
   s.history.push({id:e.id,chapter:s.chapter,name:e.name,turns:e.turn,kind:e.kind,level:fromLevel,floor:e.kind==='trial'?s.trialFloor+1:0});
   if(s.history.length>1000)s.history.shift();
   s.report={title:e.name+' · 已破',fromLevel,toLevel:s.level,shards:gain,damage:e.damageTaken,text:'契砂 +'+gain+'，气血 +'+heal+'，刀势升至'+s.atk+'。'};
   this._log('破阵获'+gain+'契砂，当场突破至第'+s.level+'重。');
   let after='map';if(e.kind==='main'){s.node++;s.mainWins++;if(s.node===3)after=s.chapter===4?'endingChoice':'nextChapter';}
   if(e.kind==='elite')s.chapterFlags.elite=true;
   if(e.kind==='trial'){s.trialFloor++;s.bestFloor=Math.max(s.bestFloor,s.trialFloor);after='trialRest';}
   s.pending={kind:e.kind,after};const relic=e.kind==='main'&&e.boss||e.kind==='elite'||e.kind==='trial'&&s.trialFloor%3===0;
   s.enemy=null;if(relic){this._choices();s.phase='relic';}else this._afterReward();return true;}
  _choices(){const pool=[...IDS];for(let i=pool.length-1;i>0;i--){const j=Math.floor(this._rand()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}this.s.choices=pool.slice(0,3);}
  _afterReward(){const s=this.s,after=s.pending.after;s.pending=null;
   if(after==='nextChapter'){s.chapter++;s.node=0;s.chapterFlags=this._flags();s.phase='map';s.eventResult=null;}
   else s.phase=after;}
  pick(id){const s=this.s;if(s.phase!=='relic'||!s.choices.includes(id))return false;s.talents[id]++;s.lastChoice=id;
   if(id==='reserve'){s.maxEnergy+=30;s.energy=s.maxEnergy;}s.choices=[];this._afterReward();return true;}
  talentInfo(id){if(!IDS.includes(id))return null;const item=root.PQ_EXP&&root.PQ_EXP.talents&&root.PQ_EXP.talents.find(x=>x.id===id),rank=this.s.talents[id],current=id==='edge'||id==='refine'||id==='counter'?'当前该招倍率×'+Math.pow(1.25,rank).toFixed(2):id==='guard'?'当前所受伤害×'+Math.pow(.85,rank).toFixed(2):id==='fury'?'当前前两手倍率×'+Math.pow(1.2,rank).toFixed(2):id==='leech'?'当前胜利额外回复'+rank*15:id==='reserve'?'当前逆印上限额外增加'+rank*30:'当前每招额外蓄势'+rank*5;return{...(item||{id,name:id}),rank,desc:(item&&item.desc||'领悟这一门法门。')+' '+current+'。'};}
  heal(){const s=this.s;if(!['map','trialRest'].includes(s.phase)||s.shards<25||s.chapterFlags.rest||s.hp>=s.maxHp)return false;const heal=Math.min(s.maxHp-s.hp,Math.ceil(s.maxHp*.55));s.shards-=25;s.hp+=heal;s.chapterFlags.rest=true;this._log('花费25契砂疗伤，气血 +'+heal+'。');return true;}
  forge(){const s=this.s;if(!['map','trialRest'].includes(s.phase)||s.shards<40||s.chapterFlags.forged)return false;s.shards-=40;s.atk=Math.round(s.atk*1.15);s.chapterFlags.forged=true;this._log('花费40契砂磨刀，刀势提升15%。');return true;}
  finish(id){const s=this.s;if(s.phase!=='endingChoice'||!['wander','school'].includes(id))return false;s.ending=id;s.phase='ending';return true;}
  startTrial(){const s=this.s;if(s.phase!=='ending'||!s.ending)return false;s.inTrial=true;s.trialFloor=s.bestFloor;s.chapterFlags=this._flags();this._fight('trial');return true;}
  continueTrial(){const s=this.s;if(s.phase!=='trialRest'||!s.inTrial)return false;s.trialFloor=s.bestFloor;s.chapterFlags=this._flags();this._fight('trial');return true;}
  retry(){const s=this.s;if(s.phase!=='dead'||!s.enemy)return false;s.hp=s.maxHp;s.energy=s.maxEnergy;s.momentum=0;s.enemy.hp=s.enemy.maxHp;s.enemy.turn=0;s.enemy.patternTurn=0;s.enemy.stage=1;s.enemy.charged=false;s.enemy.damageTaken=0;
   s.enemy.pattern=[...s.enemy.initialPattern];s.phase='battle';s.log=['伤口暂封。重新出手，蓄势归零。'];return true;}
  retreat(){const s=this.s;if(!['battle','dead','trialRest'].includes(s.phase))return false;if(s.hp<=0){if(!s.inTrial)return false;s.hp=Math.max(1,Math.ceil(s.maxHp*.35));}s.enemy=null;s.choices=[];s.pending=null;
   if(s.inTrial){s.inTrial=false;s.phase='ending';}else s.phase='map';s.momentum=0;return true;}
  snapshot(){return copy({version:8,seed:this.seed,rng:this.rng,state:this.s});}
  restore(raw){try{const o=copy(raw),s=o.state,F=(v,a=0,b=1e12)=>typeof v==='number'&&Number.isFinite(v)&&v>=a&&v<=b,N=(v,a=0,b=1e9)=>Number.isInteger(v)&&F(v,a,b);
   if(o.version!==8||!N(o.seed,0,4294967295)||!N(o.rng,0,4294967295)||!s||s.version!==8||!PHASES.includes(s.phase)||!N(s.chapter,0,4)||!N(s.node,0,3))return false;
   if(!N(s.level,1)||!F(s.atk,1)||!F(s.maxHp,1)||!F(s.hp,0,s.maxHp)||!F(s.maxEnergy,1)||!F(s.energy,0,s.maxEnergy)||!F(s.momentum,0,100))return false;
   for(const k of ['shards','wins','mainWins','actions','trialFloor','bestFloor'])if(!N(s[k]))return false;if(s.mainWins>15||typeof s.inTrial!=='boolean')return false;
   for(const id of IDS)if(!N(s.talents[id],0,10000))return false;for(const id of ['elite','event','rest','forged'])if(typeof s.chapterFlags[id]!=='boolean')return false;
   if(!Array.isArray(s.choices)||s.choices.some(id=>!IDS.includes(id))||new Set(s.choices).size!==s.choices.length||(s.phase==='relic'?s.choices.length!==3:s.choices.length!==0))return false;
   if(!Array.isArray(s.log)||s.log.length>12||s.log.some(x=>typeof x!=='string'||x.length>2000)||!Array.isArray(s.history)||s.history.length>1000)return false;
   const seen=new Set();for(const h of s.history){if(!h||typeof h.id!=='string'||seen.has(h.id)||!N(h.chapter,0,4)||typeof h.name!=='string'||h.name.length>300||!N(h.turns,1)||!['main','elite','trial'].includes(h.kind)||!N(h.level,1)||!N(h.floor))return false;seen.add(h.id);}
   if(s.enemy!==null){const e=s.enemy;if(!e||typeof e.id!=='string'||typeof e.name!=='string'||e.name.length>300||!F(e.maxHp,1)||!F(e.hp,1,e.maxHp)||!F(e.attack,1)||!['main','elite','trial'].includes(e.kind)||typeof e.boss!=='boolean'||!Array.isArray(e.pattern)||!e.pattern.length||e.pattern.length>10||e.pattern.some(x=>!INTENTS[x])||!Array.isArray(e.initialPattern)||!e.initialPattern.length||e.initialPattern.length>10||e.initialPattern.some(x=>!INTENTS[x])||!N(e.turn)||!N(e.patternTurn)||!N(e.stage,1,2)||typeof e.charged!=='boolean'||!F(e.damageTaken)||seen.has(e.id))return false;
    const expected=e.kind==='trial'?'t:'+(s.trialFloor+1):e.kind==='elite'?'e:'+s.chapter:'m:'+s.chapter+':'+s.node;
    if(e.id!==expected||(e.kind==='trial')!==s.inTrial||e.kind==='main'&&(s.node>=3||e.boss!==(s.node===2))||e.kind==='elite'&&(s.chapterFlags.elite||e.boss)||e.kind==='trial'&&e.boss!==((s.trialFloor+1)%5===0))return false;}
   if(['battle','dead'].includes(s.phase)?s.enemy===null:s.enemy!==null)return false;if(s.phase==='dead'?s.hp!==0:s.hp<=0)return false;
   if(s.report!==null){const r=s.report;if(!r||typeof r.title!=='string'||r.title.length>500||!N(r.fromLevel,1)||!N(r.toLevel,r.fromLevel)||!N(r.shards)||typeof r.text!=='string'||r.text.length>2000||r.damage!==undefined&&!F(r.damage))return false;}
   if(s.eventResult!==null&&(!s.eventResult||!['risk','safe'].includes(s.eventResult.id)||typeof s.eventResult.text!=='string'||s.eventResult.text.length>2000))return false;
   if(![null,'wander','school'].includes(s.ending)||s.lastChoice!==null&&typeof s.lastChoice!=='string')return false;
   if(s.phase==='relic'){if(!s.pending||!['main','elite','trial'].includes(s.pending.kind)||!['map','nextChapter','endingChoice','trialRest'].includes(s.pending.after))return false;}else if(s.pending!==null)return false;
   if(s.phase==='relic'){const p=s.pending;if(p.kind==='main'&&(s.node!==3||s.inTrial||p.after!==(s.chapter===4?'endingChoice':'nextChapter'))||p.kind==='elite'&&(!s.chapterFlags.elite||s.inTrial||p.after!=='map')||p.kind==='trial'&&(!s.inTrial||s.trialFloor%3!==0||p.after!=='trialRest'))return false;}
   if(['ending','trialRest'].includes(s.phase)&&!s.ending||s.inTrial&&(!s.ending||s.trialFloor<0)||s.phase==='trialRest'&&!s.inTrial)return false;
   if(s.mainWins!==s.chapter*3+s.node||s.inTrial&&s.trialFloor!==s.bestFloor||['ending','endingChoice'].includes(s.phase)&&(s.chapter!==4||s.node!==3||s.inTrial)||s.phase==='endingChoice'&&s.ending!==null)return false;
   if(s.phase==='event'&&(s.inTrial||s.chapterFlags.event)||s.phase==='map'&&(s.inTrial||s.node>=3)||s.phase==='opening'&&(s.chapter!==0||s.node!==0||s.wins!==0))return false;
   this.seed=o.seed;this.rng=o.rng;this.s=s;return true;
  }catch(_){return false;}}
  importLegacy(raw){try{if(typeof root.StoryEngine!=='function')return false;const old=new root.StoryEngine();if(!old.restore(raw))return false;const b=old.s,candidate=new ExpeditionEngine(old.base.seed),s=candidate.s;
   s.chapter=b.chapter;s.node=b.fight;s.level=b.level;s.atk=b.atk;s.hp=b.hp;s.maxHp=b.maxHp;s.energy=b.ink;s.maxEnergy=b.maxInk;s.shards=b.shards;s.actions=b.actions;s.ending=b.ending;
   const map={edge:'edge',refine:'refine',chain:'counter',vamp:'leech',guard:'guard',reserve:'reserve',fury:'fury'};for(const id of Object.keys(map))s.talents[map[id]]=b.upgrades[id];
   s.history=b.history.filter(h=>h.result!=='dead').map(h=>({id:'m:'+h.chapter+':'+h.fight,chapter:h.chapter,name:'旧卷第'+(h.chapter+1)+'章·第'+(h.fight+1)+'阵',turns:h.turns,kind:'main',level:h.level,floor:0}));s.wins=s.history.length;s.mainWins=s.wins;
   if(b.phase==='chapterclear'||b.phase==='destiny'||b.phase==='ending'){s.node=3;if(b.phase==='ending')s.phase='ending';else if(b.chapter===4)s.phase='endingChoice';else{s.chapter++;s.node=0;s.phase='map';}}
   else if(b.phase==='awakening')s.phase='opening';else if(b.phase==='scene')s.phase='map';else if(['battle','dead'].includes(b.phase)){s.phase=b.phase;s.enemy=candidate._enemy('main');s.enemy.hp=b.enemy.hp;s.enemy.maxHp=b.enemy.maxHp;s.enemy.attack=b.enemy.attack;s.enemy.turn=Math.max(0,b.turn-1);s.enemy.patternTurn=s.enemy.turn;}
   else return false;s.report={title:'旧卷行迹已接续',fromLevel:s.level,toLevel:s.level,shards:0,text:'原有境界、刀势、气血与契砂已保留，从尚未完成的一阵继续。'};
   const check=new ExpeditionEngine();if(!check.restore(candidate.snapshot()))return false;this.seed=check.seed;this.rng=check.rng;this.s=check.s;return true;
  }catch(_){return false;}}
 }
 root.ExpeditionEngine=ExpeditionEngine;
})(typeof window!=='undefined'?window:globalThis);
