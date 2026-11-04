CREATE DATABASE IF NOT EXISTS db_esawit_cloud;
USE db_esawit_cloud;

DROP TABLE IF EXISTS transaksi_timbangan;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS afdeling;

-- 1. Tabel Akun Petugas (Mandor, Operator, Admin) dengan Status Persetujuan Admin
CREATE TABLE users (
    id_user INT AUTO_INCREMENT PRIMARY KEY,
    nip VARCHAR(30) NOT NULL,
    nama_lengkap VARCHAR(100) NOT NULL,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(50) NOT NULL,
    role ENUM('ADMIN', 'MANDOR', 'OPERATOR') NOT NULL,
    afdeling_tugas VARCHAR(100) DEFAULT '-',
    status_akun ENUM('PENDING', 'APPROVED', 'BLOCKED') DEFAULT 'PENDING',
    waktu_daftar VARCHAR(30) NOT NULL
);

-- Data Awal Akun Petugas (1 Contoh Akun PENDING untuk diuji coba Approve oleh Admin)
INSERT INTO users (nip, nama_lengkap, username, password, role, afdeling_tugas, status_akun, waktu_daftar) VALUES
('ADM-001', 'Ir. Hendra Wijaya', 'admin', 'admin123', 'ADMIN', 'Kantor Pusat / PKS', 'APPROVED', '07:00 WIB'),
('MND-101', 'Budi Santoso', 'mandor1', '123', 'MANDOR', 'Afdeling 1 (Blok Utara)', 'APPROVED', '07:15 WIB'),
('MND-102', 'Suryadi', 'mandor2', '123', 'MANDOR', 'Afdeling 3 (Plasma)', 'PENDING', '07:45 WIB'),
('OPR-201', 'Siti Aminah', 'operator1', '123', 'OPERATOR', 'Pos Jembatan Timbang PKS', 'APPROVED', '07:20 WIB');

-- 2. Tabel Master Afdeling (Blok Kebun)
CREATE TABLE afdeling (
    id_afdeling INT AUTO_INCREMENT PRIMARY KEY,
    kode_afdeling VARCHAR(10) NOT NULL,
    nama_afdeling VARCHAR(100) NOT NULL,
    luas_hektar DECIMAL(6,2) NOT NULL
);

INSERT INTO afdeling (kode_afdeling, nama_afdeling, luas_hektar) VALUES
('AFD-01', 'Afdeling 1 (Blok Utara)', 250.50),
('AFD-02', 'Afdeling 2 (Blok Selatan)', 310.00),
('AFD-03', 'Afdeling 3 (Plasma)', 180.75),
('AFD-04', 'Afdeling 4 (Inti)', 400.00);

-- 3. Tabel Transaksi Panen (Mandor) & Timbangan Pabrik (Operator)
CREATE TABLE transaksi_timbangan (
    id_transaksi INT AUTO_INCREMENT PRIMARY KEY,
    no_tiket VARCHAR(30) NOT NULL,
    nama_afdeling VARCHAR(100) NOT NULL,
    nama_mandor VARCHAR(100) NOT NULL,
    plat_nomor VARCHAR(20) NOT NULL,
    nama_sopir VARCHAR(100) NOT NULL,
    jumlah_janjang INT NOT NULL,
    berat_bruto INT DEFAULT 0,
    berat_tara INT DEFAULT 0,
    potongan_persen INT DEFAULT 0,
    berat_netto INT DEFAULT 0,
    harga_per_kg INT DEFAULT 2800,
    total_harga BIGINT DEFAULT 0,
    status_tiket ENUM('DIKIRIM_MANDOR', 'SELESAI_TIMBANG') DEFAULT 'DIKIRIM_MANDOR',
    operator_timbang VARCHAR(100) DEFAULT '-',
    waktu_input VARCHAR(30) NOT NULL
);

INSERT INTO transaksi_timbangan 
(no_tiket, nama_afdeling, nama_mandor, plat_nomor, nama_sopir, jumlah_janjang, berat_bruto, berat_tara, potongan_persen, berat_netto, harga_per_kg, total_harga, status_tiket, operator_timbang, waktu_input) 
VALUES
('SAW-2026-001', 'Afdeling 1 (Blok Utara)', 'Budi Santoso (MND-101)', 'BM 8124 SA', 'Pak Joko', 450, 14500, 6200, 2, 8134, 2800, 22775200, 'SELESAI_TIMBANG', 'Siti Aminah (OPR-201)', '08:30 WIB'),
('SAW-2026-002', 'Afdeling 2 (Blok Selatan)', 'Budi Santoso (MND-101)', 'BM 4512 KT', 'Pak Anto', 510, 15800, 6400, 0, 9400, 2800, 26320000, 'SELESAI_TIMBANG', 'Siti Aminah (OPR-201)', '09:15 WIB'),
('SAW-2026-003', 'Afdeling 1 (Blok Utara)', 'Budi Santoso (MND-101)', 'BK 9011 XX', 'Pak Udin', 390, 0, 0, 0, 0, 2800, 0, 'DIKIRIM_MANDOR', 'Menunggu Timbangan', '10:10 WIB');