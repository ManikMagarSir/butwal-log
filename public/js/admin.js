async function load() {
  const us = await api('/api/users');
  document.getElementById('users').innerHTML = us.map((u) =>
    `<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${esc(u.role)}</td>` +
    `<td><button class="ghost" data-role-id="${u._id}" data-role-to="${u.role === 'admin' ? 'user' : 'admin'}">` +
    `Make ${u.role === 'admin' ? 'user' : 'admin'}</button></td></tr>`).join('');
}
async function setRole(id, r) {
  await api('/api/users/' + id + '/role', { method: 'PATCH', body: JSON.stringify({ role: r }) });
  load();
}
function updLinks() {
  const f = document.getElementById('from').value;
  const t = document.getElementById('to').value;
  const q = `?from=${f || ''}&to=${t || ''}`;
  document.getElementById('e1').href = '/api/export/dclogs.csv' + q;
  document.getElementById('e2').href = '/api/export/gensets.csv' + q;
}
document.getElementById('users').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-role-id]');
  if (b) setRole(b.dataset.roleId, b.dataset.roleTo);
});
document.getElementById('from').addEventListener('change', updLinks);
document.getElementById('to').addEventListener('change', updLinks);
(async () => {
  const u = await guard(true);
  if (!u) return;
  nav(u);
  updLinks();
  load();
})();
