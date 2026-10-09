// Accent theme switch. The dark base and logo plaque stay fixed; only the
// accent palette changes. Choice is per device via localStorage;
// ?theme=blue forces one for preview/testing.
(function () {
  const KEY = 'dc-theme';
  const list = ['red', 'blue', 'green'];
  const apply = (t) => document.documentElement.setAttribute('data-theme', t);
  const stored = new URLSearchParams(location.search).get('theme') || localStorage.getItem(KEY);
  apply(list.includes(stored) ? stored : 'red');

  // Mount after the document is parsed, exactly once. The script is loaded at
  // the end of body, but guard anyway so double execution cannot duplicate IDs.
  const mount = () => {
    if (document.getElementById('themeBtn')) return;
    const wrap = document.createElement('span');
    wrap.className = 'theme-btn';
    const btn = document.createElement('button');
    btn.className = 'swatch-btn';
    btn.id = 'themeBtn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Change accent color');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'themePop');
    btn.innerHTML = '<span class="swatch-dot" aria-hidden="true"></span>';
    const pop = document.createElement('span');
    pop.className = 'theme-pop is-hidden';
    pop.id = 'themePop';
    pop.setAttribute('role', 'menu');
    pop.innerHTML = '<p>Accent color</p>' +
      '<button class="swatch sw-red" data-theme-pick="red" aria-label="Red accent" aria-pressed="false"></button>' +
      '<button class="swatch sw-blue" data-theme-pick="blue" aria-label="Blue accent" aria-pressed="false"></button>' +
      '<button class="swatch sw-green" data-theme-pick="green" aria-label="Green accent" aria-pressed="false"></button>';
    wrap.append(btn, pop);
    // Signed-in pages: left of Logout. Auth and landing pages: top-right corner.
    const nav = document.querySelector('nav');
    const logout = document.getElementById('logoutBtn');
    if (nav && logout) nav.insertBefore(wrap, logout);
    else {
      wrap.classList.add('theme-float');
      document.body.appendChild(wrap);
    }
    const close = () => { pop.classList.add('is-hidden'); btn.setAttribute('aria-expanded', 'false'); };
    const mark = (t) => pop.querySelectorAll('[data-theme-pick]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.themePick === t)));
    document.addEventListener('click', (e) => {
      const sw = e.target.closest('[data-theme-pick]');
      if (sw) {
        const t = sw.dataset.themePick;
        localStorage.setItem(KEY, t);
        apply(t);
        mark(t);
        close();
        return;
      }
      if (e.target.closest('#themeBtn')) {
        const hidden = pop.classList.toggle('is-hidden');
        btn.setAttribute('aria-expanded', String(!hidden));
        return;
      }
      if (!e.target.closest('.theme-pop')) close();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    mark(document.documentElement.getAttribute('data-theme'));
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();