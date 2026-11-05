const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

let pool = null;
let mysqlConnected = false;

// serverless Vercel
const STORE_PATH = path.join(process.env.VERCEL ? '/tmp' : __dirname, 'esawit_state.json');

const defaultHarga = {
  harga_per_kg: 2850,
  terakhir_diubah: 'Hari ini, 07:00 WIB',
  diubah_oleh: 'Admin Utama (Master)'
};

const defaultUsers = [
  { id_user: 1, nip: 'ADM-001', nama_lengkap: 'Ir. Hendra Wijaya (Admin)', username: 'admin', password: '123', role: 'ADMIN', afdeling_tugas: 'Kantor Pusat PKS', status_akun: 'APPROVED', waktu_daftar: '07:00 WIB' },
  { id_user: 2, nip: 'MND-101', nama_lengkap: 'Budi Santoso', username: 'mandor1', password: '123', role: 'MANDOR', afdeling_tugas: 'Afdeling 1 (Blok Utara)', status_akun: 'APPROVED', waktu_daftar: '07:15 WIB' },
  { id_user: 3, nip: 'OPR-201', nama_lengkap: 'danil', username: 'operator1', password: '123', role: 'OPERATOR', afdeling_tugas: 'Stasiun Timbang 1', status_akun: 'APPROVED', waktu_daftar: '07:20 WIB' },
  { id_user: 4, nip: 'MND-105', nama_lengkap: 'Agus Pratama', username: 'agus_mnd', password: '123', role: 'MANDOR', afdeling_tugas: 'Afdeling 3 (Plasma)', status_akun: 'PENDING', waktu_daftar: '09:10 WIB' }
];

const defaultTransaksi = [
  { id_transaksi: 1, no_tiket: 'SAW-2026-101', nama_afdeling: 'Afdeling 1 (Blok Utara)', nama_mandor: 'Budi Santoso (MND-101)', plat_nomor: 'BM 8821 TU', nama_sopir: 'Pak Slamet', jumlah_janjang: 520, berat_bruto: 14800, berat_tara: 5800, potongan_persen: 2, berat_netto: 8820, harga_per_kg: 2850, total_harga: 25137000, status_tiket: 'SELESAI_TIMBANG', operator_timbang: 'danil (OPR-201)', waktu_input: '08:30 WIB' },
  { id_transaksi: 2, no_tiket: 'SAW-2026-102', nama_afdeling: 'Afdeling 2 (Blok Selatan)', nama_mandor: 'Budi Santoso (MND-101)', plat_nomor: 'BM 9012 QA', nama_sopir: 'Pak Udin', jumlah_janjang: 430, berat_bruto: 0, berat_tara: 0, potongan_persen: 0, berat_netto: 0, harga_per_kg: 2850, total_harga: 0, status_tiket: 'DIKIRIM_MANDOR', operator_timbang: 'Menunggu', waktu_input: '09:15 WIB' }
];

function loadStore() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
    }
  } catch (e) {}
  return {
    settingHarga: { ...defaultHarga },
    fallbackUsers: JSON.parse(JSON.stringify(defaultUsers)),
    fallbackTransaksi: JSON.parse(JSON.stringify(defaultTransaksi))
  };
}

let state = loadStore();

function saveStore() {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(state), 'utf8');
  } catch (e) {}
}

async function initDB() {
  if (process.env.VERCEL) {
    mysqlConnected = false;
    return;
  }
  try {
    pool = mysql.createPool({
      host: '127.0.0.1',
      user: 'root',
      password: '',
      database: 'db_esawit',
      waitForConnections: true,
      connectionLimit: 5
    });
    await pool.query('SELECT 1');
    mysqlConnected = true;
  } catch (err) {
    mysqlConnected = false;
  }
}
initDB();

module.exports = {
  isMySQL: () => mysqlConnected,
  getPool: () => pool,
  getHarga: () => state.settingHarga,
  setHarga: (nominal, oleh) => {
    state.settingHarga.harga_per_kg = parseInt(nominal) || 2850;
    state.settingHarga.terakhir_diubah = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    state.settingHarga.diubah_oleh = oleh;
    saveStore();
  },
  get fallbackUsers() { return state.fallbackUsers; },
  set fallbackUsers(val) { state.fallbackUsers = val; saveStore(); },
  get fallbackTransaksi() { return state.fallbackTransaksi; },
  set fallbackTransaksi(val) { state.fallbackTransaksi = val; saveStore(); },
  saveStore
};
