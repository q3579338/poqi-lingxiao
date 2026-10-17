(function(root){
 'use strict';
 const IDS=['edge','refine','chain','vamp','guard','vital','reserve','fury'];
 const PHASES=['awakening','scene','battle','reward','upgrade','chapterclear','destiny','ending','dead'];
 const copy=x=>JSON.parse(JSON.stringify(x));
 class TextEngine {
  constructor(seed=Date.now()){this.seed=seed>>>0;this.rng=this.seed||1;this.newRun();}
  rand(){this.rng=(Math.imul(this.rng,1664525)+1013904223)>>>0;return this.rng/4294967296;}
  newRun(){this.rng=this.seed||1;this.s={version:2,phase:'awakening',chapter:0,fight:0,route:null,level:1,atk:80,hp:240,maxHp:240,ink:100,maxInk:140,shards:0,total:0,turn:0,actions:0,upgrades:Object.fromEntries(IDS.map(x=>[x,0])),fusions:{sky:false,return:false},choices:[],enemy:null,log:[],history:[],lastReward:null,ending:null};return this.s;}
  awaken(){if(this.s.phase!=='awakening')return false;this.s.phase='scene';return true;}
  route(id){if(this.s.phase!=='scene'||!['force','refine'].includes(id))return false;this.s.route=id;this.s.fight=0;this.startFight();return true;}
  startFight(){const s=this.s,i=s.chapter,j=s.fight;const hp=[140,340,820,1900,4600][i]*[.65,.9,1.5][j];s.enemy={hp:Math.round(hp),maxHp:Math.round(hp),attack:Math.round((18+i*9)*(1+j*.2)),intent:0,charged:false};s.turn=1;s.log=[];s.phase='battle';}
  damage(){const s=this.s;return Math.round(s.atk*(s.route==='force'?1.4:1)*(s.turn<=2?Math.pow(1.5,s.upgrades.fury):1));}
  cost(){return this.s.route==='refine'?40:60;}
  intent(){const e=this.s.enemy;return ['bind','charge','strike'][e?e.intent%3:0];}
  action(id){const s=this.s;if(s.phase!=='battle'||!['cut','refine','counter'].includes(id))return false;if(id==='refine'&&s.ink<this.cost())return false;
   const e=s.enemy,kind=this.intent(),base=this.damage(),lines=[];let damage=base,block=0,stun=false;
   s.actions++;
   if(id==='cut'){const restored=Math.min(18,s.maxInk-s.ink);lines.push('你并指为刀，逆契飞刃直取封印的连接处。逆印 +'+restored+'。');s.ink+=restored;}
   if(id==='refine'){s.ink-=this.cost();damage=Math.round(base*2.6*(Math.pow(1.5,s.upgrades.refine)));stun=kind==='bind'||s.fusions.sky;lines.push(kind==='bind'?'你迎着封禁伸手一握。锁印当场倒卷，反炼成刃，斩回施术者！':'你将掌中逆印一并点燃，飞刃合成一道长虹，正面压下！');if(stun)lines.push('【破契】对方这一回合的攻势被强行打断。');}
   if(id==='counter'){damage=Math.round(base*.55*(Math.pow(1.5,s.upgrades.chain)));block=.8;lines.push('你收刀半寸，把对方攻势引进逆契的回路。');if(kind==='bind'){const reflect=Math.round(base*(s.fusions.return?2:1.2)*(Math.pow(1.5,s.upgrades.chain)));damage+=reflect;lines.push('封印尚未落稳，便沿原路反噬。借来的压迫，尽数奉还！');}if(s.fusions.return){s.hp=Math.min(s.maxHp,s.hp+15);lines.push('【还印归身】气血回复15。');}const restored=Math.min(30,s.maxInk-s.ink);s.ink+=restored;lines.push('【借势回收】逆印 +'+restored+'。');}
   e.hp=Math.max(0,e.hp-damage);lines.push('【'+(id==='refine'?'逆契反炼':id==='counter'?'借势反震':'裂印出刀')+'】造成 '+damage+' 点伤害。');
   if(!e.hp){s.log=lines;this.win();return true;}
   if(stun){lines.push('对方踉跄后退，刚聚起的印光散成碎屑。');}
   else if(kind==='charge'){e.charged=true;lines.push('对方双掌合印，正在蓄势。下一次强攻会更重。');}
   else {let incoming=e.attack*(e.charged?1.7:1)*(kind==='bind'?.8:1);e.charged=false;incoming=Math.max(1,Math.round(incoming*Math.pow(.8,s.upgrades.guard)*(1-block)));s.hp=Math.max(0,s.hp-incoming);const restored=Math.min(kind==='bind'?25:12,s.maxInk-s.ink);s.ink+=restored;lines.push((kind==='bind'?'封禁落在身上，你将其中一部分反炼成逆印。':'对方的攻势撞上护体刀气。')+' 气血 −'+incoming+'，逆印 +'+restored+'。');}
   e.intent++;s.turn++;s.log=lines;if(s.hp<=0){s.phase='dead';s.history.push({chapter:s.chapter,fight:s.fight,result:'dead'});}return true;
  }
  win(){const s=this.s;if(s.phase!=='battle'||!s.enemy||s.enemy.hp!==0)return false;const gain=14+s.chapter*12+s.fight*7;s.shards+=gain;s.total++;const heal=25+s.upgrades.vamp*25;s.hp=Math.min(s.maxHp,s.hp+heal);s.ink=Math.min(s.maxInk,s.ink+35);s.lastReward={shards:gain,heal,turns:s.turn,atk:this.damage()};s.phase='reward';s.history.push({chapter:s.chapter,fight:s.fight,turns:s.turn,level:s.level});s.log.push('对方的封印彻底崩散。这一战，已由你说了算。');}
  breakthrough(){const s=this.s;if(s.phase!=='reward')return false;s.level++;s.atk=Math.round(s.atk*1.23);s.maxHp+=20;s.hp=Math.min(s.maxHp,s.hp+60);const pool=[...IDS];for(let i=pool.length-1;i>0;i--){const j=Math.floor(this.rand()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}s.choices=pool.slice(0,3);s.phase='upgrade';return true;}
  upgrade(id){const s=this.s;if(s.phase!=='upgrade'||!s.choices.includes(id))return false;s.upgrades[id]++;if(id==='edge')s.atk=Math.round(s.atk*1.35);if(id==='vital'){s.maxHp+=80;s.hp=Math.min(s.maxHp,s.hp+80);}if(id==='reserve'){s.maxInk+=40;s.ink=s.maxInk;}s.choices=[];if(s.fight===2){s.phase=s.chapter===4?'destiny':'chapterclear';s.enemy=null;}else{s.fight++;this.startFight();}return true;}
  nextChapter(){const s=this.s;if(s.phase!=='chapterclear')return false;s.chapter++;s.phase='scene';s.route=null;s.enemy=null;s.log=[];return true;}
  fuse(id){const s=this.s;if(!['sky','return'].includes(id)||s.fusions[id]||s.shards<50||['awakening','ending','dead'].includes(s.phase))return false;
   if(id==='sky'&&!(s.upgrades.edge>=2&&s.upgrades.refine>=1))return false;if(id==='return'&&!(s.upgrades.chain>=2&&s.upgrades.guard>=1))return false;
   s.shards-=50;s.fusions[id]=true;if(id==='sky')s.atk=Math.round(s.atk*1.8);return true;}
  finish(id){if(this.s.phase!=='destiny'||!['wander','school'].includes(id))return false;this.s.ending=id;this.s.phase='ending';return true;}
  snapshot(){return copy({version:2,seed:this.seed,rng:this.rng,state:this.s});}
  restore(obj){try{const o=copy(obj),s=o.state;const finite=(v,min=0,max=1e10)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;const integer=(v,min=0,max=1e9)=>Number.isInteger(v)&&finite(v,min,max);
   if(o.version!==2||!integer(o.seed,0,4294967295)||!integer(o.rng,0,4294967295)||s.version!==2||!PHASES.includes(s.phase)||!integer(s.chapter,0,4)||!integer(s.fight,0,2))return false;
   for(const k of ['atk','maxHp','maxInk'])if(!finite(s[k],1))return false;if(!finite(s.hp,0,s.maxHp)||!finite(s.ink,0,s.maxInk)||!integer(s.level,1,16))return false;
   for(const k of ['shards','total','turn','actions'])if(!integer(s[k]))return false;for(const k of IDS)if(!integer(s.upgrades[k],0,15))return false;
   if(![null,'force','refine'].includes(s.route)||!Array.isArray(s.log)||s.log.length>12||s.log.some(x=>typeof x!=='string'||x.length>500)||!Array.isArray(s.history)||s.history.length>16||!Array.isArray(s.choices)||s.choices.some(x=>!IDS.includes(x))||new Set(s.choices).size!==s.choices.length)return false;
   for(const h of s.history){if(!h||!integer(h.chapter,0,4)||!integer(h.fight,0,2))return false;if(h.result==='dead'){if(s.phase!=='dead'||h!==s.history[s.history.length-1])return false;}else if(h.result!==undefined||!integer(h.turns,1)||!integer(h.level,1,15))return false;}
   if(s.lastReward!==null){const r=s.lastReward;if(!r||!integer(r.shards,1)||!integer(r.heal)||!integer(r.turns,1)||!finite(r.atk,1))return false;}
   if(['reward','upgrade'].includes(s.phase)&&s.lastReward===null)return false;
   if((s.phase==='upgrade'&&s.choices.length!==3)||(s.phase!=='upgrade'&&s.choices.length!==0)||typeof s.fusions.sky!=='boolean'||typeof s.fusions.return!=='boolean')return false;
   if(s.enemy){const e=s.enemy;if(!finite(e.hp,0,e.maxHp)||!finite(e.maxHp,1)||!finite(e.attack,1)||!integer(e.intent)||typeof e.charged!=='boolean')return false;}
   if(s.phase==='battle'&&(!s.enemy||s.enemy.hp<=0||s.hp<=0))return false;
   if(['battle','reward','upgrade','dead'].includes(s.phase)&&(!s.enemy||s.route===null||s.turn<1))return false;
   if(['reward','upgrade'].includes(s.phase)&&s.enemy.hp!==0)return false;
   if(['awakening','scene','chapterclear','destiny','ending'].includes(s.phase)&&s.enemy!==null)return false;
   if(s.phase==='dead'?s.hp!==0:s.hp<=0)return false;
   if(s.phase==='ending'?!['wander','school'].includes(s.ending):s.ending!==null)return false;
   this.seed=o.seed;this.rng=o.rng;this.s=s;return true;
  }catch(_){return false;}}
 }
 root.TextEngine=TextEngine;
})(typeof window!=='undefined'?window:globalThis);
