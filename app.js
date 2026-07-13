'use strict';
/* ===== CFA L2 Repaso — MVP ===== */

const PKEY = 'cfa_progress_v1';   // { id: 'know' | 'rev' }
const $ = (id) => document.getElementById(id);

let INDEX = null;        // manifiesto
let VOL = null;          // volumen cargado
let progress = loadProgress();

/* ---------- progreso ---------- */
function loadProgress(){ try{ return JSON.parse(localStorage.getItem(PKEY)) || {}; }catch(e){ return {}; } }
function saveProgress(){ try{ localStorage.setItem(PKEY, JSON.stringify(progress)); }catch(e){} }
function setStatus(id, status){
  if(progress[id] === status) delete progress[id];   // re-tocar = quitar marca
  else progress[id] = status;
  saveProgress();
}

/* ---------- carga de datos ---------- */
async function boot(){
  try{
    INDEX = await (await fetch('index.json')).json();
  }catch(e){
    document.querySelector('main').innerHTML = '<div class="empty">No pude cargar los datos. Serví la app desde un servidor (http), no abriendo el archivo directo.</div>';
    return;
  }
  const sel = $('volSelect');
  sel.innerHTML = INDEX.volumes.map(v => `<option value="${v.id}">${v.order}. ${v.title}</option>`).join('');
  sel.onchange = () => loadVolume(sel.value);
  await loadVolume(INDEX.volumes[0].id);
}

async function loadVolume(id){
  const meta = INDEX.volumes.find(v => v.id === id);
  VOL = await (await fetch(meta.file)).json();
  $('volLabel').textContent = VOL.title;
  initCards(); initTraps(); initQuiz(); renderProgress(); initRef();
}

/* ================= FLASHCARDS ================= */
let fLM, fTP, fEstado = 'all', deck = [], idx = 0, flipped = false;

function initCards(){
  fLM = new Set(VOL.lms.filter(l=>l.id!=='ANEXO').map(l=>l.id));
  fTP = new Set(Object.keys(VOL.cardTypes));
  fEstado = 'all'; idx = 0; flipped = false;
  buildCardFilters();
  rebuildDeck();
  renderCard();
}

function buildCardFilters(){
  const wrap = $('cardFilters'); wrap.innerHTML = '';
  const lmIds = VOL.lms.filter(l=>l.id!=='ANEXO').map(l=>l.id);
  // LM
  const r1 = row('Módulo');
  r1.appendChild(chip('Todos', fLM.size===lmIds.length, ()=>{ fLM=new Set(lmIds); afterCardFilter(); }));
  lmIds.forEach(lm=>{
    const n = VOL.flashcards.filter(c=>c.lm===lm).length;
    r1.appendChild(chip(`${lm}<span class="ct">${n}</span>`, fLM.has(lm)&&fLM.size<lmIds.length, ()=>toggleSet(fLM,lm,lmIds,afterCardFilter)));
  });
  wrap.appendChild(r1);
  // Tipo
  const tps = Object.keys(VOL.cardTypes);
  const r2 = row('Tipo');
  r2.appendChild(chip('Todos', fTP.size===tps.length, ()=>{ fTP=new Set(tps); afterCardFilter(); }));
  tps.forEach(tp=>{
    const n = VOL.flashcards.filter(c=>c.tipo===tp).length;
    r2.appendChild(chip(`${VOL.cardTypes[tp]}<span class="ct">${n}</span>`, fTP.has(tp)&&fTP.size<tps.length, ()=>toggleSet(fTP,tp,tps,afterCardFilter)));
  });
  wrap.appendChild(r2);
  // Estado
  const r3 = row('Estado');
  [['all','Todas'],['pend','Pendientes'],['know','La sé'],['rev','A repasar']].forEach(([k,lab])=>{
    r3.appendChild(chip(lab, fEstado===k, ()=>{ fEstado=k; afterCardFilter(); }));
  });
  wrap.appendChild(r3);
}

function afterCardFilter(){ buildCardFilters(); rebuildDeck({clamp:true}); renderCard(); }

function passCard(c){
  if(!fLM.has(c.lm)) return false;
  if(!fTP.has(c.tipo)) return false;
  const st = progress[c.id];
  if(fEstado==='pend' && st) return false;
  if(fEstado==='know' && st!=='know') return false;
  if(fEstado==='rev'  && st!=='rev')  return false;
  return true;
}

function rebuildDeck(opt={}){
  const keepId = opt.keepId ?? (deck[idx] ? deck[idx].id : null);
  deck = VOL.flashcards.filter(passCard);
  if(keepId){
    const j = deck.findIndex(c=>c.id===keepId);
    idx = j>=0 ? j : Math.min(idx, Math.max(0,deck.length-1));
  } else {
    idx = Math.min(idx, Math.max(0,deck.length-1));
  }
  flipped = false;
}

function renderCard(){
  renderCardStats();
  const card = $('flashcard');
  if(!deck.length){
    $('fcContent').innerHTML = '<div class="empty"><b>No hay tarjetas con estos filtros.</b><br>Ampliá el módulo, el tipo o el estado.</div>';
    $('fcLM').textContent=''; $('fcTipo').textContent=''; $('fcSide').textContent='';
    $('cardPos').textContent = '0 / 0';
    return;
  }
  const c = deck[idx];
  card.classList.toggle('back', flipped);
  $('fcLM').textContent = c.lm;
  $('fcTipo').textContent = VOL.cardTypes[c.tipo];
  const st = progress[c.id]==='know' ? ' · LA SÉ' : (progress[c.id]==='rev' ? ' · A REPASAR' : '');
  $('fcSide').textContent = (flipped ? 'RESPUESTA' : 'PREGUNTA') + st;
  $('fcContent').innerHTML = flipped ? c.a : c.q;
  $('cardPos').textContent = `${idx+1} / ${deck.length}`;
}

function renderCardStats(){
  const total = VOL.flashcards.length;
  const k = VOL.flashcards.filter(c=>progress[c.id]==='know').length;
  const r = VOL.flashcards.filter(c=>progress[c.id]==='rev').length;
  const bar = $('cardBar');
  bar.children[0].style.width = (k/total*100)+'%';
  bar.children[1].style.width = (r/total*100)+'%';
  $('cardCounter').innerHTML =
    `<span><span class="dot k"></span><b>${k}</b> la sé</span>`+
    `<span><span class="dot r"></span><b>${r}</b> a repasar</span>`+
    `<span><span class="dot p"></span><b>${total-k-r}</b> pendientes</span>`;
}

function flip(){ if(!deck.length) return;
  const card=$('flashcard'); card.classList.add('flipping');
  setTimeout(()=>{ flipped=!flipped; renderCard(); card.classList.remove('flipping'); },160);
}
function markCard(status){
  const c = deck[idx]; if(!c) return;
  setStatus(c.id, status);
  if(fEstado==='all'){ rebuildDeck({keepId:c.id}); nextCard(); }
  else { rebuildDeck({clamp:true}); renderCard(); }
  renderProgress();
}
function nextCard(){ if(!deck.length) return; idx=(idx+1)%deck.length; flipped=false; renderCard(); }
function prevCard(){ if(!deck.length) return; idx=(idx-1+deck.length)%deck.length; flipped=false; renderCard(); }
function shuffleDeck(){ for(let i=deck.length-1;i>0;i--){ const j=(Math.random()*(i+1))|0; [deck[i],deck[j]]=[deck[j],deck[i]]; } idx=0; flipped=false; renderCard(); }

/* ================= TRAMPAS ================= */
let tLM, tStar=false, tMode='traps', tDeck=[], tIdx=0, tRevealed=false;

function initTraps(){
  const ids = VOL.lms.map(l=>l.id).filter(id => VOL.traps.some(t=>t.lm===id));
  tLM = new Set(ids); tStar=false; tMode='traps'; tIdx=0; tRevealed=false;
  buildTrapFilters(); rebuildTraps(); renderTrap();
}
function buildTrapFilters(){
  const wrap=$('trapFilters'); wrap.innerHTML='';
  const ids = VOL.lms.map(l=>l.id).filter(id => VOL.traps.some(t=>t.lm===id));
  const r1=row('Módulo');
  r1.appendChild(chip('Todos', tMode==='traps'&&tLM.size===ids.length&&!tStar, ()=>{ tMode='traps'; tLM=new Set(ids); tStar=false; afterTrapFilter(); }));
  ids.forEach(lm=>{
    const n=VOL.traps.filter(t=>t.lm===lm).length;
    r1.appendChild(chip(`${lm}<span class="ct">${n}</span>`, tMode==='traps'&&tLM.has(lm)&&tLM.size<ids.length, ()=>{ tMode='traps'; toggleSet(tLM,lm,ids,afterTrapFilter); }));
  });
  wrap.appendChild(r1);
  const r2=row('Vistas');
  const nStar=VOL.traps.filter(t=>t.star).length;
  r2.appendChild(chip(`★ Destacadas<span class="ct">${nStar}</span>`, tMode==='traps'&&tStar, ()=>{ tMode='traps'; tStar=!tStar; afterTrapFilter(); }, 'star'));
  if(VOL.highlights && VOL.highlights.length)
    r2.appendChild(chip(`⏱ Top ${VOL.highlights.length} (última hora)`, tMode==='top8', ()=>{ tMode = tMode==='top8'?'traps':'top8'; afterTrapFilter(); }));
  wrap.appendChild(r2);
}
function afterTrapFilter(){ buildTrapFilters(); rebuildTraps({clamp:true}); renderTrap(); }
function passTrap(t){ if(!tLM.has(t.lm)) return false; if(tStar && !t.star) return false; return true; }
function rebuildTraps(opt={}){
  if(tMode==='top8'){ tDeck = VOL.highlights.map(h=>({id:'hl'+h.rank, title:h.title, body:h.body, star:false, hl:true})); }
  else { tDeck = VOL.traps.filter(passTrap); }
  tIdx = Math.min(tIdx, Math.max(0,tDeck.length-1)); tRevealed=false;
}
function renderTrap(){
  const total = tMode==='top8' ? tDeck.length : VOL.traps.length;
  const kk = tMode==='top8' ? 0 : VOL.traps.filter(t=>progress[t.id]).length;
  $('trapCounter').innerHTML = tMode==='top8'
    ? `<span>Repaso rápido — ${tDeck.length} claves</span>`
    : `<span><span class="dot k"></span>marcadas <b>${kk}</b> / ${total}</span>`;
  const controls = document.querySelector('#view-traps .controls');
  controls.style.display = tMode==='top8' ? 'none' : 'flex';
  if(!tDeck.length){ $('trapTitle').innerHTML=''; $('trapBody').innerHTML='<div class="empty">Sin trampas con estos filtros.</div>'; $('trapBody').classList.remove('hidden'); $('trapPos').textContent='0 / 0'; return; }
  const t=tDeck[tIdx];
  const badge = t.star ? ' <span class="star-badge">★</span>' : '';
  const st = progress[t.id]==='know' ? ' ✓' : (progress[t.id]==='rev' ? ' ⟳' : '');
  $('trapTitle').innerHTML = `${t.title}${badge}<span style="color:var(--muted);font-weight:400">${st}</span>`;
  const body=$('trapBody'); body.innerHTML=t.body;
  const alwaysShow = tMode==='top8';
  body.classList.toggle('hidden', !alwaysShow && !tRevealed);
  $('trapPos').textContent = `${tIdx+1} / ${tDeck.length}`;
}
function trapReveal(){ tRevealed=true; renderTrap(); }
function trapMark(status){ const t=tDeck[tIdx]; if(!t||t.hl) return; setStatus(t.id,status); rebuildTraps({clamp:true}); tIdx=Math.min(tIdx+1,tDeck.length-1); tRevealed=false; renderTrap(); renderProgress(); }
function trapNext(){ if(!tDeck.length)return; tIdx=(tIdx+1)%tDeck.length; tRevealed=false; renderTrap(); }
function trapPrev(){ if(!tDeck.length)return; tIdx=(tIdx-1+tDeck.length)%tDeck.length; tRevealed=false; renderTrap(); }

/* ================= QUIZ ================= */
let qLM;
function initQuiz(){
  const ids = VOL.lms.map(l=>l.id).filter(id => VOL.problems.some(p=>p.lm===id));
  qLM = new Set(ids);
  buildQuizFilters(); renderQuiz();
}
function buildQuizFilters(){
  const wrap=$('quizFilters'); wrap.innerHTML='';
  const ids = VOL.lms.map(l=>l.id).filter(id => VOL.problems.some(p=>p.lm===id));
  const r=row('Módulo');
  r.appendChild(chip('Todos', qLM.size===ids.length, ()=>{ qLM=new Set(ids); buildQuizFilters(); renderQuiz(); }));
  ids.forEach(lm=>{
    const n=VOL.problems.filter(p=>p.lm===lm).length;
    r.appendChild(chip(`${lm}<span class="ct">${n}</span>`, qLM.has(lm)&&qLM.size<ids.length, ()=>toggleSet(qLM,lm,ids,()=>{buildQuizFilters();renderQuiz();})));
  });
  wrap.appendChild(r);
}
function renderQuiz(){
  const list=$('quizList'); list.innerHTML='';
  const probs=VOL.problems.filter(p=>qLM.has(p.lm));
  if(!probs.length){ list.innerHTML='<div class="empty">Sin problemas con este filtro.</div>'; return; }
  probs.forEach(p=>{
    const item=document.createElement('div'); item.className='qitem';
    item.innerHTML =
      `<div class="qhead"><span class="qn">${p.id.split('-p')[1]}</span><span class="qt">${p.title}</span><span class="qlm">${p.lm}</span></div>`+
      `<div class="qbody"><div class="given">${p.given}</div><div class="ask">${p.ask}</div>`+
      `<button class="btn-sol">Ver solución</button><div class="sol">${p.solution}</div></div>`;
    const head=item.querySelector('.qhead');
    head.onclick=()=>item.classList.toggle('open');
    const btn=item.querySelector('.btn-sol');
    btn.onclick=(e)=>{ e.stopPropagation(); const s=item.querySelector('.sol'); s.classList.toggle('show'); btn.textContent = s.classList.contains('show')?'Ocultar solución':'Ver solución'; };
    list.appendChild(item);
  });
}

/* ================= PROGRESO ================= */
function renderProgress(){
  const cards=VOL.flashcards, traps=VOL.traps;
  const items=[...cards, ...traps];
  const k=items.filter(i=>progress[i.id]==='know').length;
  const r=items.filter(i=>progress[i.id]==='rev').length;
  const total=items.length;
  $('statGrid').innerHTML =
    `<div class="stat k"><div class="big">${k}</div><div class="lab">La sé</div></div>`+
    `<div class="stat r"><div class="big">${r}</div><div class="lab">A repasar</div></div>`+
    `<div class="stat p"><div class="big">${total-k-r}</div><div class="lab">Pendientes</div></div>`;
  const wrap=$('lmProgress'); wrap.innerHTML='';
  VOL.lms.forEach(lm=>{
    const its=items.filter(i=>i.lm===lm.id);
    if(!its.length) return;
    const kk=its.filter(i=>progress[i.id]==='know').length;
    const rr=its.filter(i=>progress[i.id]==='rev').length;
    const pct=Math.round(kk/its.length*100);
    const div=document.createElement('div'); div.className='lmrow';
    div.innerHTML =
      `<div class="lmhead"><span class="name">${lm.id} · ${lm.title}</span><span class="pct">${pct}% dominado · ${its.length} ítems</span></div>`+
      `<div class="progressbar"><div class="k" style="width:${kk/its.length*100}%"></div><div class="r" style="width:${rr/its.length*100}%"></div></div>`;
    wrap.appendChild(div);
  });
}

/* ================= REFERENCIA ================= */
let refIdx=0;
function initRef(){
  const btns=$('refBtns'); btns.innerHTML='';
  (VOL.tables||[]).forEach((t,i)=>{
    const b=document.createElement('button'); b.textContent=t.title; b.className=i===0?'on':'';
    b.onclick=()=>{ refIdx=i; [...btns.children].forEach((x,j)=>x.classList.toggle('on',j===i)); renderRef(); };
    btns.appendChild(b);
  });
  refIdx=0; renderRef();
}
function renderRef(){
  const t=(VOL.tables||[])[refIdx];
  $('refContent').innerHTML = t ? t.html : '<div class="empty">Sin tablas.</div>';
}

/* ================= helpers UI ================= */
function row(label){ const d=document.createElement('div'); d.className='chiprow'; const l=document.createElement('span'); l.className='lbl'; l.textContent=label; d.appendChild(l); return d; }
function chip(html, on, fn, extra){ const b=document.createElement('button'); b.className='chip'+(on?' on':'')+(extra?' '+extra:''); b.innerHTML=html; b.onclick=fn; return b; }
function toggleSet(set, key, all, cb){
  if(set.size===all.length){ set.clear(); set.add(key); }
  else if(set.has(key)){ set.delete(key); if(!set.size) all.forEach(x=>set.add(x)); }
  else set.add(key);
  cb();
}

/* ================= export / import / reset ================= */
function exportProgress(){
  const blob=new Blob([JSON.stringify({app:'cfa-repaso',v:1,progress},null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob); const a=document.createElement('a');
  a.href=url; a.download='cfa-progreso-'+new Date().toISOString().slice(0,10)+'.json'; a.click();
  URL.revokeObjectURL(url);
}
function importProgress(file){
  const rd=new FileReader();
  rd.onload=()=>{ try{ const d=JSON.parse(rd.result); const p=d.progress||d; if(typeof p!=='object') throw 0;
    progress=Object.assign({},progress,p); saveProgress();
    initCards(); initTraps(); renderProgress();
    alert('Progreso importado.');
  }catch(e){ alert('Archivo inválido.'); } };
  rd.readAsText(file);
}
function resetProgress(){
  if(confirm('¿Reiniciar TODO el progreso (la sé / a repasar) de todos los volúmenes?')){
    progress={}; saveProgress(); initCards(); initTraps(); renderProgress();
  }
}

/* ================= navegación de tabs ================= */
function switchView(name){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  $('view-'+name).classList.add('active');
  document.querySelectorAll('#tabbar button').forEach(b=>b.classList.toggle('on', b.dataset.view===name));
  window.scrollTo(0,0);
}

/* ================= wiring ================= */
function wire(){
  $('flashcard').onclick=flip;
  $('btnKnow').onclick=()=>markCard('know');
  $('btnRev').onclick=()=>markCard('rev');
  $('btnNext').onclick=nextCard; $('btnPrev').onclick=prevCard; $('btnShuffle').onclick=shuffleDeck;
  $('btnTrapReveal').onclick=trapReveal;
  $('btnTrapKnow').onclick=()=>trapMark('know'); $('btnTrapRev').onclick=()=>trapMark('rev');
  $('btnTrapNext').onclick=trapNext; $('btnTrapPrev').onclick=trapPrev;
  $('trapcard').onclick=(e)=>{ if(e.target.closest('.body')||e.target.closest('.th')) trapReveal(); };
  $('btnExport').onclick=exportProgress;
  $('btnImport').onclick=()=>$('importFile').click();
  $('importFile').onchange=(e)=>{ if(e.target.files[0]) importProgress(e.target.files[0]); e.target.value=''; };
  $('btnReset').onclick=resetProgress;
  document.querySelectorAll('#tabbar button').forEach(b=>b.onclick=()=>switchView(b.dataset.view));
  document.addEventListener('keydown',(e)=>{
    if(!$('view-cards').classList.contains('active')) return;
    if(e.key===' '){ e.preventDefault(); flip(); }
    else if(e.key==='ArrowRight') nextCard();
    else if(e.key==='ArrowLeft') prevCard();
    else if(e.key==='1') markCard('rev');
    else if(e.key==='2') markCard('know');
  });
}

if('serviceWorker' in navigator){
  window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
}
wire();
boot();
