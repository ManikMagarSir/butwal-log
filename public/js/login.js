async function go() {
  const email = document.getElementById('email').value;
  const m = document.getElementById('msg');
  m.textContent = 'Sending code...';
  m.className = 'mut';
  try {
    await api('/api/auth/request-otp', { method: 'POST', body: JSON.stringify({ email }) });
    sessionStorage.setItem('email', email);
    location.href = '/verify.html';
  } catch (e) {
    m.textContent = e.message;
    m.className = 'err';
  }
}
document.getElementById('sendBtn').addEventListener('click', go);
document.getElementById('email').addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
