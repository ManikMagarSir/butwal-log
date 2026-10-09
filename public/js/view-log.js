// Read-only view of a saved log. Everything rendered here comes from the
// stored document; nothing is editable by design.
document.getElementById('printBtn').addEventListener('click', () => window.print());
document.getElementById('backBtn').addEventListener('click', () => history.back());
function section(title, rows) {
  const body = rows.filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) =>
    `<div class="view-row"><span>${esc(k)}</span><span>${esc(v)}</span></div>`).join('');
  if (!body) return '';
  return `<div class="card"><h2>${esc(title)}</h2>${body}</div>`;
}
function table(title, head, rows) {
  if (!rows.length) return '';
  return `<div class="card"><h2>${esc(title)}</h2><div class="table-scroll"><table>` +
    `<thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>` +
    rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('') +
    `</tbody></table></div></div>`;
}
function num(v) { return v === undefined || v === null || v === '' ? '-' : v; }

async function render() {
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  // kind: dc | gs -> plural API resource: dclogs | gensets
  const kind = params.get('kind') === 'gs' ? 'gs' : 'dc';
  const resource = kind === 'gs' ? 'gensets' : 'dclogs';
  const u = await guard();
  if (!u) return;
  nav(u);
  if (!id) { document.getElementById('title').textContent = 'No log selected'; return; }
  try {
    const log = await api('/api/' + resource + '/' + encodeURIComponent(id));
    document.title = (kind === 'dc' ? 'DC log ' : 'Genset log ') + log.date.slice(0, 10);
    const by = log.createdBy?.name || '';
    document.getElementById('title').textContent = kind === 'dc' ? `${log.time} reading` : 'Genset run';
    document.getElementById('sub').textContent = `${log.date.slice(0, 10)}${kind === 'dc' ? ' at ' + log.time : ' ' + log.startTime + ' to ' + log.endTime}` + (by ? ' | logged by ' + by : '');
    document.getElementById('sections').innerHTML = kind === 'dc' ? dcSections(log) : gsSections(log);
  } catch (e) {
    document.getElementById('title').textContent = 'Could not load this log';
    document.getElementById('sub').textContent = e.message;
  }
}
function dcSections(log) {
  const racks = [...(log.racks || [])].sort((a, b) => a.no - b.no);
  const pac = log.pac || [];
  return section('UPS', [
    ['Status %', num(log.upsStatus)], ['Load A', num(log.upsLoadA)], ['Load B', num(log.upsLoadB)], ['Load C', num(log.upsLoadC)], ['Duty person', log.dutyPerson],
  ]) +
    table('Rack PDU voltages', ['Rack', 'A', 'B'], racks.map((r) => [r.no, num(r.a), num(r.b)])) +
    section('PAC units', ['Temp', 'Humidity'].flatMap((label, i) => pac.map((p) => [`PAC ${p.id} ${label}`, num(p[label === 'Temp' ? 'temp' : 'humidity'])]))) +
    section('Main DB', [
      ['A-AB', num(log.mainsA?.ab)], ['A-BC', num(log.mainsA?.bc)], ['A-CA', num(log.mainsA?.ca)],
      ['B-AB', num(log.mainsB?.ab)], ['B-BC', num(log.mainsB?.bc)], ['B-CA', num(log.mainsB?.ca)],
    ]);
}
function gsSections(log) {
  const side = (label, g) => [
    [`${label} before`, num(g.before)], [`${label} after`, num(g.after)], [`${label} load kW`, num(g.loadKw)], [`${label} fuel %`, num(g.fuelPct)], [`${label} refill before`, num(g.refillBefore)], [`${label} refill after`, num(g.refillAfter)], [`${label} run min`, num(g.runMin)],
  ];
  return section('Run', [
    ['Security', log.securityName], ['Diesel purchase (L)', num(log.dieselPurchase)], ['Stock in drum', num(log.stockDrum)], ['Fuel consumed (L)', num(log.fuelConsumed)], ['Remarks', log.remarks],
  ]) +
    section('Genset 1', side('G1', log.g1 || {})) +
    section('Genset 2', side('G2', log.g2 || {}));
}
render();