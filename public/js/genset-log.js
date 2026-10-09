let USER = null, CUR = 1;
const MAX = 4, DRAFT = 'gs-draft-v1';
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
  let ok = fieldError('date', 'e-date', document.getElementById('date').value ? '' : 'Pick a date. The run needs one to continue.');
  ok = fieldError('sec', 'e-sec', document.getElementById('sec').value.trim() ? '' : 'Security name is required. Enter who ran the genset, then press Next.') && ok;
  ok = fieldError('st', 'e-st', document.getElementById('st').value ? '' : 'Start time is required. Set it, then press Next.') && ok;
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
const t = (id) => document.getElementById(id).value;

function collect() {
  return {
    date: t('date'), securityName: t('sec'), dieselPurchase: v('dp') ?? 0,
    startTime: t('st'), endTime: t('et'),
    g1: { before: v('g1b'), after: v('g1a'), loadKw: v('g1l'), fuelPct: v('g1f'), runMin: v('g1r') },
    g2: { before: v('g2b'), after: v('g2a'), loadKw: v('g2l'), fuelPct: v('g2f'), runMin: v('g2r') },
    stockDrum: v('stock'), fuelConsumed: v('fuel'), remarks: t('rem'),
  };
}

function review() {
  const b = collect();
  document.getElementById('review').innerHTML =
    `<b>${esc(b.date || '?')} ${esc(b.startTime || '')} to ${esc(b.endTime || '')}</b>, ` +
    `${esc(b.securityName || '?')}. Diesel purchase ${b.dieselPurchase} L, ` +
    `G1 run ${b.g1.runMin ?? '-'} min, fuel used <b>${b.fuelConsumed ?? '-'} L</b>.`;
}

function saveDraft() { try { localStorage.setItem(DRAFT, JSON.stringify(collect())); } catch (e) { /* ignore */ } }

function restoreDraft() {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(DRAFT) || 'null'); } catch (e) { /* ignore */ }
  if (!d) return;
  const set = (id, val) => {
    if (val !== undefined && val !== null && document.getElementById(id)) document.getElementById(id).value = val;
  };
  const map = {
    date: 'date', sec: 'securityName', dp: 'dieselPurchase', st: 'startTime', et: 'endTime',
    g1b: 'g1.before', g1a: 'g1.after', g1l: 'g1.loadKw', g1f: 'g1.fuelPct', g1r: 'g1.runMin',
    g2b: 'g2.before', g2a: 'g2.after', g2l: 'g2.loadKw', g2f: 'g2.fuelPct', g2r: 'g2.runMin',
    stock: 'stockDrum', fuel: 'fuelConsumed', rem: 'remarks',
  };
  for (const k of Object.keys(map)) {
    const path = map[k].split('.');
    let val = d;
    for (const p of path) val = val?.[p];
    if (val !== undefined) set(k, val ?? '');
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
    await api('/api/gensets', { method: 'POST', body: JSON.stringify(collect()) });
    localStorage.removeItem(DRAFT);
    m.textContent = 'Saved. Entry is now in History.';
    m.className = 'ok';
    showTab('hist');
  } catch (e) {
    m.textContent = 'Save failed: ' + e.message;
    m.className = 'err';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save';
  }
}

async function load(clear) {
  if (clear) document.getElementById('fdate').value = '';
  const f = document.getElementById('fdate').value;
  const tb = document.getElementById('rows');
  tb.innerHTML = '<tr><td colspan="6"><div class="empty-note">Loading...</div></td></tr>';
  try {
    const d = await api('/api/gensets?limit=31' + (f ? `&date=${f}` : ''));
    tb.innerHTML = d.rows.length ? d.rows.map((r) =>
      `<tr><td>${esc(r.date.slice(0, 10))}</td><td>${esc(r.startTime)}-${esc(r.endTime)}</td>` +
      `<td>${esc(r.securityName)}</td><td>${esc(r.fuelConsumed ?? '')}</td><td>${esc(r.createdBy?.name || '')}</td><td>` +
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
  await api('/api/gensets/' + id, { method: 'DELETE' });
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
  if (view) { window.open('/view-log.html?id=' + encodeURIComponent(view.dataset.view) + '&kind=gs', '_blank', 'noopener'); return; }
  const b = e.target.closest('button[data-del]');
  if (b) del(b.dataset.del);
});

(async () => {
  USER = await guard();
  if (!USER) return;
  nav(USER);
  restoreDraft();
  render();
})();
