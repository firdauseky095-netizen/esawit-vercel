const ICON_EYE_OPEN = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
const ICON_EYE_SLASH = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
const ICON_DOTS_VERTICAL = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1.5"></circle><circle cx="12" cy="12" r="1.5"></circle><circle cx="12" cy="19" r="1.5"></circle></svg>';

function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    btn.innerHTML = ICON_EYE_SLASH;
    btn.title = 'Sembunyikan Sandi';
  } else {
    input.type = 'password';
    btn.innerHTML = ICON_EYE_OPEN;
    btn.title = 'Tampilkan Sandi';
  }
}

function renderFormalEyeIcons() {
  document.querySelectorAll('.eye-btn').forEach(btn => {
    if (!btn.querySelector('svg')) {
      btn.innerHTML = ICON_EYE_OPEN;
      btn.title = 'Tampilkan Sandi';
    }
  });
}

async function initCornerMenu() {
  const header = document.querySelector('.header');
  if (!header || document.getElementById('cornerKebabMenu')) return;

  let user = null;
  let harga = 2850;
  try {
    const res = await fetch('/api/data');
    const data = await res.json();
    user = data.user;
    if (data.settingHarga) harga = data.settingHarga.harga_per_kg;
  } catch (e) {}

  const rightDiv = header.children[1] || document.createElement('div');
  rightDiv.className = 'header-right-wrap';

  const kebabWrap = document.createElement('div');
  kebabWrap.className = 'kebab-container';
  kebabWrap.id = 'cornerKebabMenu';

  let menuItems = '<a href="/" class="kebab-item">🌐 Portal Pantau Publik</a>';

  if (!user) {
    menuItems += `
      <div class="kebab-item locked">🔒 Dashboard Admin (Wajib Login)</div>
      <div class="kebab-item locked">🔒 Dashboard Mandor (Wajib Login)</div>
      <div class="kebab-item locked">🔒 Dashboard Operator (Wajib Login)</div>
      <a href="/#boxLogin" onclick="document.getElementById('lUser')?.focus();" class="kebab-item" style="color:#16a34a;">🔑 Silakan Login Petugas</a>
    `;
  } else {
    if (user.role === 'ADMIN') {
      menuItems += `
        <a href="/admin" class="kebab-item">🛡️ Dashboard Admin (Full Akses)</a>
        <a href="/mandor" class="kebab-item">👷 Buka Panel Mandor</a>
        <a href="/operator" class="kebab-item">⚖️ Buka Panel Operator</a>
      `;
    } else if (user.role === 'MANDOR') {
      menuItems += `
        <a href="/mandor" class="kebab-item">👷 Dashboard Mandor Kebun</a>
        <div class="kebab-item locked">🔒 Panel Operator (Khusus Operator)</div>
        <div class="kebab-item locked">🔒 Panel Admin (Khusus Admin)</div>
      `;
    } else if (user.role === 'OPERATOR') {
      menuItems += `
        <a href="/operator" class="kebab-item">⚖️ Dashboard Operator Timbang</a>
        <div class="kebab-item locked">🔒 Panel Mandor (Khusus Mandor)</div>
        <div class="kebab-item locked">🔒 Panel Admin (Khusus Admin)</div>
      `;
    }
    menuItems += `<a href="/api/logout" class="kebab-item danger">🚪 Keluar / Logout (${user.username})</a>`;
  }

  kebabWrap.innerHTML = `
    <button type="button" class="kebab-btn" id="btnToggleKebab" title="Menu Otoritas & Navigasi">
      ${ICON_DOTS_VERTICAL}
    </button>
    <div class="kebab-dropdown" id="dropdownKebab">
      <div class="kebab-header">
        <b>${user ? user.nama_lengkap : 'Pengunjung Publik (Tamu)'}</b>
        <span>${user ? 'Role: ' + user.role : 'Status: Belum Login'}</span><br>
        <span style="color:#15803d;font-weight:bold;">💰 Harga TBS: Rp ${fmt(harga)} / Kg</span>
      </div>
      ${menuItems}
    </div>
  `;

  rightDiv.appendChild(kebabWrap);

  const btnToggle = document.getElementById('btnToggleKebab');
  const dropdown = document.getElementById('dropdownKebab');

  btnToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('show');
  });
  document.addEventListener('click', () => dropdown.classList.remove('show'));
}

document.addEventListener('DOMContentLoaded', () => {
  renderFormalEyeIcons();
  initCornerMenu();
  const observer = new MutationObserver(() => renderFormalEyeIcons());
  observer.observe(document.body, { childList: true, subtree: true });
});

function fmt(num) { return Number(num || 0).toLocaleString('id-ID'); }
