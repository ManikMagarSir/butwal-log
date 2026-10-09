(async () => {
  const u = await guard();
  if (!u) return;
  nav(u);
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById('todayLine').textContent =
    new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const slots = ['06:00', '14:00', '22:00'];
  try {
    const dcToday = await api('/api/dclogs?date=' + today + '&limit=10');
    const byTime = {};
    for (const r of dcToday.rows) byTime[r.time] = r;
    document.getElementById('coverage').innerHTML = slots.map((s) => {
      const r = byTime[s];
      return r
        ? `<div class="cover-row"><span class="cover-time">${esc(s)}</span>` +
          `<span class="cover-who">${esc(r.dutyPerson)}</span>` +
          `<span class="cover-status logged">Logged</span></div>`
        : `<div class="cover-row"><span class="cover-time">${esc(s)}</span>` +
          `<span class="cover-who">No entry yet</span>` +
          `<span class="cover-status missing">Missing</span></div>`;
    }).join('');
    const recent = await api('/api/dclogs?limit=5');
    document.getElementById('dc').innerHTML = recent.rows.length ? recent.rows.map((r) =>
      `<div>${esc(r.date.slice(0, 10))} ${esc(r.time)}, ${esc(r.dutyPerson)}</div>`).join('')
      : '<div class="mut">No entries yet.</div>';
    const gs = await api('/api/gensets?date=' + today + '&limit=31');
    document.getElementById('gs').innerHTML = gs.rows.length ? gs.rows.map((r) =>
      `<div>${esc(r.startTime)}-${esc(r.endTime)}, ${esc(r.securityName)}</div>`).join('')
      : '<div class="mut">No runs logged today.</div>';
    const fuel = gs.rows.reduce((a, r) => a + (Number(r.fuelConsumed) || 0), 0);
    document.getElementById('fuelLine').textContent = gs.rows.length
      ? `${gs.rows.length === 1 ? '1 run' : gs.rows.length + ' runs'}, ${fuel.toFixed(2)} L used today.`
      : '';
  } catch (e) {
    document.getElementById('coverage').innerHTML = '<div class="mut">Could not load today.</div>';
  }
})();
