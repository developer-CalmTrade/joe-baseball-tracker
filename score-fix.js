(function(){
  const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,n));
  const get=(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d))}catch{return d}};
  const n=(v)=>Number(v)||0;

  function sessionScore(s){
    if(!s) return 0;
    const minutes=n(s.minutes);
    const rope=n(s.ropeDry)+n(s.ropeBottom)+n(s.ropeTop)+n(s.ropeTwoTee);
    const tee=n(s.gameTee);
    const maxPitches=n(s.maxPitches);
    const maxSolid=n(s.maxSolid);
    const zoneAttempts=n(s.pitchTotal);
    const zoneHits=n(s.holeHits||s.pitchStrikes);
    const radar=n(s.radarPitches);

    // Duration: full credit at 40 minutes.
    const duration=clamp(minutes/40)*15;

    // Breadth: five meaningful training categories. A single drill earns only 4/20.
    const categories=[rope>0,tee>0,maxPitches>0,zoneAttempts>0,radar>0].filter(Boolean).length;
    const breadth=(categories/5)*20;

    // Workload: volume must be completed across the actual equipment/drills.
    const workload=(clamp(rope/60)*8)+(clamp(tee/30)*7)+(clamp(maxPitches/36)*6)+(clamp(zoneAttempts/27)*4);

    // Quality: only measured outcomes earn points. Blank/default fields earn zero.
    let quality=0;
    if(tee>0) quality+=clamp(n(s.gameTeeSolid)/tee)*8;
    if(maxPitches>0) quality+=clamp(maxSolid/maxPitches)*7;
    if(zoneAttempts>0) quality+=clamp(zoneHits/zoneAttempts)*5;

    // Pitching development is intentionally separate and cannot be earned from hitting.
    const pitching=(clamp(zoneAttempts/27)*10)+(clamp(radar/5)*5);

    // Arm feel is a small safety/recovery component, not a free performance bonus.
    const arm={Great:5,Normal:4,Tired:2,Sore:0}[s.armFeel] ?? 0;

    return Math.round(clamp(duration+breadth+workload+quality+pitching+arm));
  }

  function calculateDevelopment(){
    const logs=get('joeDevelopment_v4',[]).slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
    if(!logs.length) return 0;
    const recent=logs.slice(0,6);
    const qualityAverage=recent.reduce((sum,s)=>sum+sessionScore(s),0)/recent.length;

    // Consistency is modest: target four logged sessions in a rolling seven-day period.
    const now=new Date();
    const sevenDaysAgo=new Date(now.getTime()-6*86400000);
    const recentCount=logs.filter(s=>{
      const d=new Date((s.date||'1970-01-01')+'T12:00:00');
      return d>=sevenDaysAgo&&d<=new Date(now.getTime()+86400000);
    }).length;
    const consistency=clamp(recentCount/4)*15;

    // Session quality is 85% of the score; merely saving sessions cannot dominate it.
    return Math.round(clamp(qualityAverage*.85+consistency));
  }

  function grade(x){return x>=90?'Elite':x>=80?'Excellent':x>=70?'Very Good':x>=60?'Good':x>=45?'Developing':x>=25?'Building':'Limited Work';}

  function refresh(){
    const dev=calculateDevelopment();
    const gameEl=document.getElementById('gameScore');
    const game=n(gameEl&&gameEl.textContent);
    const carry=Math.round(clamp(100-Math.abs(dev-game)));
    const pdi=Math.round(dev*.4+game*.4+carry*.2);

    const setText=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value;};
    setText('devScore',dev); setText('devGrade',grade(dev));
    setText('carryScore',carry+'%'); setText('carryGrade',grade(carry));
    setText('pdiScore',pdi); setText('pdiGrade',grade(pdi));

    const note=document.getElementById('pdiNote');
    if(note) note.textContent='PDI = 40% Development + 40% Game Performance + 20% Carryover. Development is based on duration, drill variety, workload, measured quality, pitching work, arm care, and consistency—not simply saving a session.';
  }

  window.JoeDevelopmentScoring={sessionScore,calculateDevelopment,refresh};
  document.addEventListener('DOMContentLoaded',refresh);
  setInterval(refresh,750);
})();
