# DESIGN.md

Arah desain ini mengikat seluruh halaman Gofest. Baca bersama `antislop` sebelum membuat komponen atau halaman baru.

## 1. Design read

> Reading this as: platform ticketing event untuk penonton dan organizer di Indonesia, dengan bahasa visual editorial event guide, dial ENERGY 2 / RHYTHM 3 / MOTION 1 untuk halaman publik dan ENERGY 1 / RHYTHM 1 / MOTION 1 untuk workspace.

Gofest terasa seperti majalah acara yang serius, bukan template SaaS. Poster dan tipografi membawa identitas. Struktur dibuat untuk membantu orang memilih acara dan menyelesaikan pembelian, bukan untuk mengisi section.

## 2. Prinsip yang tidak boleh dilanggar

1. Satu focal point per layar. Sisanya memberi jalan.
2. Poster event adalah materi visual utama. Jangan menggantinya dengan ilustrasi 3D, blob, atau stok foto generik.
3. Komposisi mengikuti kebutuhan konten. Tidak semua section berbentuk grid kartu yang sama.
4. Data yang ditampilkan harus berasal dari database. Tidak ada statistik, testimoni, logo partner, atau avatar rekaan.
5. Setiap kontrol harus bekerja. Tidak ada tautan `#`, tombol hiasan, atau menu tanpa tujuan.
6. Light theme adalah keputusan brand, bukan keterbatasan. Permukaan paper, tinta gelap, dan aksen vermilion adalah identitas.
7. Motion hanya untuk menjelaskan perubahan state atau orientasi. Tidak ada animasi dekoratif yang berjalan terus.
8. Aksesibilitas bukan lapisan akhir. Kontras, keyboard, focus, label, dan touch target masuk sejak komponen pertama.

## 3. Palet

| Token       | Nilai     | Peran                                                 |
| ----------- | --------- | ----------------------------------------------------- |
| Paper       | `#F5F2EA` | Latar utama, ruang baca                               |
| Ink         | `#191B1A` | Teks utama, garis tegas, tombol netral                |
| Vermilion   | `#D9573F` | Aksen editorial, garis, penanda tanggal, elemen besar |
| Brick       | `#B8432C` | Tombol aksi utama, aman untuk teks paper              |
| Olive       | `#65735D` | Informasi sekunder, label, status tenang              |
| Warm border | `#D9D4CA` | Pemisah dan border                                    |
| Warm muted  | `#EDE8DD` | Permukaan sekunder                                    |

Aturan kontras:

- Teks normal memakai Ink atau Olive di atas Paper.
- Vermilion hanya untuk teks besar (di atas 18px), garis, ikon non-teks, dan aksen. Jangan memakai Vermilion sebagai latar teks kecil berwarna Paper.
- Tombol utama memakai Brick dengan teks Paper.
- Status memakai teks dan ikon, bukan warna saja.

Tidak ada gradient biru-ungu, glow, glassmorphism, atau dark mode setengah jadi. Shadow hanya untuk elemen yang benar-benar terangkat, seperti dialog dan sticky purchase panel.

## 4. Tipografi

- **Manrope Variable** untuk UI, label, tabel, dan body. Dipilih karena netral, terbaca di ukuran kecil, dan tidak terasa seperti font default template.
- **Instrument Serif** hanya untuk headline editorial dan angka besar. Tidak dipakai untuk tombol, label form, atau isi tabel.
- **IBM Plex Mono** tidak dipakai sebagai tema. Kode tiket dan order memakai Manrope dengan tabular numerals agar tetap konsisten.

Skala:

| Peran           | Ukuran         | Catatan                            |
| --------------- | -------------- | ---------------------------------- |
| Hero display    | 56 sampai 88px | Instrument Serif, line-height 0.95 |
| Section display | 36 sampai 56px | Instrument Serif                   |
| Heading         | 24 sampai 32px | Manrope 700                        |
| Body            | 15 sampai 17px | Manrope 400, line-height 1.65      |
| Label           | 12 sampai 13px | Manrope 600, tanpa uppercase lebar |
| Data            | 14px           | tabular numerals                   |

## 5. Spacing, radius, elevation

- Spacing mengikuti skala 4px. Section memakai 64, 80, atau 96px di desktop dan 40 sampai 56px di mobile.
- Radius: 4px untuk input kecil, 8px untuk tombol dan panel, 12px untuk dialog. Tidak semua elemen pill.
- Border 1px adalah pemisah utama. Shadow hanya untuk dialog, dropdown, dan panel pembelian sticky.
- Grid 12 kolom di desktop, 4 kolom di mobile. Lebar baca maksimal 68 karakter.

## 6. Identitas visual

Motif: **ticket stub dan halaman event guide**.

- Garis perforasi tipis boleh dipakai pada tiket digital dan ringkasan order, tidak di semua kartu.
- Tanggal event ditampilkan sebagai blok tipografi besar, bukan badge kecil.
- Poster event memakai rasio 4:5. Jika belum ada gambar, tampilkan poster tipografi dari judul, tanggal, kota, dan kategori. Jangan memakai placeholder abu-abu.
- Nomor dan kode tiket memakai tabular numerals dan garis pemisah.
- Ikon dari `lucide-react` dipakai fungsional, bukan dekorasi. Tidak ada sparkle, magic, robot, atau orb.

## 7. Halaman publik

### Homepage

- Pembuka berupa pencarian dan satu poster event utama, bukan headline generik dengan dua tombol.
- Urutan: pembuka editorial, pencarian, event yang sedang dijual, kategori sebagai indeks teks, event terdekat, ajakan organizer.
- Tidak ada logo partner, testimoni, atau angka statistik palsu.
- Event yang tidak tersedia tetap ditampilkan dengan status jelas, bukan disembunyikan diam-diam.

### Event discovery

- Filter di rail kiri pada desktop, sheet pada mobile.
- Hasil memakai baris editorial: poster kecil, judul, tanggal, venue, harga, ketersediaan.
- URL menyimpan filter. Empty state memberi aksi reset dan saran memperluas pencarian.

### Event detail

- Poster besar, judul, waktu, venue, organizer, deskripsi, aturan.
- Panel tiket sticky di desktop dan bar pembelian di mobile.
- Harga, sisa kuota, dan periode penjualan terlihat sebelum checkout.
- Sold out tetap bisa dibaca, tombol beli diganti penjelasan.

### Checkout

- Satu kolom di mobile, dua kolom di desktop.
- Ringkasan biaya selalu terlihat, termasuk diskon dan biaya platform.
- Tidak ada biaya tersembunyi yang muncul setelah konfirmasi.
- Form memakai label terlihat, error di dekat field, dan tombol submit dengan loading state.

### Order dan tiket

- Order pending menampilkan countdown, instruksi, dan tombol cek status.
- Tiket digital terasa seperti tiket fisik: tipografi besar, kode, QR, status, dan tombol cetak.
- Halaman tiket dapat dicetak tanpa navigasi dan elemen dekoratif.

## 8. Workspace

Workspace lebih tenang dari halaman publik.

- Organizer dashboard: status event, penjualan, sisa kuota, order terbaru, check-in. Tanpa chart jika data belum cukup.
- Tabel padat, filter jelas, aksi baris tidak tersembunyi di balik ikon tanpa label.
- Form event dibagi menjadi bagian: informasi, waktu dan lokasi, tiket, publikasi. Save state jelas.
- Admin panel utilitarian. Jangan menyalin hero homepage.
- Scanner check-in: hasil scan besar, teks jelas, warna plus ikon plus teks, dan `aria-live`.

## 9. Motion

- Hover dan focus: 120 sampai 160ms.
- Dialog, sheet, dan dropdown: 180 sampai 220ms.
- Tidak ada infinite float, pulse, atau parallax.
- `prefers-reduced-motion: reduce` mematikan transisi non-esensial.

## 10. Copy

- Bahasa Indonesia, ringkas, spesifik.
- Hindari "seamless", "next level", "revolusioner", "unlock", "experience terbaik".
- CTA menjelaskan aksi: "Pilih tiket", "Lanjut ke pembayaran", "Unduh tiket", "Buka scanner".
- Jangan memakai em dash.
- Empty state menjelaskan apa yang kosong dan langkah berikutnya.
- Error menjelaskan apa yang gagal dan apa yang bisa dilakukan.

## 11. Checklist sebelum halaman dianggap selesai

- Ada loading, empty, dan error state.
- Mobile 360px tidak overflow.
- Semua kontrol bisa dijangkau keyboard dan punya focus terlihat.
- Kontras teks memenuhi WCAG AA.
- Semua gambar punya dimensi dan alt yang sesuai.
- Tidak ada data rekaan yang terlihat nyata.
- Tidak ada tombol atau tautan mati.
- Motion menghormati reduced motion.
