const express = require('express');
const router = express.Router();
const db = require('../includes/db');

const sessions = {};

function getUser(req) {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/esawit_user=([^;]+)/);
  if (match) {
    try {
      return JSON.parse(Buffer.from(decodeURIComponent(match[1]), 'base64').toString('utf8'));
    } catch (e) { return null; }
  }
  return null;
}

async function getUsers() {
  if (db.isMySQL()) {
    try { const [r] = await db.getPool().query('SELECT * FROM users ORDER BY id_user DESC'); return r; }
    catch(e) { return db.fallbackUsers; }
  }
  return db.fallbackUsers;
}

async function getTrans() {
  if (db.isMySQL()) {
    try { const [r] = await db.getPool().query('SELECT * FROM transaksi_timbangan ORDER BY id_transaksi DESC'); return r; }
    catch(e) { return db.fallbackTransaksi; }
  }
  return db.fallbackTransaksi;
}

router.get('/data', async (req, res) => {
  const user = getUser(req);
  const transaksi = await getTrans();
  const users = user && user.role === 'ADMIN' ? await getUsers() : [];
  res.json({
    user,
    dbMode: db.isMySQL() ? 'MySQL Laragon' : 'Cloud Memory',
    settingHarga: db.getHarga(),
    transaksi,
    users
  });
});

router.post('/harga-tbs', async (req, res) => {
  const user = getUser(req);
  if (!user || user.role !== 'ADMIN') {
    return res.status(403).json({ ok: false, msg: 'Hanya Admin yang berhak menetapkan harga TBS harian!' });
  }
  const hargaBaru = parseInt(req.body.harga_per_kg);
  if (!hargaBaru || hargaBaru < 100) return res.json({ ok: false, msg: 'Harga tidak valid!' });

  db.setHarga(hargaBaru, `${user.nama_lengkap} (${user.role})`);

  if (req.body.update_semua === true) {
    if (db.isMySQL()) {
      await db.getPool().query("UPDATE transaksi_timbangan SET harga_per_kg = ?, total_harga = berat_netto * ? WHERE status_tiket = 'SELESAI_TIMBANG'", [hargaBaru, hargaBaru]);
    } else {
      db.fallbackTransaksi.forEach(t => {
        t.harga_per_kg = hargaBaru;
        if (t.status_tiket === 'SELESAI_TIMBANG') t.total_harga = t.berat_netto * hargaBaru;
      });
    }
  }
  res.json({ ok: true, settingHarga: db.getHarga() });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const users = await getUsers();
  const found = users.find(u => u.username === username && u.password === password);
  if (!found) return res.json({ ok: false, msg: 'Username / Password salah!' });
  if (found.status_akun === 'PENDING') return res.json({ ok: false, msg: 'AKSES DITOLAK: Akun masih PENDING, menunggu persetujuan Admin!' });
  if (found.status_akun === 'BLOCKED') return res.json({ ok: false, msg: 'AKSES DIBLOKIR oleh Admin!' });

  const token = encodeURIComponent(Buffer.from(JSON.stringify(found)).toString('base64'));
  res.setHeader('Set-Cookie', `esawit_user=${token}; Path=/; Max-Age=86400; HttpOnly; SameSite=Lax`);

  let red = '/';
  if (found.role === 'ADMIN') red = '/admin';
  if (found.role === 'MANDOR') red = '/mandor';
  if (found.role === 'OPERATOR') red = '/operator';
  res.json({ ok: true, redirectUrl: red });
});

router.get('/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'esawit_user=; Path=/; Max-Age=0');
  res.redirect('/');
});

router.post('/register', async (req, res) => {
  const { nip, nama_lengkap, username, password, role, afdeling_tugas } = req.body;
  const waktu = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
  if (db.isMySQL()) {
    try {
      await db.getPool().query("INSERT INTO users (nip, nama_lengkap, username, password, role, afdeling_tugas, status_akun, waktu_daftar) VALUES (?,?,?,?,?,?,'PENDING',?)", [nip, nama_lengkap, username, password, role, afdeling_tugas, waktu]);
    } catch(e) { return res.json({ ok: false, msg: 'Username sudah terdaftar!' }); }
  } else {
    db.fallbackUsers.unshift({ id_user: Date.now(), nip, nama_lengkap, username, password, role, afdeling_tugas, status_akun: 'PENDING', waktu_daftar: waktu });
  }
  res.json({ ok: true, msg: 'Pendaftaran berhasil dikirim! Menunggu persetujuan Admin.' });
});

// ENDPOINT UPDATE PROFIL ADMIN SENDIRI
router.post('/admin/update-profile', async (req, res) => {
  const user = getUser(req);
  if (!user || user.role !== 'ADMIN') return res.status(403).json({ ok: false, msg: 'Akses ditolak!' });
  const { nama_lengkap, username, password } = req.body;

  user.nama_lengkap = nama_lengkap;
  user.username = username;
  if (password && password.trim() !== '') user.password = password;

  if (db.isMySQL()) {
    if (password && password.trim() !== '') {
      await db.getPool().query("UPDATE users SET nama_lengkap=?, username=?, password=? WHERE id_user=?", [nama_lengkap, username, password, user.id_user]);
    } else {
      await db.getPool().query("UPDATE users SET nama_lengkap=?, username=? WHERE id_user=?", [nama_lengkap, username, user.id_user]);
    }
  } else {
    const target = db.fallbackUsers.find(u => u.id_user === user.id_user);
    if (target) {
      target.nama_lengkap = nama_lengkap;
      target.username = username;
      if (password && password.trim() !== '') target.password = password;
    }
  }
  const newToken = encodeURIComponent(Buffer.from(JSON.stringify(user)).toString('base64'));
  res.setHeader('Set-Cookie', `esawit_user=${newToken}; Path=/; Max-Age=86400; HttpOnly; SameSite=Lax`);
  res.json({ ok: true, msg: 'Profil berhasil diperbarui!' });
});

router.post('/admin/create-user', async (req, res) => {
  const user = getUser(req);
  if (!user || user.role !== 'ADMIN') return res.status(403).json({ ok: false });
  const { nip, nama_lengkap, username, password, role, afdeling_tugas } = req.body;
  const waktu = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
  if (db.isMySQL()) {
    await db.getPool().query("INSERT INTO users (nip, nama_lengkap, username, password, role, afdeling_tugas, status_akun, waktu_daftar) VALUES (?,?,?,?,?,?,'APPROVED',?)", [nip, nama_lengkap, username, password, role, afdeling_tugas, waktu]);
  } else {
    db.fallbackUsers.unshift({ id_user: Date.now(), nip, nama_lengkap, username, password, role, afdeling_tugas, status_akun: 'APPROVED', waktu_daftar: waktu });
  }
  res.json({ ok: true });
});

router.post('/admin/user-status', async (req, res) => {
  const user = getUser(req);
  if (!user || user.role !== 'ADMIN') return res.status(403).json({ ok: false });
  const { id_user, aksi } = req.body;
  if (aksi === 'DELETE') {
    if (db.isMySQL()) await db.getPool().query("DELETE FROM users WHERE id_user = ? AND role != 'ADMIN'", [id_user]);
    else db.fallbackUsers = db.fallbackUsers.filter(u => u.id_user !== parseInt(id_user) || u.role === 'ADMIN');
  } else {
    if (db.isMySQL()) await db.getPool().query("UPDATE users SET status_akun = ? WHERE id_user = ?", [aksi, id_user]);
    else {
      const t = db.fallbackUsers.find(u => u.id_user === parseInt(id_user));
      if (t) t.status_akun = aksi;
    }
  }
  res.json({ ok: true });
});

router.post('/mandor/spb', async (req, res) => {
  const user = getUser(req);
  if (!user || (user.role !== 'MANDOR' && user.role !== 'ADMIN')) return res.status(403).json({ ok: false });
  const { afdeling, plat, sopir, janjang } = req.body;
  const tiket = 'SAW-2026-' + Math.floor(100 + Math.random() * 900);
  const waktu = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
  const mandor = `${user.nama_lengkap} (${user.nip})`;
  const hargaAktif = db.getHarga().harga_per_kg;

  if (db.isMySQL()) {
    await db.getPool().query("INSERT INTO transaksi_timbangan (no_tiket, nama_afdeling, nama_mandor, plat_nomor, nama_sopir, jumlah_janjang, harga_per_kg, status_tiket, operator_timbang, waktu_input) VALUES (?,?,?,?,?,?,?,'DIKIRIM_MANDOR','Menunggu',?)", [tiket, afdeling, mandor, plat.toUpperCase(), sopir, parseInt(janjang), hargaAktif, waktu]);
  } else {
    db.fallbackTransaksi.unshift({ id_transaksi: Date.now(), no_tiket: tiket, nama_afdeling: afdeling, nama_mandor: mandor, plat_nomor: plat.toUpperCase(), nama_sopir: sopir, jumlah_janjang: parseInt(janjang), berat_bruto: 0, berat_tara: 0, potongan_persen: 0, berat_netto: 0, harga_per_kg: hargaAktif, total_harga: 0, status_tiket: 'DIKIRIM_MANDOR', operator_timbang: 'Menunggu', waktu_input: waktu });
  }
  res.json({ ok: true });
});

router.post('/mandor/edit-spb', async (req, res) => {
  const user = getUser(req);
  if (!user || (user.role !== 'MANDOR' && user.role !== 'ADMIN')) return res.status(403).json({ ok: false });
  const { id_transaksi, afdeling, plat, sopir, janjang } = req.body;

  if (db.isMySQL()) {
    await db.getPool().query("UPDATE transaksi_timbangan SET nama_afdeling=?, plat_nomor=?, nama_sopir=?, jumlah_janjang=? WHERE id_transaksi=?", [afdeling, plat.toUpperCase(), sopir, parseInt(janjang), parseInt(id_transaksi)]);
  } else {
    const item = db.fallbackTransaksi.find(t => t.id_transaksi === parseInt(id_transaksi));
    if (item) {
      item.nama_afdeling = afdeling;
      item.plat_nomor = plat.toUpperCase();
      item.nama_sopir = sopir;
      item.jumlah_janjang = parseInt(janjang);
    }
  }
  res.json({ ok: true });
});

router.post('/operator/timbang', async (req, res) => {
  const user = getUser(req);
  if (!user || (user.role !== 'OPERATOR' && user.role !== 'ADMIN')) return res.status(403).json({ ok: false });
  const { id_transaksi, bruto, tara, potongan } = req.body;
  const hargaDipakai = db.getHarga().harga_per_kg;
  const selisih = Math.max(0, parseInt(bruto) - parseInt(tara));
  const potKg = Math.round(selisih * ((parseInt(potongan) || 0) / 100));
  const netto = selisih - potKg;
  const total = netto * hargaDipakai;
  const op = `${user.nama_lengkap} (${user.nip})`;

  if (db.isMySQL()) {
    await db.getPool().query("UPDATE transaksi_timbangan SET berat_bruto=?, berat_tara=?, potongan_persen=?, berat_netto=?, harga_per_kg=?, total_harga=?, status_tiket='SELESAI_TIMBANG', operator_timbang=? WHERE id_transaksi=?", [parseInt(bruto), parseInt(tara), parseInt(potongan), netto, hargaDipakai, total, op, parseInt(id_transaksi)]);
  } else {
    const item = db.fallbackTransaksi.find(t => t.id_transaksi === parseInt(id_transaksi));
    if (item) {
      item.berat_bruto = parseInt(bruto);
      item.berat_tara = parseInt(tara);
      item.potongan_persen = parseInt(potongan);
      item.berat_netto = netto;
      item.harga_per_kg = hargaDipakai;
      item.total_harga = total;
      item.status_tiket = 'SELESAI_TIMBANG';
      item.operator_timbang = op;
    }
  }
  res.json({ ok: true });
});

router.post('/admin/edit-full', async (req, res) => {
  const user = getUser(req);
  if (!user || user.role !== 'ADMIN') return res.status(403).json({ ok: false });
  const { id_transaksi, afdeling, plat, sopir, janjang, bruto, tara, potongan, harga_per_kg } = req.body;
  const hrg = parseInt(harga_per_kg) || db.getHarga().harga_per_kg;
  const selisih = Math.max(0, parseInt(bruto) - parseInt(tara));
  const potKg = Math.round(selisih * ((parseInt(potongan) || 0) / 100));
  const netto = selisih - potKg;
  const total = netto * hrg;
  const status = parseInt(bruto) > 0 ? 'SELESAI_TIMBANG' : 'DIKIRIM_MANDOR';

  if (db.isMySQL()) {
    await db.getPool().query(
      "UPDATE transaksi_timbangan SET nama_afdeling=?, plat_nomor=?, nama_sopir=?, jumlah_janjang=?, berat_bruto=?, berat_tara=?, potongan_persen=?, berat_netto=?, harga_per_kg=?, total_harga=?, status_tiket=? WHERE id_transaksi=?",
      [afdeling, plat.toUpperCase(), sopir, parseInt(janjang), parseInt(bruto), parseInt(tara), parseInt(potongan), netto, hrg, total, status, parseInt(id_transaksi)]
    );
  } else {
    const item = db.fallbackTransaksi.find(t => t.id_transaksi === parseInt(id_transaksi));
    if (item) {
      item.nama_afdeling = afdeling; item.plat_nomor = plat.toUpperCase(); item.nama_sopir = sopir;
      item.jumlah_janjang = parseInt(janjang); item.berat_bruto = parseInt(bruto); item.berat_tara = parseInt(tara);
      item.potongan_persen = parseInt(potongan); item.berat_netto = netto; item.harga_per_kg = hrg;
      item.total_harga = total; item.status_tiket = status;
    }
  }
  res.json({ ok: true });
});

router.post('/delete-transaksi', async (req, res) => {
  const user = getUser(req);
  if (!user) return res.status(403).json({ ok: false });
  const id = parseInt(req.body.id_transaksi);

  if (db.isMySQL()) {
    if (user.role === 'ADMIN') {
      await db.getPool().query('DELETE FROM transaksi_timbangan WHERE id_transaksi = ?', [id]);
    } else if (user.role === 'MANDOR') {
      await db.getPool().query("DELETE FROM transaksi_timbangan WHERE id_transaksi = ? AND status_tiket = 'DIKIRIM_MANDOR'", [id]);
    }
  } else {
    db.fallbackTransaksi = db.fallbackTransaksi.filter(t => {
      if (t.id_transaksi !== id) return true;
      if (user.role === 'ADMIN') return false;
      if (user.role === 'MANDOR' && t.status_tiket === 'DIKIRIM_MANDOR') return false;
      return true;
    });
  }
  res.json({ ok: true });
});

module.exports = { router, getUser };
