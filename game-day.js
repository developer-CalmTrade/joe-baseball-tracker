(() => {
  const G='joeGames_v4',A='joeAttendance_v4';
  const el=id=>document.getElementById(id);
  const read=(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d))}catch{return d}};
  const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const num=id=>Number(el(id)?.value||0),val=id=>(el(id)?.value||'').trim();
  const clean=s=>String(s||'').replace(/^\s*(vs\.?|@)\s*/i,'').trim();
  const norm=s=>clean(s).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  let scheduleId=null,editingId=null;

  function gameFor(event){return games().find(g=>String(g.scheduleId||'')===String(event.id))||games().find(g=>g.date===event.date&&norm(g.opponent)===norm(event.title));}
  function field(label,id,type='number',extra=''){return `<div><label>${label}</label><input id="${id}" type="${type}" ${extra}></div>`;}

  function buildPage(){
    if(el('game-entry'))return;
    const page=document.createElement('section');
    page.id='game-entry';page.className='page';
    page.innerHTML=`<div class="card"><h2 id="geTitle">Enter Game Stats</h2><p class="small">The scheduled date and opponent are filled automatically. Total hits are calculated from 1B, 2B, 3B and HR.</p><div class="grid">${field('Date','geDate','date','required')}${field('Opponent','geOpponent','text')}${field('Final Score','geScore','text','placeholder="11-6"')}<div><label>Result</label><select id="geResult"><option>Win</option><option>Loss</option><option>Tie</option></select></div></div><h3 class="sub">Batting</h3><div class="grid">${field('PA','gePA')}${field('AB','geAB')}${field('1B','ge1B')}${field('2B','ge2B')}${field('3B','ge3B')}${field('HR','geHR')}${field('BB','geBB')}${field('SO','geSO')}${field('RBI','geRBI')}${field('Runs','geRuns')}${field('SB','geSB')}</div><h3 class="sub">Pitching</h3><div class="grid">${field('Innings Pitched','geIP','number','step="0.1"')}${field('Pitch Count','gePC')}${field('Hits Allowed','gePH')}${field('Strikeouts','geK')}${field('Walks Allowed','gePBB')}${field('Earned Runs','geER')}</div><h3 class="sub">Fielding</h3><div class="grid">${field('Total Chances','geTC')}${field('Putouts','gePO')}${field('Assists','geA')}${field('Errors','geE')}</div><label>Notes</label><textarea id="geNotes"></textarea><div class="actions"><button id="geSave" class="btn green" type="button">Save Game Stats</button><button id="geCancel" class="btn gray" type="button">Cancel</button></div></div>`;
    document.querySelector('main').appendChild(page);
    el('geSave').onclick=save;
    el('geCancel').onclick=()=>show('schedule');
  }

  function fill(id,value){if(el(id))el(id).value=value??0;}
  function openStats(id){
    const event=schedule().find(e=>String(e.id)===String(id));if(!event)return;
    const game=gameFor(event);scheduleId=event.id;editingId=game?.id||null;
    el('geTitle').textContent=game?'Edit Game Stats':'Enter Game Stats';
    const singles=game?Math.max(0,Number(game.h||0)-Number(game.b2||0)-Number(game.b3||0)-Number(game.hr||0)):0;
    const values={geDate:event.date,geOpponent:game?.opponent||clean(event.title),geScore:game?.score||'',geResult:game?.result||'Win',gePA:game?.pa||0,geAB:game?.ab||0,ge1B:singles,ge2B:game?.b2||0,ge3B:game?.b3||0,geHR:game?.hr||0,geBB:game?.bb||0,geSO:game?.so||0,geRBI:game?.rbi||0,geRuns:game?.runs||0,geSB:game?.sb||0,geIP:game?.ip||0,gePC:game?.pc||0,gePH:game?.ph||0,geK:game?.k||0,gePBB:game?.pbb||0,geER:game?.er||0,geTC:game?.tc||0,gePO:game?.po||0,geA:game?.a||0,geE:game?.e||0,geNotes:game?.notes||''};
    Object.entries(values).forEach(([k,v])=>fill(k,v));show('game-entry');scrollTo(0,0);
  }
  window.openGameStats=openStats;

  function save(){
    if(!val('geDate')||!val('geOpponent'))return alert('Date and opponent are required.');
    const b1=num('ge1B'),b2=num('ge2B'),b3=num('ge3B'),hr=num('geHR');
    const game={id:editingId||`g${Date.now()}`,scheduleId,date:val('geDate'),opponent:val('geOpponent'),result:val('geResult'),score:val('geScore'),pa:num('gePA'),ab:num('geAB'),h:b1+b2+b3+hr,b2,b3,hr,bb:num('geBB'),so:num('geSO'),rbi:num('geRBI'),runs:num('geRuns'),sb:num('geSB'),ip:num('geIP'),pc:num('gePC'),ph:num('gePH'),k:num('geK'),pbb:num('gePBB'),er:num('geER'),tc:num('geTC'),po:num('gePO'),a:num('geA'),e:num('geE'),notes:val('geNotes')};
    const list=games().filter(g=>String(g.id)!==String(editingId));list.push(game);list.sort((a,b)=>a.date.localeCompare(b.date));write(G,list);
    const attendance=read(A,{});attendance[scheduleId]={...(attendance[scheduleId]||{}),status:'Attended',played:true,pitched:game.ip>0,pitches:game.pc,result:game.result,score:game.score};write(A,attendance);
    renderAll();show('schedule');alert(editingId?'Game stats updated.':'Game stats saved.');
  }

  function addScheduleButtons(){
    const all=schedule(),attendance=window.attendance();
    const upcomingEvents=all.filter(e=>!attendance[e.id]?.status||attendance[e.id].status==='Scheduled');
    const completedEvents=all.filter(e=>attendance[e.id]?.status&&attendance[e.id].status!=='Scheduled').slice().reverse();
    [['upcoming',upcomingEvents],['completed',completedEvents]].forEach(([containerId,events])=>{
      const nodes=[...el(containerId).querySelectorAll(':scope > .event')];
      nodes.forEach((node,index)=>{const event=events[index];if(!event||event.type!=='Game')return;node.querySelector('[data-game-stats]')?.remove();const game=gameFor(event),button=document.createElement('button');button.type='button';button.className='btn green';button.dataset.gameStats=event.id;button.textContent=game?'Edit Game Stats':'Enter Game Stats';button.onclick=()=>openStats(event.id);const actions=document.createElement('div');actions.className='actions';actions.dataset.gameStats='wrap';actions.appendChild(button);node.lastElementChild.appendChild(actions);});
    });
  }

  function ensureBattingTile(label,value,afterLabel){
    const metrics=el('battingMetrics');if(!metrics)return;
    let tile=[...metrics.children].find(n=>n.querySelector('.small')?.textContent.trim()===label);
    if(!tile){tile=document.createElement('div');tile.className='metric';const after=[...metrics.children].find(n=>n.querySelector('.small')?.textContent.trim()===afterLabel);after?.insertAdjacentElement('afterend',tile);}
    tile.innerHTML=`<b>${value}</b><span class="small">${label}</span>`;
  }
  function addBattingTiles(){const t=totals().t;ensureBattingTile('1B',Math.max(0,t.h-t.b2-t.b3-t.hr),'Hits');ensureBattingTile('3B',t.b3,'2B');}

  buildPage();
  const oldSchedule=window.renderSchedule,oldStats=window.renderStats;
  window.renderSchedule=function(){oldSchedule();addScheduleButtons();};
  window.renderStats=function(){oldStats();addBattingTiles();};
  renderAll();
})();