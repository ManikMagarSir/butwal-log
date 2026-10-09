async function api(path, opts = {}) {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}
async function me() {
  try { return await api('/api/auth/me'); } catch { return null; }
}
// Output encoder: every value interpolated into innerHTML below goes through esc().
// Server data (names, remarks) is untrusted input and must never hit the DOM raw.
function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
async function guard(adminOnlyPage = false) {
  const u = await me();
  if (!u) { location.href = '/login.html'; return null; }
  if (adminOnlyPage && u.role !== 'admin') { location.href = '/dashboard.html'; return null; }
  return u;
}
function nav(user) {
  const el = document.getElementById('navuser');
  if (el && user) el.textContent = `${user.name} (${user.role})`;
  const adminLink = document.getElementById('adminlink');
  if (adminLink && user?.role !== 'admin') adminLink.classList.add('is-hidden');
}
async function logout() {
  await api('/api/auth/logout', { method: 'POST' });
  location.href = '/login.html';
}
// Every page with a nav logout button uses id="logoutBtn"; wired here so no
// page needs inline handlers (strict CSP blocks inline event attributes).
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('logoutBtn')?.addEventListener('click', logout);
});
