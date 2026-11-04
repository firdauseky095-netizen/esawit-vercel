const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'db_esawit_cloud',
  port: process.env.MYSQL_PORT || 3306,
  connectTimeout: 3000
};

let pool = null;
let isMySQLConnected = false;

// Harga TBS Harian Dinamis (Default Rp 2.850 / Kg, bisa diubah setiap hari oleh Admin/Operator)
let settingHargaHarian = {
  harga_per_kg: 2850,
  terakhir_diubah: 'Hari ini, 07:00 WIB',
  diubah_oleh: 'Admin Kebun'
};

let fallbackUsers = [
  { id_user: 1, nip: 'ADM-001', nama_lengkap: 'Ir. Hendra Wijaya', username: 'admin', password: '123', role: 'ADMIN', afdeling_tugas: 'Kantor Pusat / PKS', status_akun: 'APPROVED', waktu_daftar: '07:00 WIB' },
  { id_user: 2, nip: 'MND-101', nama_lengkap: 'Budi Santoso', username: 'mandor1', password: '123', role: 'MANDOR', afdeling_tugas: 'Afdeling 1 (Blok Utara)', status_akun: 'APPROVED', waktu_daftar: '07:15 WIB' },
  { id_user: 3, nip: 'MND-102', nama_lengkap: 'Suryadi (Calon Mandor)', username: 'mandor2', password: '123', role: 'MANDOR', afdeling_tugas: 'Afdeling 3 (Plasma)', status_akun: 'PENDING', waktu_daftar: '07:45 WIB' },
  { id_user: 4, nip: 'OPR-201', nama_lengkap: 'Siti Aminah', username: 'operator1', password: '123', role: 'OPERATOR', afdeling_tugas: 'Pos Jembatan Timbang PKS', status_akun: 'APPROVED', waktu_daftar: '07:20 WIB' }
];

let fallbackTransaksi = [
  { id_transaksi: 1, no_tiket: "SAW-2026-001", nama_afdeling: "Afdeling 1 (Blok Utara)", nama_mandor: "Budi Santoso (MND-101)", plat_nomor: "BM 8124 SA", nama_sopir: "Pak Joko", jumlah_janjang: 450, berat_bruto: 14500, berat_tara: 6200, potongan_persen: 2, berat_netto: 8134, harga_per_kg: 2850, total_harga: 8134 * 2850, status_tiket: "SELESAI_TIMBANG", operator_timbang: "Siti Aminah (OPR-201)", waktu_input: "08:30 WIB" },
  { id_transaksi: 2, no_tiket: "SAW-2026-002", nama_afdeling: "Afdeling 2 (Blok Selatan)", nama_mandor: "Budi Santoso (MND-101)", plat_nomor: "BM 4512 KT", nama_sopir: "Pak Anto", jumlah_janjang: 510, berat_bruto: 15800, berat_tara: 6400, potongan_persen: 0, berat_netto: 9400, harga_per_kg: 2850, total_harga: 9400 * 2850, status_tiket: "SELESAI_TIMBANG", operator_timbang: "Siti Aminah (OPR-201)", waktu_input: "09:15 WIB" },
  { id_transaksi: 3, no_tiket: "SAW-2026-003", nama_afdeling: "Afdeling 1 (Blok Utara)", nama_mandor: "Budi Santoso (MND-101)", plat_nomor: "BK 9011 XX", nama_sopir: "Pak Udin", jumlah_janjang: 390, berat_bruto: 0, berat_tara: 0, potongan_persen: 0, berat_netto: 0, harga_per_kg: 2850, total_harga: 0, status_tiket: "DIKIRIM_MANDOR", operator_timbang: "Menunggu", waktu_input: "10:10 WIB" }
];

async function initDB() {
  try {
    pool = mysql.createPool(dbConfig);
    const conn = await pool.getConnection();
    isMySQLConnected = true;
    console.log("[DATABASE OK] Terhubung ke MySQL Laragon");
    conn.release();
  } catch (err) {
    isMySQLConnected = false;
    console.log("[CLOUD MODE] MySQL Lokal tidak aktif, menggunakan Cloud Memory");
  }
}
initDB();

module.exports = {
  getPool: () => pool,
  isMySQL: () => isMySQLConnected,
  getHarga: () => settingHargaHarian,
  setHarga: (hargaBaru, petugas) => {
    settingHargaHarian.harga_per_kg = parseInt(hargaBaru);
    settingHargaHarian.terakhir_diubah = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    settingHargaHarian.diubah_oleh = petugas;
  },
  fallbackUsers,
  fallbackTransaksi
};
