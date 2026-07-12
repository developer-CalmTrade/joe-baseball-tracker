(() => {
  const frame = document.getElementById('app');
  if (!frame) return;
  const DEV_KEY = 'joeDevelopment_v4';
  const n = v => Number(v || 0);
  const clamp = v => Math.max(0, Math.min(100, Math.round(v)));
  const avg = values => values.length ? values.reduce((a,b)=>a+b,0)/values.length : null;
  const pct = (part,total) => n(total)>0 ? n(part)/n(total)*100 : null;
  const fmt = (v,d=1) => v===null || !Number.isFinite(v) ? '—' : Number(v).toFixed(d);

  const metrics =