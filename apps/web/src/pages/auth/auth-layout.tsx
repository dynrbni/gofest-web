import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useLanguage } from '@/lib/language';
import { useReducedMotion } from '@/lib/hooks';

type AuthView = 'login' | 'register';
const views: AuthView[] = ['login', 'register'];

function AuthMascots({ view }: { view: AuthView }) {
  const { t } = useLanguage();
  const images = useRef<Partial<Record<AuthView, HTMLImageElement>>>({});
  const [ready, setReady] = useState({ login: false, register: false });
  const [failed, setFailed] = useState({ login: false, register: false });

  const decode = useCallback((pose: AuthView, image: HTMLImageElement) => {
    void image.decode().then(
      () => setReady((current) => (current[pose] ? current : { ...current, [pose]: true })),
      () => setFailed((current) => ({ ...current, [pose]: true })),
    );
  }, []);
  useEffect(() => {
    for (const pose of views) {
      const image = images.current[pose];
      if (image?.complete && image.naturalWidth > 0) decode(pose, image);
    }
  }, [decode]);

  const alternate = view === 'login' ? 'register' : 'login';
  const visible =
    ready[view] && !failed[view] ? view : ready[alternate] && !failed[alternate] ? alternate : view;
  return (
    <div className="auth-mascot-art">
      {views.map((pose) => (
        <img
          key={pose}
          ref={(image) => {
            if (image) images.current[pose] = image;
            else delete images.current[pose];
          }}
          src={`/assets/gofest-mascot-${pose}.png`}
          alt={
            pose === 'login'
              ? t(
                  'Trio maskot Gofest menyambutmu kembali dengan tiket konser.',
                  'The Gofest mascot trio welcomes you back with a concert ticket.',
                )
              : t(
                  'Trio maskot Gofest bersorak dan melakukan tos untuk menyambut teman baru.',
                  'The Gofest mascot trio celebrates and high-fives to welcome a new friend.',
                )
          }
          width={1536}
          height={1024}
          loading="eager"
          fetchPriority={pose === view ? 'high' : 'low'}
          decoding="async"
          draggable={false}
          className="auth-mascot-image"
          data-active={pose === visible && !failed[pose]}
          aria-hidden={pose !== visible || failed[pose]}
          onLoad={(event) => decode(pose, event.currentTarget)}
          onError={() => setFailed((current) => ({ ...current, [pose]: true }))}
        />
      ))}
    </div>
  );
}

export function AuthLayout() {
  const { pathname } = useLocation();
  const { t } = useLanguage();
  const view = pathname.replace(/\/+$/, '') === '/register' ? 'register' : 'login';
  const reducedMotion = useReducedMotion();
  const previousView = useRef(view);
  const container = useRef<HTMLDivElement>(null);
  const formSlot = useRef<HTMLDivElement>(null);
  const mascotSlot = useRef<HTMLElement>(null);
  const animations = useRef<Animation[]>([]);

  // Route changes animate; resizing the grid must settle immediately.
  useLayoutEffect(() => {
    const previous = previousView.current;
    previousView.current = view;
    const form = formSlot.current;
    const mascot = mascotSlot.current;
    const grid = container.current;
    if (!form || !mascot || !grid) return;
    const offset = form.offsetWidth + parseFloat(getComputedStyle(grid).columnGap);
    const running = animations.current.some((animation) => animation.playState === 'running');
    const from = running
      ? [getComputedStyle(form).transform, getComputedStyle(mascot).transform]
      : previous === 'register'
        ? [`translateX(-${offset}px)`, `translateX(${offset}px)`]
        : ['translateX(0)', 'translateX(0)'];
    animations.current.forEach((animation) => animation.cancel());
    if (previous === view || reducedMotion || !window.matchMedia('(min-width: 768px)').matches)
      return;
    animations.current = [form, mascot].map((element, index) =>
      element.animate(
        [{ transform: from[index] }, { transform: getComputedStyle(element).transform }],
        { duration: 560, easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)' },
      ),
    );
  }, [view, reducedMotion]);

  useEffect(() => {
    const cancel = () => animations.current.forEach((animation) => animation.cancel());
    window.addEventListener('resize', cancel);
    return () => {
      window.removeEventListener('resize', cancel);
      cancel();
    };
  }, []);
  return (
    <main
      className={`auth-page${view === 'register' ? ' auth-page-compact' : ''}`}
      data-auth-view={view}
    >
      <div ref={container} className="auth-container">
        <div ref={formSlot} className="auth-form-slot">
          <section className="auth-form-panel" aria-labelledby="auth-heading">
            <Outlet />
          </section>
        </div>
        <aside
          ref={mascotSlot}
          className="auth-mascot"
          aria-label={t('Maskot Gofest', 'Gofest mascots')}
        >
          <AuthMascots view={view} />
          <div>
            <p className="text-2xl font-semibold leading-snug text-blue-800">
              {t('Ada acara seru yang menunggumu.', 'Your next great event is waiting.')}
            </p>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-600">
              {t(
                'Dari konser sampai festival, mulai rencanamu di Gofest.',
                'From concerts to festivals, make your plans with Gofest.',
              )}
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
