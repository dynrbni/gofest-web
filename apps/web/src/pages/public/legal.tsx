import { useDocumentTitle } from '@/lib/hooks';

export function TermsPage() {
  useDocumentTitle('Syarat layanan');
  return (
    <main className="container max-w-3xl py-10 sm:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-olive">Ketentuan</p>
      <h1 className="mt-2 font-display text-5xl leading-none tracking-tightest">Syarat layanan</h1>
      <p className="mt-3 text-sm text-muted-foreground">Terakhir diperbarui: 14 November 2026</p>

      <div className="mt-8 space-y-7 text-[15px] leading-[1.75]">
        <section>
          <h2 className="text-lg font-bold">1. Peran Gofest</h2>
          <p className="mt-2 text-ink/90">
            Gofest adalah platform yang menghubungkan pembeli tiket dengan organizer acara. Organizer
            bertanggung jawab atas isi acara, jadwal, lokasi, perubahan acara, dan kebijakan refund yang
            mereka tulis. Gofest memproses transaksi dan menerbitkan tiket digital.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-bold">2. Pembelian tiket</h2>
          <p className="mt-2 text-ink/90">
            Harga, biaya platform, dan diskon dihitung di server saat checkout. Order hanya dianggap lunas
            setelah pembayaran terverifikasi, bukan setelah pembeli kembali ke halaman sukses. Satu tiket
            berlaku untuk satu orang dan hanya dapat dipindai sekali.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-bold">3. Pembatalan dan refund</h2>
          <p className="mt-2 text-ink/90">
            Bila organizer membatalkan acara, tiket yang masih berlaku ditandai batal dan order terkait
            masuk ke proses refund. Waktu pengembalian dana mengikuti kebijakan organizer dan metode
            pembayaran. Platform belum mengotomatiskan transfer refund pada versi MVP ini; tim operasi
            memprosesnya secara manual.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-bold">4. Akun</h2>
          <p className="mt-2 text-ink/90">
            Kamu bertanggung jawab menjaga kerahasiaan password. Gunakan email aktif karena tautan tiket,
            reset password, dan pemberitahuan acara dikirim ke alamat tersebut. Akun dapat ditangguhkan
            bila terbukti menyalahgunakan platform.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-bold">5. Kontak</h2>
          <p className="mt-2 text-ink/90">
            Pertanyaan tentang tiket atau acara sebaiknya diarahkan ke organizer yang tercantum pada
            halaman acara. Masalah teknis platform dapat dilaporkan melalui kanal dukungan yang akan
            diumumkan saat domain dan kontak resmi ditetapkan.
          </p>
        </section>
      </div>
    </main>
  );
}

export function PrivacyPage() {
  useDocumentTitle('Kebijakan privasi');
  return (
    <main className="container max-w-3xl py-10 sm:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-olive">Privasi</p>
      <h1 className="mt-2 font-display text-5xl leading-none tracking-tightest">Kebijakan privasi</h1>
      <p className="mt-3 text-sm text-muted-foreground">Terakhir diperbarui: 14 November 2026</p>

      <div className="mt-8 space-y-7 text-[15px] leading-[1.75]">
        <section>
          <h2 className="text-lg font-bold">Data yang kami simpan</h2>
          <p className="mt-2 text-ink/90">
            Nama, email, dan nomor WhatsApp yang kamu berikan saat mendaftar atau checkout. Untuk order,
            kami menyimpan rincian tiket, status pembayaran, dan catatan check-in. Password disimpan
            sebagai hash Argon2id, bukan teks biasa.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-bold">Cookie dan sesi</h2>
          <p className="mt-2 text-ink/90">
            Sesi memakai cookie HttpOnly untuk access token berumur pendek dan refresh token yang
            dirotasi. Kami tidak menyimpan token sesi di localStorage. Token akses order tamu disimpan
            sebagai hash di database dan dikirim ke pembeli dalam tautan.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-bold">Pembagian data</h2>
          <p className="mt-2 text-ink/90">
            Organizer dapat melihat data pembeli dan peserta untuk acara mereka, termasuk kebutuhan check-in
            dan ekspor peserta. Data pembayaran diproses oleh penyedia pembayaran yang ditunjuk. Penyedia
            email menerima alamat email untuk pengiriman konfirmasi dan reset password.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-bold">Penyimpanan dan hak kamu</h2>
          <p className="mt-2 text-ink/90">
            Data transaksi disimpan selama diperlukan untuk pembukuan dan penyelesaian sengketa. Kamu dapat
            meminta pembaruan data profil melalui halaman akun. Penghapusan akun dan data terkait akan
            diproses sesuai kewajiban hukum yang berlaku.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-bold">Catatan MVP</h2>
          <p className="mt-2 text-ink/90">
            Kebijakan ini menjelaskan perilaku aplikasi pada versi MVP. Sebelum peluncuran publik, kebijakan
            perlu ditinjau bersama penasihat hukum dan disesuaikan dengan penyedia pembayaran serta domain
            resmi yang dipilih.
          </p>
        </section>
      </div>
    </main>
  );
}