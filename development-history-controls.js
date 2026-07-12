(()=>{
  const originalRenderPlan = window.renderPlan;
  const originalRenderHistory = window.renderHistory;

  const prettyDate = (dateString) => {
    const d = new Date(dateString + 'T12:00:00');
    return d.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  window.undoTodayDevelopment = function(){
    const date