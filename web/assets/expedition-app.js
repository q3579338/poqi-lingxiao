(function(){
 'use strict';
 const D=window.PQ_EXP,root=document.getElementById('app'),KEY='poqi_expedition_v8',OLD='poqi_text_v2',PREF='poqi_text_pref_v2';
 if(!D||!window.ExpeditionEngine)throw Error('Expedition modules unavailable');
 const e=new ExpeditionEngine();let view='menu',active=false,saved=null,legacy=null,font=18,saveError=false,timer;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 try{saved=JSON.parse(localStorage.getItem(KEY)||'null');legacy=JSON.parse(localStorage.getItem(OLD)||'null');const p=JSON.parse(localStorage.getItem(PREF)||'{}');if([16,18,20,22].includes(p.font))font=p.font;}catch(_){}
 document.documentElement.style.setProperty('--font',font+'px');
 const btn=(act,title,desc='',primary=false,disabled=false)=>`<button class="button${primary?' primary':''}" data-act="${esc(act)}"${disabled?' disabled':''}><strong>${esc(title)}</strong>${desc?`<small>${esc(desc)}</small>`:''}</button>`;
 const text=t=>`<p class="short-prose">${esc(t)}</p>`;
 function toast(t){const n=document.getElementById('toast');n.textContent=t;n.style.display='block';clearTimeout(timer);timer=setTimeout(()=>n.style.display='none',2200);}
 function save(){if(!active)return;try{const next=e.snapshot();localStorage.setItem(KEY,JSON.stringify(next));saved=next;saveError=false;}catch(_){saveError=true;}}
 function chapter(){return D.chapters[Math.min(4,e.s.chapter)];}
 function talent(id){return (e.talentInfo&&e.talentInfo(id))||D.talents.find(t=>t.id===id)||{name:id,desc:''};}
 function portrait(src,alt=''){const url=window.PQ_ARTS?.[src]||src;return src?`<figure class="journey-art"><div class="journey-frame"><span>配图载入中……</span><img src="${esc(url)}" alt="${esc(alt)}" decoding="async"><button class="art-retry" data-act="artRetry" hidden>配图未载入 · 重试</button></div></figure>`:'';}
 function report(){const r=e.s.report;if(!r)return '';return `<section class="battle-result"><div><b>${esc(r.title||'胜了')}</b>${r.toLevel>r.fromLevel?`<span>第 ${r.fromLevel} → ${r.toLevel} 重</span>`:''}</div>${r.text?text(r.text):''}${r.shards?`<small>契砂 +${r.shards}</small>`:''}</section>`;}
 function vitals(){const s=e.s;return `<div class="vitals"><div><span>气血 <b>${Math.ceil(s.hp)} / ${s.maxHp}</b></span><i><em style="width:${Math.max(0,s.hp/s.maxHp*100)}%"></em></i></div><div><span>逆印 <b>${s.energy} / ${s.maxEnergy}</b></span><i><em class="energy" style="width:${s.energy/s.maxEnergy*100}%"></em></i></div><div><span>蓄势 <b>${s.momentum} / 100</b></span><i><em class="momentum" style="width:${s.momentum}%"></em></i></div></div>`;}
 function header(){const s=e.s;return `<header class="top"><div class="bar"><span class="brand">破契凌霄</span><nav class="tools">${active?'<button class="tool" data-act="skills">武学</button><button class="tool" data-act="journal">记录</button>':''}<button class="tool" data-act="font">字号</button>${active?'<button class="tool" data-act="home">收卷</button>':''}</nav></div>${active?`<div class="power-strip"><span>晏逐 · <b>第 ${s.level} 重</b></span><span>刀势 <b>${Number(s.atk).toLocaleString('zh-CN')}</b></span><span class="chapter-count">${s.inTrial?'试炼 '+(s.trialFloor+(s.phase==='battle'?1:0))+' 层':(s.chapter+1)+' / 5 章'}</span></div>${vitals()}`:''}${saveError?'<button class="save-warn" data-act="save">存档没写入 · 重试</button>':''}</header>`;}
 function campTools(){const s=e.s;return `<div class="camp-tools">${btn('heal','疗伤',s.chapterFlags.rest?'此处已用':'25契砂 · 回55%气血',false,s.chapterFlags.rest||s.hp>=s.maxHp||s.shards<25)}${btn('forge','磨刀',s.chapterFlags.forged?'此处已用':'40契砂 · 刀势+15%',false,s.chapterFlags.forged||s.shards<40)}</div>`;}
 function fresh(){e.seed=(Date.now()^Math.floor(Math.random()*4294967295))>>>0;e.newRun();active=true;view='game';save();}
 function act(id){
  let changed=false;
  if(id==='font'){font=font===22?16:font+2;document.documentElement.style.setProperty('--font',font+'px');try{localStorage.setItem(PREF,JSON.stringify({font}));}catch(_){}render(true);return;}
  if(id==='artRetry'){const f=root.querySelector('.journey-art'),img=f?.querySelector('img');if(img){f.classList.remove('art-error');f.querySelector('button').hidden=true;img.src=img.getAttribute('src');}return;}
  if(id==='start'){if(saved)view='confirm';else fresh();}
  else if(id==='fresh')fresh();else if(id==='cancel'){view='menu';active=false;}
  else if(id==='continue'){if(e.restore(saved)){active=true;view='game';save();}else toast('存档没能读取，原记录还留着。');}
  else if(id==='import'){if(e.importLegacy(legacy)){active=true;view='game';save();toast('旧卷已接上，原记录也保留着。');}else toast('旧卷没能读取，原记录没有改动。');}
  else if(id==='home'){save();view='menu';active=false;}
  else if(id==='game')view='game';else if(id==='skills')view=view==='skills'?'game':'skills';else if(id==='journal')view=view==='journal'?'game':'journal';
  else if(id==='save'){save();toast(saveError?'还是没能写入。':'已保存。');}
  else if(id==='heal'){const hp=e.s.hp;changed=e.heal();toast(changed?'气血 +'+(e.s.hp-hp)+' · 契砂 −25':'气血已满，或此处无法再疗伤。');}
  else if(id==='forge'){const atk=e.s.atk;changed=e.forge();toast(changed?'刀势 '+atk+' → '+e.s.atk+' · 契砂 −40':'契砂不够，或此处已经磨过刀。');}
  else if(id==='trial')changed=e.startTrial();else if(id==='climb')changed=e.continueTrial();else if(id==='retry')changed=e.retry();else if(id==='retreat')changed=e.retreat();
  else if(id.startsWith('begin:')){changed=e.begin(id.slice(6));if(changed)e.enter('main');}else if(id.startsWith('enter:'))changed=e.enter(id.slice(6));else if(id.startsWith('move:'))changed=e.action(id.slice(5));else if(id.startsWith('event:'))changed=e.event(id.slice(6));else if(id.startsWith('pick:'))changed=e.pick(id.slice(5));else if(id.startsWith('finish:'))changed=e.finish(id.slice(7));
  if(changed){view='game';save();}render();
 }
 root.addEventListener('click',ev=>{const b=ev.target.closest('[data-act]');if(b&&!b.disabled)act(b.dataset.act);});
 function render(keep=false){const scroll=root.querySelector('.reader')?.scrollTop||0,s=e.s,ch=chapter();let body='',actions='',footerClass='';
  if(view==='menu'){
   body=`<div class="menu journey-menu"><span class="seal">逆</span><h1>破契凌霄</h1><div class="blurb">他们落在你身上的印，<br>如今都能炼成你的修为。</div><p class="menu-sub">试台 · 炉房 · 渡口 · 高台 · 主坛</p></div>`;
   actions=(saved?btn('continue','继续闯关','',true):'')+btn('start',saved?'重新开卷':'开卷','',!saved)+(legacy&&!saved?btn('import','沿旧卷继续','保留旧境界、刀势与契砂'):'');
  }else if(view==='confirm'){
   body='<h2>重新开卷？</h2>'+text('当前历练进度会被替换，旧文字版记录仍然保留。');actions=btn('fresh','重新开卷','',true)+btn('cancel','返回');
  }else if(view==='skills'){
   body='<p class="eyebrow">已学法门</p><h2>武学</h2>'+`<div class="wallet">契砂 <b>${s.shards}</b></div>`;
   const learned=Object.entries(s.talents).filter(([,rank])=>rank>0);body+=learned.length?learned.map(([id,rank])=>{const t=talent(id);return `<section class="skill"><div class="skill-title">${esc(t.name)}<small>${rank} 层</small></div><p>${esc(t.desc)}</p></section>`;}).join(''):text('掌中刚凝出刀光，还没有收下别的法门。');
   actions=btn('game','返回','',true);
  }else if(view==='journal'){
   body='<h2>走过的地方</h2>'+`<div class="wallet">交锋 ${s.wins} 场 <span>试炼最高 ${s.bestFloor} 层</span></div>`;
   body+=(s.history||[]).slice().reverse().map(h=>`<div class="journal-entry"><b>${esc(h.name)}</b><p>${h.kind==='trial'?'试炼':D.chapters[h.chapter]?.title||'旧卷'} · ${h.turns||1} 回合</p></div>`).join('')||text('还没打出试台。');actions=btn('game','返回','',true);
  }else if(s.phase==='opening'){
   body='<p class="eyebrow">试台</p><h2>手上的印在抽修为</h2>'+text('你叫晏逐，和阮霁来考通行牌。手印一按，半边身子都麻了。有人喊不考了，守卫却把门锁上。')+portrait('assets/art/opening-trial-v04.png','阮霁拦住侧门，晏逐腕上的印连着铜柱。')+'<div class="speech"><span class="speaker">阮霁</span><p>别按了！他们根本没打算还。</p></div>';
   actions=btn('begin:edge','扯断锁印','出刀更强',true)+btn('begin:counter','接住它，反打回去','反击更强');
  }else if(s.phase==='battle'){
   const enemy=s.enemy,intent=e.intent(),boss=enemy.kind==='elite'||s.node===2||enemy.kind==='trial';
   body=`<div class="encounter-head"><p class="eyebrow">${s.inTrial?'试炼 · '+(s.trialFloor+1)+' 层':esc(ch.title)+' · '+(s.node+1)+' / 3'}</p><span class="encounter-tag">${enemy.kind==='elite'?'精英':boss?'强敌':'交锋'}</span></div><section class="combatant"><div class="enemy-top"><h2>${esc(enemy.name)}</h2><span>第 ${enemy.turn+1} 回合</span></div><div class="enemy-track"><i style="width:${Math.max(0,enemy.hp/enemy.maxHp*100)}%"></i></div><p class="enemy-number">${Math.ceil(enemy.hp)} / ${enemy.maxHp}</p><div class="enemy-intent"><b>${esc(intent.label)}</b><p>${esc(intent.text)}</p>${intent.damage?`<small>来势 ${intent.damage}</small>`:''}</div></section>`;
   if(s.wins===0)body+=portrait('assets/art/awakening-v05.png','腕印碎开，抽走的修为流回掌中。');
   body+=`<div class="combat-log" aria-live="polite">${(s.log||[]).slice(-4).map((line,i,a)=>`<p class="${i===a.length-1?'last':''}">${esc(line)}</p>`).join('')}</div><button class="retreat-link" data-act="retreat">暂时撤开 · 蓄势清空</button>`;
   const moves=e.moves(),short=m=>{const damage=m.desc.match(/造成(\d+)伤害/)?.[1];return m.id==='slash'?`${damage}伤害 · 回25逆印`:m.id==='refine'?`${damage}伤害 · 耗45逆印`:m.id==='counter'?`${damage}伤害 · 减伤80%`:`${damage}伤害 · 耗100蓄势`;};actions='<div class="move-row">'+moves.filter(m=>m.id!=='ultimate').map(m=>btn('move:'+m.id,m.name,short(m),m.id==='refine',!m.enabled)).join('')+'</div>';const ult=moves.find(m=>m.id==='ultimate');if(ult?.enabled)actions=btn('move:ultimate',ult.name,short(ult),true)+actions;footerClass=' combat-footer';
  }else if(s.phase==='map'){
   body=`<p class="eyebrow">第 ${s.chapter+1} 章 · ${s.node} / 3 场</p><h2>${esc(ch.title)}</h2>`+report()+text(ch.intro)+`<div class="side-paths">${!s.chapterFlags.elite?btn('enter:elite',ch.elite.name,'精英 · 胜后选法'):''}${!s.chapterFlags.event?btn('enter:event',ch.event.title,'路边事件'):''}</div>`+portrait(ch.art,ch.title)+`<div class="wallet">契砂 <b>${s.shards}</b></div>`+campTools();
   actions=btn('enter:main',ch.enemyNames[s.node]?'迎战 · '+ch.enemyNames[s.node]:'继续前行','',true);
  }else if(s.phase==='event'){
   body=`<p class="eyebrow">${esc(ch.title)}</p><h2>${esc(ch.event.title)}</h2>`+text(ch.event.text);const opts=e.eventOptions?e.eventOptions():ch.event.choices;actions=opts.map((o,i)=>{const d=ch.event.choices.find(c=>c.id===o.id)||o;return btn('event:'+o.id,d.title,o.desc||'',i===0);}).join('');
  }else if(s.phase==='relic'){
   body='<h2>拆下的法门</h2>'+report()+text(s.inTrial?'碎印里还留着几种炼法。':s.pending?.kind==='main'?ch.clear:'锁环散了一地，里面还留着能用的印。');actions=s.choices.map((id,i)=>{const t=D.talents.find(t=>t.id===id)||talent(id);return btn('pick:'+id,t.name+' · '+(s.talents[id]+1)+'层',t.desc,i===0);}).join('');
  }else if(s.phase==='endingChoice'){
   body='<h2>主印碎了</h2>'+report()+text('阮霁拿走朱笔，石梁抱起旧契。门外的人都在等你的话。')+portrait('assets/art/final-counter-v05.png','主印碎在桌上，殷戈伸手抓不到朱笔。');actions=btn('finish:wander','带旧契去诸城','',true)+btn('finish:school','留下教大家拆印');
  }else if(s.phase==='ending'){
   const end=D.endings[s.ending]||D.endings.wander;body=`<p class="eyebrow">试台的账，算完了</p><h2>${esc(end.title)}</h2>`+(Array.isArray(end.text)?end.text.map(text).join(''):text(end.text))+`<div class="run-summary"><div><small>境界</small><b>第 ${s.level} 重</b></div><div><small>刀势</small><b>${Number(s.atk).toLocaleString('zh-CN')}</b></div><div><small>胜场</small><b>${s.wins}</b></div><div><small>试炼最高</small><b>${s.bestFloor} 层</b></div></div>`+text('阮霁在城外等着：“前头还有收契的人，去不去？”');actions=btn('trial','继续 · 城外试炼','',true)+btn('start','重开一卷');
  }else if(s.phase==='trialRest'){
   body=`<p class="eyebrow">城外试炼 · 已破 ${s.trialFloor} 层</p><h2>路边歇脚</h2>`+report()+`<div class="wallet">契砂 <b>${s.shards}</b> <span>最高 ${s.bestFloor} 层</span></div>`+campTools();actions=btn('climb','再往前一层','',true)+btn('retreat','先回城');
  }else if(s.phase==='dead'){
   body='<h2>被逼退了</h2>'+text(s.enemy?`${s.enemy.name}挡住了去路。`:'这一战没能打下来。')+`<div class="combat-log">${(s.log||[]).slice(-3).map(text).join('')}</div>`;actions=btn('retry','再战','蓄势清空，境界和战利品保留',true)+(s.inTrial?btn('retreat','先回城'):btn('home','收卷'));
  }
  root.innerHTML=header()+`<article class="reader journey-reader" tabindex="0">${body}</article><footer class="actions${footerClass}">${actions}</footer>`;
  const art=root.querySelector('.journey-art img');if(art){const figure=art.closest('figure');const fail=()=>{figure.classList.add('art-error');figure.querySelector('button').hidden=false;};const ready=async()=>{try{await art.decode();figure.classList.add('art-ready');figure.classList.remove('art-error');figure.querySelector('button').hidden=true;}catch(_){fail();}};art.addEventListener('load',ready);art.addEventListener('error',fail);if(art.complete){if(art.naturalWidth)ready();else fail();}}
  if(keep)root.querySelector('.reader').scrollTop=scroll;
 }
 addEventListener('pagehide',save);document.addEventListener('visibilitychange',()=>{if(document.hidden)save();});
 window.EXP_DEBUG={state:()=>JSON.parse(JSON.stringify(e.s)),intent:()=>e.intent(),moves:()=>e.moves(),key:KEY,view:()=>view,version:'0.8.0-expedition'};render();window.TEXT_READY=true;window.EXPEDITION_READY=true;
})();
