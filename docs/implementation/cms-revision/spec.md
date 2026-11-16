# GOFEST — DASHBOARD IMPROVEMENTS & FULL CMS IMPLEMENTATION

## OBJECTIVE

Lakukan pengembangan dan perbaikan lanjutan pada project GOFEST berdasarkan kondisi repository saat ini.

Ini merupakan **revision task**, bukan pembuatan ulang project.

Pertahankan seluruh fitur yang sudah berjalan, termasuk:
- Authentication dan authorization.
- Role Superadmin, Admin, dan Creator/EO.
- Dashboard masing-masing role.
- Event Management.
- Transaction Management.
- Financial Management.
- Payout & Withdrawal Management.
- Notification System.
- Existing website dan ticketing flow.

Jangan menghapus, mengganti, atau merusak fitur existing yang tidak berkaitan dengan pekerjaan ini.

Fokus utama revisi:

1. Memperbaiki upload banner pada form Create Event.
2. Membuat pengaturan section "Event Seru Untukmu" pada Admin Dashboard.
3. Memperbaiki skeleton loading agar hanya berlaku pada konten halaman.
4. Mempertahankan posisi scroll sidebar ketika berpindah halaman.
5. Menambahkan notification badge pada masing-masing menu sidebar.
6. Mengimplementasikan upload foto profil dan banner Organizer untuk Creator.
7. Membangun Website CMS yang benar-benar berfungsi dengan kontrol penuh untuk Superadmin.

---

# 1. FIX EVENT BANNER UPLOAD

Saat ini Creator belum bisa menambahkan banner ketika membuat acara.

Perbaiki form Create Event agar Creator dapat mengunggah gambar banner untuk setiap event.

### Required Features

- Tambahkan field upload Event Banner pada form Create Event.
- Mendukung format JPG, JPEG, PNG, dan WEBP.
- Tampilkan image preview sebelum disimpan.
- Sediakan tombol untuk mengganti gambar.
- Sediakan tombol untuk menghapus gambar sebelum submit.
- Tampilkan loading state ketika upload berlangsung.
- Tampilkan pesan error apabila file tidak valid.
- Tampilkan gambar banner pada halaman detail event dan halaman publik.
- Banner harus tetap tersimpan ketika Creator membuka kembali halaman edit event.

### Image Validation

Terapkan validasi:
- Format file harus didukung.
- Maksimal ukuran file 8 MB.
- Tolak file yang bukan gambar valid.
- Gunakan validasi MIME type dan file signature di backend.
- Gunakan nama file unik.
- Hindari filename collision.

Sediakan rekomendasi dimensi banner sekitar 1920 × 800 px dengan aspect ratio yang sesuai desain website.

### Backend Requirements

- Integrasikan upload dengan backend yang sudah ada.
- Simpan file menggunakan sistem storage project saat ini.
- Simpan URL/path file pada database melalui relasi event.
- Jangan menyimpan gambar sebagai Base64 di database.
- Pastikan file dapat diakses oleh halaman publik.
- Pastikan Creator hanya dapat mengubah banner event miliknya sendiri.

Jika sistem storage belum tersedia, buat storage service abstraction agar development dapat menggunakan local storage dan nantinya bisa dipindahkan ke object storage tanpa mengubah business logic.

---

# 2. EVENT SERU UNTUKMU MANAGEMENT

Saat ini Admin belum bisa mengatur bagian "Event Seru Untukmu" yang tampil di halaman utama website GOFEST.

Buat fitur pengelolaan khusus pada Admin Dashboard.

Menu dapat ditempatkan di:

Content Management → Featured Events / Event Seru Untukmu.

### Admin Features

Admin dan Superadmin dapat:

1. Mengaktifkan atau menonaktifkan section.
2. Mengubah judul section.
3. Mengubah subtitle atau deskripsi.
4. Memilih event yang ingin ditampilkan.
5. Menghapus event dari daftar featured.
6. Mengatur urutan event.
7. Mengatur jumlah maksimal event yang ditampilkan.
8. Melihat preview section sebelum dipublikasikan.

### Event Selection

Buat interface untuk memilih event dari database.

Tampilkan informasi:
- Event banner.
- Event name.
- Organizer.
- Event category.
- Event date.
- Event location.
- Event status.

Gunakan searchable event selector agar Admin mudah menemukan event.

Hanya event yang sudah APPROVED/PUBLISHED dan aktif yang boleh dimasukkan ke dalam section ini.

### Display Configuration

Sediakan pengaturan:
- Section visibility.
- Section title.
- Section description.
- Featured event list.
- Display order.
- Maximum visible events.

### Important

Konfigurasi ini harus benar-benar memengaruhi section "Event Seru Untukmu" pada website publik GOFEST.

Jangan hanya membuat halaman CRUD yang tidak memiliki hubungan dengan frontend website.

Ketika Admin mengubah konfigurasi dan menyimpan perubahan, website harus mengambil konfigurasi terbaru dari backend.

---

# 3. FIX SKELETON LOADING

Saat ini ketika berpindah halaman melalui sidebar, skeleton loading muncul pada seluruh dashboard, termasuk sidebar.

Perbaiki behavior loading tersebut.

### Expected Behavior

Sidebar dan topbar harus tetap tampil normal ketika pengguna berpindah halaman.

Skeleton loading hanya muncul pada area konten utama atau `Main Content`.

Struktur layout yang diharapkan:

```text
DashboardLayout
│
├── Sidebar
│   └── Render continuously
│
└── Main Area
    │
    ├── Topbar
    │   └── Render continuously
    │
    └── Page Content
        ├── Loading Skeleton
        └── Actual Page
```

### Technical Requirements

- Pisahkan layout dari page-level loading boundary.
- Jangan memasukkan Sidebar ke dalam Suspense boundary yang menyebabkan seluruh layout ter-render ulang.
- Jangan membuat Sidebar unmount dan mount setiap kali route berubah.
- Gunakan page-level loading state atau nested Suspense sesuai arsitektur existing.
- Pertahankan state navigasi selama perpindahan halaman.
- Hindari flashing atau flickering pada sidebar.
- Gunakan skeleton yang menyerupai struktur konten halaman sebenarnya.

Contoh:
- Dashboard page memiliki skeleton untuk KPI cards, charts, dan tables.
- Event Management memiliki skeleton untuk event table.
- Financial Overview memiliki skeleton untuk financial cards dan charts.

Jangan gunakan skeleton dashboard yang sama untuk seluruh halaman.

---

# 4. PERTAHANKAN POSISI SCROLL SIDEBAR

Saat ini setelah pengguna memilih menu pada sidebar, posisi scroll sidebar kembali ke bagian paling atas.

Behavior ini sangat mengganggu, terutama ketika menu sidebar cukup panjang.

Perbaiki agar posisi scroll sidebar tetap dipertahankan selama navigasi.

### Expected Behavior

Contohnya:

1. Pengguna scroll sidebar sampai menu Financial Management.
2. Pengguna memilih Payout Management.
3. Halaman Payout Management terbuka.
4. Sidebar tetap berada di posisi scroll sebelumnya.
5. Pengguna tidak perlu scroll ulang dari atas.

### Technical Requirements

- Sidebar harus tetap mounted selama perpindahan route.
- Jangan menggunakan key dinamis pada Sidebar yang menyebabkan remount.
- Hindari penggunaan `window.location.href` untuk navigasi internal apabila project sudah menggunakan React Router.
- Pertahankan scrollTop dari container sidebar.
- Pertahankan expanded/collapsed state pada setiap grup menu.
- Pertahankan active navigation state.
- Pastikan behavior bekerja pada seluruh dashboard Superadmin, Admin, dan Creator.

Jika posisi scroll perlu disimpan, gunakan state atau mechanism yang sesuai dengan arsitektur React existing.

Jangan memaksa sidebar scroll ke atas setiap kali route berubah.

---

# 5. SIDEBAR NOTIFICATION BADGES

Saat ini notifikasi hanya tersedia melalui icon notification pada topbar.

Tambahkan notification badge pada item menu sidebar sehingga pengguna dapat mengetahui bagian mana yang memiliki notifikasi baru.

### Expected UI

Contoh:

```text
SIDEBAR

Overview
  Dashboard

Event Management
  All Events
  Event Review                 12

Transaction Management
  All Orders                    5
  Refunds                       3

User Management
  Customers
  Organizers

Other
  Customer Support              4
```

Angka di atas merupakan contoh visual.

### Notification Badge Design

Gunakan:
- Small red circular badge.
- Menampilkan angka notifikasi yang belum dibaca.
- Ukuran proporsional dengan item sidebar.
- Tidak mengganggu alignment icon dan label.
- Jika jumlah melebihi 99, tampilkan 99+.
- Jika tidak ada notifikasi, badge disembunyikan.

### Notification Categories

Hubungkan notifikasi ke menu yang sesuai:

| Notification Type | Sidebar Destination |
|---|---|
| Event submitted | Event Review |
| Event needs revision | Event Management |
| New order | All Orders |
| Refund request | Refunds |
| New customer support ticket | Customer Support |
| Payout request | Payout Management |
| New organizer registration | Organizers |
| Check-in staff issue | Check-in Management |

Sesuaikan kategori dengan struktur menu existing.

### Role-based Notifications

Superadmin dan Admin hanya menerima notifikasi sesuai tanggung jawab operasionalnya.

Creator hanya menerima notifikasi berkaitan dengan:
- Event miliknya.
- Order event miliknya.
- Peserta event miliknya.
- Payout miliknya.
- Customer Support miliknya.

Jangan menampilkan notifikasi lintas Organizer.

### Notification Behavior

- Badge menunjukkan unread count.
- Count diambil dari backend.
- Ketika notifikasi dibaca, jumlah badge diperbarui.
- Ketika pengguna membuka halaman tujuan, jangan otomatis menghapus semua notifikasi tanpa memastikan notifikasi memang sudah dibaca.
- Klik badge atau menu dapat mengarahkan pengguna ke halaman yang relevan.
- Sinkronkan badge sidebar dengan notification center topbar.
- Pastikan tidak terjadi penghitungan ganda.

Gunakan realtime mechanism jika sudah tersedia. Jika belum, gunakan polling yang efisien dan dapat dikonfigurasi.

---

# 6. CREATOR PROFILE & ORGANIZER BANNER UPLOAD

Saat ini Creator belum bisa mengunggah foto profil maupun banner untuk halaman Creator/Organizer.

Implementasikan upload yang benar-benar berfungsi.

Pisahkan dua jenis gambar:

### A. Profile Photo

Foto profil untuk akun Creator.

Fitur:
- Upload foto profil.
- Preview sebelum disimpan.
- Ganti foto.
- Hapus foto.
- Tampilkan foto pada topbar dan halaman profile.
- Gunakan fallback avatar apabila belum mengunggah foto.

Rekomendasi:
- JPG, PNG, WEBP.
- Maksimal 2 MB.
- Aspect ratio 1:1.
- Tampilkan dalam bentuk circular avatar pada topbar.

### B. Organizer Cover / Banner

Banner untuk profil publik Organizer.

Fitur:
- Upload banner Organizer.
- Preview sebelum disimpan.
- Ganti banner.
- Hapus banner.
- Banner tampil pada Organizer Profile Page.
- Tampilkan fallback banner apabila belum tersedia.

Rekomendasi:
- JPG, PNG, WEBP.
- Maksimal 8 MB.
- Aspect ratio sekitar 3:1.
- Rekomendasi ukuran 1500 × 500 px.

### Creator Profile Page

Buat halaman profile yang memiliki:

- Profile Photo.
- Organizer Banner.
- Organizer Name.
- Organizer Description.
- Organizer Contact Information.
- Social Media Links.
- Location.
- Verification Status.

Creator dapat melakukan perubahan terhadap profil Organizer miliknya sendiri.

### Backend Requirements

- Buat endpoint upload profile image.
- Buat endpoint upload Organizer banner.
- Simpan file pada storage.
- Simpan URL file pada database.
- Terapkan validasi format dan ukuran.
- Pastikan setiap Creator hanya dapat mengubah gambar miliknya.
- Pastikan gambar yang sudah diunggah tetap tersimpan setelah logout dan login kembali.

Jangan sekadar mengubah preview di frontend menggunakan Object URL tanpa menyimpan file ke backend.

---

# 7. FULL WEBSITE CMS — SUPERADMIN

INI MERUPAKAN BAGIAN TERPENTING DARI REVISI.

Saat ini Superadmin seharusnya dapat mengatur tampilan dan konten website GOFEST secara langsung melalui dashboard.

Bangun sistem CMS yang benar-benar fungsional dan terhubung ke halaman website publik.

Jangan hanya membuat halaman System Settings berisi beberapa input sederhana.

Buat modul khusus:

**Website CMS**

Menu ini dapat diakses secara penuh oleh Superadmin.

Admin tetap dapat mengelola konten operasional seperti Featured Events / Event Seru Untukmu sesuai permission, tetapi pengaturan website global hanya boleh dilakukan Superadmin.

## 7.1 CMS Dashboard

Buat overview CMS yang menampilkan:

- Website Status.
- Published Content.
- Draft Content.
- Active Banners.
- Homepage Sections.
- Last Updated.
- Recent CMS Activities.

Sediakan indikator apakah website sedang aktif atau maintenance berdasarkan konfigurasi yang benar-benar diterapkan pada frontend publik.

## 7.2 Homepage Management

Superadmin dapat mengatur semua bagian homepage GOFEST.

Buat section management dengan fitur:

- Show / Hide Section.
- Edit Section Title.
- Edit Subtitle.
- Edit Description.
- Change Section Order.
- Select Content Source.
- Configure Display Limit.
- Preview Changes.
- Save Draft.
- Publish Changes.

Section yang perlu dikelola:

1. Hero Section.
2. Hero Banner / Promotional Banner.
3. Event Seru Untukmu.
4. Featured Events.
5. Popular Events.
6. Upcoming Events.
7. Event Categories.
8. Promotional Section.
9. Organizer Showcase.
10. Newsletter / CTA Section.

Tidak harus memaksakan semua section apabila belum ada di website. Periksa struktur homepage existing dan implementasikan CMS berdasarkan section yang benar-benar digunakan.

## 7.3 Hero Banner Management

Buat fitur pengelolaan banner homepage.

Superadmin dapat:
- Upload banner.
- Mengganti banner.
- Menghapus banner.
- Mengatur desktop image.
- Mengatur mobile image apabila diperlukan.
- Mengatur banner title.
- Mengatur subtitle.
- Mengatur CTA text.
- Mengatur CTA destination.
- Mengaktifkan atau menonaktifkan banner.
- Mengatur urutan banner.

Terapkan image preview dan image validation.

Banner yang diubah harus benar-benar terlihat di halaman publik setelah dipublikasikan.

## 7.4 Event Seru Untukmu & Featured Event CMS

Superadmin memiliki kemampuan pengaturan lebih lengkap terhadap section Event Seru Untukmu.

Fitur tambahan:
- Mengatur sumber event.
- Memilih event secara manual.
- Mengaktifkan automatic featured mode jika didukung.
- Mengatur jumlah kartu event.
- Mengatur urutan event.
- Mengatur tampilan section.
- Mengatur visibilitas section.
- Melihat preview aktual.

Jika menggunakan automatic mode, pastikan algoritmanya menggunakan data event yang valid, bukan memilih event secara acak tanpa dasar.

## 7.5 Website Pages Management

Buat CMS untuk mengelola halaman website yang relevan.

Contoh:
- About Us.
- Contact Us.
- FAQ.
- Terms & Conditions.
- Privacy Policy.
- Help Center.

Superadmin dapat:
- Membuat halaman.
- Mengedit halaman.
- Menghapus halaman.
- Mengatur slug.
- Mengatur title.
- Mengatur SEO metadata.
- Mengubah konten.
- Menyimpan draft.
- Publish / Unpublish.

Pastikan halaman tersebut benar-benar dapat dibuka melalui frontend publik.

## 7.6 Navigation Management

Superadmin dapat mengatur:
- Main navigation.
- Menu labels.
- Menu order.
- Menu visibility.
- Footer navigation.
- External links.

Jangan izinkan URL internal penting seperti checkout, login, atau callback pembayaran dihapus tanpa validasi.

## 7.7 Footer Management

Buat pengaturan:
- Footer logo.
- Footer description.
- Contact information.
- Social media links.
- Footer navigation.
- Copyright text.

Perubahan harus diterapkan ke footer website publik.

## 7.8 Website Branding & General Settings

Superadmin dapat mengatur:

**Brand Identity**
- Website Name.
- Logo.
- Favicon.
- Primary Brand Color.
- Secondary Brand Color.
- Website Description.

**SEO Settings**
- Default Page Title.
- Meta Description.
- Default OG Image.
- Site URL.
- SEO Keywords jika masih digunakan oleh SEO implementation existing.

**Contact & Social Media**
- Email.
- Phone Number.
- WhatsApp.
- Instagram.
- TikTok.
- Other Social Links.

**Website Configuration**
- Maintenance Mode.
- Announcement Bar.
- Default Language jika mendukung multi-language.
- Default Timezone.

Jangan hanya menyimpan perubahan pada database tanpa mengaplikasikannya di website publik.

## 7.9 Maintenance Mode

Sediakan fitur maintenance mode.

Ketika Superadmin mengaktifkannya:
- Website publik menampilkan maintenance page.
- Dashboard internal tetap bisa digunakan oleh Admin dan Superadmin.
- API internal authentication tetap berjalan.
- Superadmin dapat menonaktifkan maintenance mode dari dashboard.

Jangan sampai maintenance mode membuat Admin kehilangan akses ke dashboard untuk memperbaikinya.

---

# 8. CMS PUBLISHING SYSTEM

CMS harus memiliki sistem publikasi yang jelas.

Gunakan status:

- DRAFT.
- PUBLISHED.
- UNPUBLISHED.

Workflow:

1. Superadmin mengubah konten.
2. Superadmin menyimpan sebagai draft.
3. Superadmin melihat preview.
4. Superadmin memilih Publish.
5. Backend menyimpan versi published.
6. Website publik mengambil versi terbaru yang telah dipublikasikan.

### Requirements

- Perubahan draft tidak langsung mengubah website publik.
- Publish harus mengubah konten yang terlihat publik.
- Unpublish harus menyembunyikan konten yang bersangkutan.
- Simpan waktu publikasi.
- Simpan pengguna yang terakhir mengubah konten.
- Catat aktivitas CMS pada Audit Logs.
- Sediakan confirmation dialog sebelum publish atau unpublish.

Implementasikan preview menggunakan data draft tanpa merusak tampilan publik yang sedang aktif.

Apabila CMS mengalami kegagalan loading, website publik tetap menggunakan konten published terakhir yang valid apabila mekanisme caching memungkinkan.

---

# 9. CMS DATABASE & BACKEND

Periksa schema database existing sebelum menambahkan tabel baru.

Jangan membuat model duplikat jika sudah tersedia.

Minimal sediakan representasi data untuk:

- WebsiteSetting.
- CmsPage.
- CmsSection.
- CmsBanner.
- CmsNavigationItem.
- CmsRevision atau PublishVersion.
- FeaturedEvent.
- MediaAsset.
- OrganizerProfileImage.
- Notification.
- AuditLog.

Sesuaikan relasi dengan arsitektur project existing.

### Important Data Requirements

- Simpan konten CMS ke database.
- Simpan path dan metadata gambar.
- Simpan urutan section.
- Simpan status published/draft.
- Simpan createdBy dan updatedBy.
- Simpan timestamp.
- Pastikan konten publik hanya mengambil versi yang published.

Jangan menyimpan seluruh CMS sebagai satu JSON besar tanpa struktur dan validasi yang jelas.

Gunakan model data yang mudah dikelola dan dikembangkan.

---

# 10. UI / UX DESIGN DIRECTION

Pertahankan design system GOFEST yang sudah ada.

Jangan merombak seluruh visual website tanpa alasan.

Gunakan:
- Clean modern layout.
- Professional SaaS dashboard.
- Blue accent.
- White/light background.
- Consistent typography.
- Subtle border.
- Rounded cards secara proporsional.
- Proper spacing.
- Responsive layout.
- Lucide icons.
- Smooth but subtle transitions.

### CMS UI

Buat pengalaman CMS yang nyaman digunakan:

- Sidebar navigation untuk CMS modules.
- Content editor.
- Media uploader.
- Image preview.
- Drag-and-drop untuk mengatur urutan section jika memungkinkan.
- Save Draft.
- Publish.
- Preview Website.
- Empty states.
- Loading states.
- Error feedback.
- Confirmation dialogs.

CMS jangan terlihat seperti halaman CRUD database biasa. Buat interface seperti website management platform yang profesional.

### Responsive

Pastikan:
- Dashboard tetap responsif.
- CMS dapat digunakan di desktop dan tablet.
- Image uploader berfungsi dengan baik pada mobile.
- Tidak ada horizontal overflow yang tidak diperlukan.

---

# 11. IMPLEMENTATION RULES

Sebelum mengimplementasikan:

1. Periksa repository dan seluruh struktur project.
2. Periksa routing.
3. Periksa komponen Sidebar dan DashboardLayout.
4. Periksa implementasi skeleton loading.
5. Periksa notification backend dan frontend.
6. Periksa event form dan upload existing.
7. Periksa Organizer Profile.
8. Periksa Homepage dan komponen public website.
9. Periksa database schema.
10. Identifikasi penyebab bug existing sebelum melakukan perbaikan.

Jangan membuat solusi dengan menambahkan komponen baru yang menduplikasi fungsi existing.

Pastikan setiap fitur terintegrasi dengan:
- Frontend.
- Backend API.
- PostgreSQL.
- Prisma.
- Storage.

Jangan membuat fitur yang hanya terlihat berfungsi di frontend, tetapi tidak benar-benar menyimpan atau mengubah data.

Jangan mengisi dashboard dengan dummy data jika endpoint dan database untuk fitur tersebut sudah tersedia.

Untuk fitur yang belum memiliki data, tampilkan empty state yang benar.

Jangan mengubah Xendit integration scope. Integrasi payment gateway dan payout tetap belum termasuk dalam revisi ini.

---

# 12. TESTING & ACCEPTANCE CRITERIA

Pekerjaan dinyatakan selesai apabila seluruh poin berikut berhasil diuji:

### Event Banner
- Creator dapat upload banner saat membuat event.
- Banner tampil pada preview.
- Banner tersimpan di database/storage.
- Banner muncul di halaman detail event.
- Creator dapat mengganti banner saat edit event.

### Featured Events
- Admin dapat mengatur Event Seru Untukmu.
- Admin dapat memilih dan mengurutkan event.
- Section bisa diaktifkan atau dinonaktifkan.
- Perubahan tampil pada homepage publik.

### Skeleton Loading
- Sidebar tidak menghilang ketika navigasi.
- Topbar tidak menampilkan skeleton.
- Skeleton hanya tampil di main content.
- Setiap halaman mempunyai skeleton yang sesuai.

### Sidebar Scroll
- Posisi scroll sidebar dipertahankan saat berpindah route.
- Expanded menu tidak kembali ke kondisi awal.
- Active menu tetap benar.
- Tidak ada remount yang tidak perlu.

### Notification Badge
- Badge tampil pada menu yang memiliki notifikasi.
- Unread count berasal dari backend.
- Count berubah ketika notifikasi dibaca.
- Superadmin, Admin, dan Creator hanya melihat notifikasi yang sesuai hak akses.

### Creator Profile
- Creator bisa upload profile photo.
- Creator bisa upload Organizer banner.
- Gambar tetap tersimpan setelah refresh dan login kembali.
- Halaman publik Organizer menampilkan gambar yang sesuai.

### Website CMS
- Superadmin bisa mengelola homepage.
- Superadmin bisa upload banner homepage.
- Superadmin bisa mengatur Event Seru Untukmu.
- Superadmin bisa membuat dan mengubah halaman website.
- Superadmin bisa mengatur navigation dan footer.
- Superadmin bisa mengubah branding website.
- Superadmin bisa mengaktifkan maintenance mode.
- Draft tidak langsung tampil di website publik.
- Publish benar-benar memperbarui website publik.
- Unpublish benar-benar menyembunyikan konten.
- Seluruh aktivitas CMS tercatat di Audit Logs.

### Regression Testing
- Login ketiga role tetap berjalan.
- Authorization tidak rusak.
- Event Management tetap berjalan.
- Ticket purchasing tetap berjalan.
- Existing transaction tidak berubah.
- Financial Management tidak rusak.
- Payout simulation tetap berjalan.
- Tidak ada broken routes.
- Tidak ada TypeScript errors.
- Build dan lint berhasil.

---

# 13. FINAL INSTRUCTIONS

Implementasikan seluruh revisi langsung pada repository existing.

Jangan hanya memberikan analisis, saran, desain, wireframe, atau potongan kode.

Selesaikan setiap poin secara end-to-end.

Prioritaskan bug fixes terlebih dahulu, kemudian implementasikan CMS dan fitur upload.

Setelah implementasi:
1. Jalankan database migration apabila diperlukan.
2. Jalankan Prisma validation.
3. Jalankan TypeScript check.
4. Jalankan lint.
5. Jalankan production build.
6. Periksa kembali setiap acceptance criteria.
7. Perbaiki error yang ditemukan.

Berikan laporan akhir berisi:
- Bug yang berhasil diperbaiki.
- Fitur yang berhasil ditambahkan.
- Modul CMS yang berhasil diimplementasikan.
- Database/schema yang berubah.
- Endpoint API baru.
- File penting yang diubah.
- Hasil testing dan build.
- Fitur yang masih memiliki keterbatasan.

**Jangan menyatakan fitur selesai apabila baru dibuat tampilannya. Pastikan frontend, backend, database, dan website publik benar-benar terhubung.**