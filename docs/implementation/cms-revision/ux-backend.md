# Backend revisi UX CMS

Implementasi 17 November 2026 mempertahankan endpoint dan tabel CMS existing. Perubahan skema bersifat additive; autentikasi, ticketing, checkout, keuangan, refund, payout, check-in, dan notifikasi tidak diubah.

## Model dan migrasi

Migrasi baru: `apps/api/prisma/migrations/20261117030000_cms_cities_publication/migration.sql`.

`CmsCity` menambahkan tabel `cms_cities` dengan kolom umum versi CMS: `id`, `key`, `draft`, `published`, `status`, `version`, actor pembuat/pengubah/penerbit, serta timestamp. Kolom `slug` memiliki unique index; `key` juga unik. Index `(status, updatedAt)` mengikuti entitas CMS lain.

Migrasi langsung membuat lima kota dengan status PUBLISHED, urutan 0–4, imageKey kosong, dan referensi sprite bawaan:

| Kota       | Slug / ilustrasi bawaan | Preset aksen | Warna renderer |
| ---------- | ----------------------- | ------------ | -------------- |
| Jakarta    | jakarta                 | coral        | #ffab98        |
| Bandung    | bandung                 | blue         | #a9c1ff        |
| Yogyakarta | yogyakarta              | gold         | #f4d08a        |
| Surabaya   | surabaya                | green        | #a2cbb6        |
| Denpasar   | denpasar                | cyan         | #bce8eb        |

Sprite existing tidak digambar atau diunggah ulang. `builtInIllustration` hanya boleh dipertahankan dari dokumen existing yang dimigrasikan; request tidak dapat memasangnya pada kota baru atau mengganti referensinya ke kota bawaan lain.

`apps/api/prisma/cms.seed.ts` menyediakan `seedCmsCities()`, dipanggil oleh seed utama. `createMany(skipDuplicates)` menjaga seed idempotent dan tidak menimpa draft, versi, atau publikasi yang sudah diedit.

## Dokumen kota

Koleksi `cities` memakai endpoint CRUD CMS existing: `GET/POST /admin/cms/cities`, `PATCH/DELETE /admin/cms/cities/:id`, serta `POST /admin/cms/cities/:id/publish` dan `/unpublish`.

```ts
{
  name: string;
  slug: string; // Output backend; input diabaikan dan dihitung dari nama.
  imageKey: string; // '' diperbolehkan.
  accent: 'coral' | 'blue' | 'gold' | 'green' | 'cyan';
  visible: boolean;
  sortOrder: number;
  builtInIllustration?: 'jakarta' | 'bandung' | 'yogyakarta' | 'surabaya' | 'denpasar';
}
```

Penyimpanan mengembalikan `{ item: CmsRecord }` dalam envelope API standar. PATCH wajib menyertakan `expectedVersion`. Kota baru boleh langsung diterbitkan tanpa gambar.

Slug berasal dari nama yang dinormalisasi, dengan suffix `-2`, `-3`, dan seterusnya jika diperlukan. Advisory lock transaksi menserialkan pemilihan slug; pengecekan mencadangkan slug draft maupun snapshot published milik kota lain. Unique index menegakkan slug scalar di database. Mengganti nama memperbarui slug draft; slug published lama tetap dicadangkan sampai snapshot tersebut diganti.

`GET /cms/site` menambahkan `cities` berisi snapshot published yang sudah diurutkan. `visible:false` tetap disertakan agar renderer dapat membedakan semua kota disembunyikan dengan tidak adanya record. Preview Superadmin membaca draft; preview Admin tetap memakai kota published.

Pencarian publik `/events?city=<slug>` menyelesaikan slug CMS published menjadi nama kota. Lima kota lama tetap mengenali alias existing. Referensi sprite hanya memengaruhi ilustrasi, sehingga mengganti nama kota tidak ikut memasukkan event dari kota ilustrasi lamanya.

## Validasi unggahan

Folder baru `cms-cities` pada `POST /uploads` menggunakan service/storage existing dan hanya diizinkan untuk Superadmin.

- MIME dan signature harus cocok: PNG atau WebP.
- Maksimal file input 2 MB.
- Dimensi persegi, minimal 600 × 600 px.
- Sharp memeriksa format/dimensi dan memastikan alpha sungguh mengandung piksel transparan; gambar opaque dengan alpha channel tetap ditolak.
- File disimpan sebagai WebP dengan nama unik. Metadata tersimpan pada MediaAsset, termasuk pemilik, folder, ukuran, dan dimensi.
- Referensi `imageKey` kota wajib berasal dari asset folder `cms-cities`. Gambar umum CMS tidak dapat dipasang untuk melewati validasi ilustrasi kota.

## Publikasi dan riwayat

Semua endpoint berikut memerlukan Admin/Superadmin. Admin hanya boleh menyentuh section `events-for-you`; Superadmin boleh seluruh koleksi, termasuk cities.

`GET /admin/cms/changes`:

```ts
{
  items: Array<{ collection: CmsCollection; id: string; title: string; version: number }>;
}
```

Daftar hanya memuat draft yang berbeda dari published setelah normalisasi skema. Draft identik tidak dihitung sebagai perubahan; record UNPUBLISHED tidak otomatis diterbitkan kembali. Hasil disaring sesuai role.

`POST /admin/cms/publish-all`:

```ts
{
  items: Array<{ collection: CmsCollection; id: string; expectedVersion: number }>;
}
// Response data:
{
  items: Array<{ collection: CmsCollection; item: CmsRecord }>;
}
```

Request berisi 1–200 item unik. Frontend mengirim daftar perubahan yang telah diperiksa pengguna. Seluruh item diproses dalam satu transaksi database dengan urutan lock yang konsisten. Authorization, validasi referensi, dan expectedVersion berlaku untuk tiap item. Satu konflik atau pelanggaran membatalkan seluruh snapshot, versi, FeaturedEvent published, revisi, dan audit pada batch tersebut. API juga menerima subset item yang dipilih secara eksplisit.

`GET /admin/cms/:collection/:id/revisions` mengembalikan `{ items: CmsRevision[] }`, maksimal 50 versi terbaru. Riwayat tunduk pada akses koleksi/item yang sama. Setiap draft tersimpan kini memiliki revisi `SAVE_DRAFT`; action existing `PUBLISH`, `UNPUBLISH`, dan `DELETE` dipertahankan. Nomor versi monoton dan tidak dimundurkan saat membersihkan data QA.

## Periode banner

Dokumen banner menambahkan `startsAt` dan `endsAt`, berupa ISO timestamp dengan timezone atau string kosong. Field boleh dihilangkan untuk kompatibilitas dokumen existing; skema mengisinya dengan string kosong. Jika keduanya diisi, waktu selesai wajib lebih akhir.

Public API menampilkan banner published setelah `startsAt` dan sebelum `endsAt`. Preview Superadmin tetap menampilkan seluruh banner draft agar jadwal mendatang bisa diperiksa. Preview Admin mengikuti jadwal published karena Admin hanya mengubah rekomendasi event.

## Verifikasi

- Migrasi diterapkan ke database development dan test.
- `prisma migrate diff`: tidak ada perbedaan database development dengan skema.
- ESLint backend, API typecheck, dan API build: PASS.
- Full API suite: **20 file / 147 test PASS**; log `/tmp/gofest-cms-ux-api-tests.log`.
- Setelah perbaikan resolusi alias kota berdasarkan nama, targeted `cms-ux.test.ts`: **9/9 PASS**, API typecheck PASS.

Test baru mencakup eksekusi INSERT migrasi lima kota, seed idempotent, slug bersamaan, slug published yang tetap dicadangkan, gambar opsional, pembatasan role dan ilustrasi bawaan, MIME/signature/ukuran/dimensi/transparansi, rollback batch beserta revisi/audit, perubahan yang sudah identik, riwayat sesuai role, jadwal banner, dan pencarian event menggunakan kota baru/hasil rename.
