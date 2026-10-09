let USER = null, CUR = 1;
const MAX = 5, DRAFT = 'dc-draft-v1';
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function rackCard(i) {
  const d = document.createElement('div');
  d.className = 'card';
  d.innerHTML = `<b>Rack ${i}</b><div class="row">` +
    `<input id="ra${i}" type="number" step="0.1" inputmode="decimal" placeholder="A" aria-label="Rack ${i} A volts">` +
    `<input id="rb${i}" type="number" step="0.1" inputmode="decimal" placeholder="B" aria-label="Rack ${i} B volts"></div>`;
  return d;
}
for (let i = 1; i <= 8; i++) document.getElementById('racksA').appendChild(rackCard(i));
for (let i = 9; i <= 16; i++) document.getElementById('racksB').appendChild(rackCard(i));
for (let i = 17; i <= 22; i++) document.getElementById('racksC').appendChild(rackCard(i));
for (const p of ['A', 'B', 'C', 'D']) {
  const d = document.createElement('div');
  d.innerHTML = `<label for="pt${p}">PAC ${p} temp</label>` +
    `<input id="pt${p}" type="number" step="0.1" inputmode="decimal">` +
    `<label for="ph${p}">Humidity</label>` +
    `<input id="ph${p}" type="number" step="0.01" inputmode="decimal">`;
  document.getElementById('pac').appendChild(d);
}
document.getElementById('date').value = new Date().toISOString().slice(0, 10);

function showTab(w) {
  const isNew = w === 'new';
  document.getElementById('pane-new').classList.toggle('active', isNew);
  document.getElementById('pane-hist').classList.toggle('active', !isNew);
  document.getElementById('tabNew').classList.toggle('active', isNew);
  document.getElementById('tabHist').classList.toggle('active', !isNew);
  document.getElementById('tabNew').setAttribute('aria-selected', isNew);
  document.getElementById('tabHist').setAttribute('aria-selected', !isNew);
  if (!isNew) load();
}

function render() {
  document.querySelectorAll('.step').forEach((s) => s.classList.toggle('active', +s.dataset.step === CUR));
  document.querySelectorAll('#stepsLabel span').forEach((s) => {
    const on = +s.dataset.s === CUR;
    s.classList.toggle('on', on);
    if (on) s.setAttribute('aria-current', 'step'); else s.removeAttribute('aria-current');
  });
  document.getElementById('bar').className = 'pw' + CUR;
  document.getElementById('barWrap').setAttribute('aria-valuenow', CUR);
  document.getElementById('stepCount').textContent = `Step ${CUR} of ${MAX}`;
  document.getElementById('backBtn').classList.toggle('is-hidden', CUR === 1);
  document.getElementById('nextBtn').classList.toggle('is-hidden', CUR === MAX);
  document.getElementById('saveBtn').classList.toggle('is-hidden', CUR !== MAX);
  if (CUR === MAX) review();
}

function fieldError(id, errId, message) {
  const el = document.getElementById(id), e = document.getElementById(errId);
  if (message) {
    el.classList.add('invalid');
    e.textContent = message;
    e.hidden = false;
    el.focus();
    return false;
  }
  el.classList.remove('invalid');
  e.hidden = true;
  return true;
}

function validStep1() {
  let ok = fieldError('date', 'e-date', document.getElementById('date').value ? '' : 'Pick a date. The log needs one to continue.');
  ok = fieldError('duty', 'e-duty', document.getElementById('duty').value.trim() ? '' : 'Duty person is required. Enter the name on shift, then press Next.') && ok;
  return ok;
}

function step(d) {
  if (d > 0 && CUR === 1 && !validStep1()) return;
  CUR = Math.min(MAX, Math.max(1, CUR + d));
  render();
  window.scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' });
}

const v = (id) => {
  const el = document.getElementById(id);
  if (!el) return undefined;
  const x = el.value;
  return x === '' || x == null ? undefined : Number(x);
};

function collect() {
  const racks = [];
  for (let i = 1; i <= 22; i++) {
    const a = v('ra' + i), b = v('rb' + i);
    if (a !== undefined || b !== undefined) racks.push({ no: i, a, b });
  }
  const pac = [];
  for (const p of ['A', 'B', 'C', 'D']) {
    const t = v('pt' + p), h = v('ph' + p);
    if (t !== undefined || h !== undefined) pac.push({ id: p, temp: t, humidity: h });
  }
  return {
    date: document.getElementById('date').value, time: document.getElementById('time').value,
    dutyPerson: document.getElementById('duty').value,
    upsStatus: v('ups'), upsLoadA: v('la'), upsLoadB: v('lb'), upsLoadC: v('lc'),
    racks, pac,
    mainsA: { ab: v('aab'), bc: v('abc'), ca: v('aca') },
    mainsB: { ab: v('bab'), bc: v('bbc'), ca: v('bca') },
  };
}

function review() {
  const b = collect();
  document.getElementById('review').innerHTML =
    `<b>${esc(b.date || '?')} ${esc(b.time || '')}</b>, duty ${esc(b.dutyPerson || '?')}, ` +
    `UPS ${b.upsStatus ?? '?'} (A ${b.upsLoadA ?? '-'}, B ${b.upsLoadB ?? '-'}, C ${b.upsLoadC ?? '-'}).<br>` +
    `Racks filled ${b.racks.length} of 22, PAC ${b.pac.length} of 4. ` +
    `Mains A ${b.mainsA.ab ?? '-'}/${b.mainsA.bc ?? '-'}/${b.mainsA.ca ?? '-'}, ` +
    `mains B ${b.mainsB.ab ?? '-'}/${b.mainsB.bc ?? '-'}/${b.mainsB.ca ?? '-'}.`;
}

// Draft autosave: long 22-rack form survives accidental dismissal
function saveDraft() { try { localStorage.setItem(DRAFT, JSON.stringify(collect())); } catch (e) { /* ignore */ } }

function restoreDraft() {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(DRAFT) || 'null'); } catch (e) { /* ignore */ }
  if (!d) return;
  const set = (id, val) => {
    if (val !== undefined && val !== null && val !== '' && document.getElementById(id)) document.getElementById(id).value = val;
  };
  const map = {
    date: 'date', time: 'time', ups: 'upsStatus',
    la: 'upsLoadA', lb: 'upsLoadB', lc: 'upsLoadC',
    aab: 'mainsA.ab', abc: 'mainsA.bc', aca: 'mainsA.ca',
    bab: 'mainsB.ab', bbc: 'mainsB.bc', bca: 'mainsB.ca',
  };
  for (const k of Object.keys(map)) {
    const path = map[k].split('.');
    let val = d;
    for (const p of path) val = val?.[p];
    set(k, val);
  }
  for (let i = 1; i <= 22; i++) {
    const r = (d.racks || []).find((x) => x.no === i);
    if (r) { set('ra' + i, r.a); set('rb' + i, r.b); }
  }
  for (const p of ['A', 'B', 'C', 'D']) {
    const x = (d.pac || []).find((y) => y.id === p);
    if (x) { set('pt' + p, x.temp); set('ph' + p, x.humidity); }
  }
  const m = document.getElementById('msg');
  m.textContent = 'Unsent draft restored. Review it and save when ready.';
  m.className = 'mut';
}
document.addEventListener('input', saveDraft);

async function save() {
  if (!validStep1()) { CUR = 1; render(); return; }
  const btn = document.getElementById('saveBtn'), m = document.getElementById('msg');
  btn.disabled = true;
  btn.textContent = 'Saving';
  m.textContent = 'Saving log...';
  m.className = 'mut';
  try {
    await api('/api/dclogs', { method: 'POST', body: JSON.stringify(collect()) });
    localStorage.removeItem(DRAFT);
    m.textContent = 'Saved. Entry is now in History.';
    m.className = 'ok';
    showTab('hist');
  } catch (e) {
    m.textContent = 'Save failed: ' + e.message;
    m.className = 'err';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save log';
  }
}

async function load(clear) {
  if (clear) document.getElementById('fdate').value = '';
  const f = document.getElementById('fdate').value;
  const tb = document.getElementById('rows');
  tb.innerHTML = '<tr><td colspan="6"><div class="empty-note">Loading...</div></td></tr>';
  try {
    const d = await api('/api/dclogs?limit=31' + (f ? `&date=${f}` : ''));
    tb.innerHTML = d.rows.length ? d.rows.map((r) =>
      `<tr><td>${esc(r.date.slice(0, 10))}</td><td>${esc(r.time)}</td><td>${esc(r.dutyPerson || '')}</td>` +
      `<td>${esc(r.upsStatus ?? '')}</td><td>${esc(r.createdBy?.name || '')}</td><td>` +
      `<button class="ghost" data-view="${r._id}">View</button> ` +
      (USER.role === 'admin'
        ? `<button class="danger" data-del="${r._id}">Delete</button>`
        : '<span class="mut">read only</span>') + '</td></tr>').join('')
      : '<tr><td colspan="6"><div class="empty-note">No entries yet. Add the first one under New entry.</div></td></tr>';
  } catch (e) {
    tb.innerHTML = '<tr><td colspan="6"><div class="empty-note">Could not load history: ' + esc(e.message) + '</div></td></tr>';
  }
}

async function del(id) {
  if (!confirm('Delete this entry? This cannot be undone.')) return;
  await api('/api/dclogs/' + id, { method: 'DELETE' });
  load();
}

document.getElementById('tabNew').addEventListener('click', () => showTab('new'));
document.getElementById('tabHist').addEventListener('click', () => showTab('hist'));
document.getElementById('backBtn').addEventListener('click', () => step(-1));
document.getElementById('nextBtn').addEventListener('click', () => step(1));
document.getElementById('saveBtn').addEventListener('click', save);
document.getElementById('filterBtn').addEventListener('click', () => load());
document.getElementById('clearBtn').addEventListener('click', () => load(true));
document.getElementById('rows').addEventListener('click', (e) => {
  const view = e.target.closest('button[data-view]');
  if (view) { window.open('/view-log.html?id=' + encodeURIComponent(view.dataset.view) + '&kind=dc', '_blank', 'noopener'); return; }
  const b = e.target.closest('button[data-del]');
  if (b) del(b.dataset.del);
});

(async () => {
  USER = await guard();
  if (!USER) return;
  nav(USER);
  document.getElementById('duty').value = USER.name || '';
  restoreDraft();
  document.getElementById('duty').value = USER.name || '';
  render();
})();
