document.getElementById('who').textContent = sessionStorage.getItem('email')
  ? 'Code sent to ' + sessionStorage.getItem('email') + '.'
  : '';
async function go() {
  const email = sessionStorage.getItem('email');
  const otp = document.getElementById('otp').value;
  const m = document.getElementById('msg');
  m.textContent = 'Verifying...';
  m.className = 'mut';
  if (!email) {
    m.textContent = 'Email missing. Go back to login first.';
    m.className = 'err';
    return;
  }
  try {
    await api('/api/auth/verify-otp', { method: 'POST', body: JSON.stringify({ email, otp }) });
    location.href = '/dashboard.html';
  } catch (e) {
    m.textContent = e.message;
    m.className = 'err';
  }
}
document.getElementById('verifyBtn').addEventListener('click', go);
document.getElementById('otp').addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
