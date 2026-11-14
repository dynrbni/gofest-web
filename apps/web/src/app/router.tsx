import { createBrowserRouter } from 'react-router-dom';

function PlaceholderPage() {
  return (
    <main className="container flex min-h-screen items-center justify-center">
      <div className="max-w-xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-olive">Gofest</p>
        <h1 className="mt-4 font-display text-5xl leading-[0.95] tracking-tightest">
          Acara yang layak keluar rumah.
        </h1>
        <p className="mt-4 text-muted-foreground">
          Fondasi aplikasi sedang disiapkan. Halaman publik dan alur tiket akan menyusul.
        </p>
      </div>
    </main>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <PlaceholderPage />,
  },
]);
