(() => {
  const migrationKey = 'joeWorkflowMigration_v1';
  if (localStorage.getItem(migrationKey) === 'done') return;

  const statusKey = 'joeDevelopmentStatus_v1';
  const developmentKey = 'joeDevelopment_v4';

  try {
    const statuses = JSON.parse(localStorage.getItem(statusKey) || '{}');
    const sessions = JSON.parse(localStorage.getItem(developmentKey) || '[]');
    const july12 = statuses['2026-07-12'];
    const hasJuly12Session = sessions.some(session => session.date === '2026-07-12');

    if (july12?.status === 'Skipped' && !hasJuly12Session) {
      delete statuses['2026-07-12'];
      localStorage.setItem(statusKey, JSON.stringify(statuses));
    }
  } catch (error) {
    console.error('Workflow migration failed', error);
  }

  localStorage.setItem(migrationKey, 'done');
})();