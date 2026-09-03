import { submitSignal, type SignalPayload } from './api';

// Shared client behaviour — plain TS, no framework.
// Set up once per page load; re-scans after view transitions via astro:page-load.

/* ---- Reveal on scroll (replaces the Motion island) ---- */
let revealObserver: IntersectionObserver | null = null;

function observeReveals(): void {
  if (!revealObserver) {
    revealObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver!.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );
  }
  const targets = document.querySelectorAll<HTMLElement>('.reveal:not(.is-visible)');
  for (const el of targets) revealObserver.observe(el);
}

/* ---- Poster tilt (delegated on document, survives view transitions) ---- */
let tilted: HTMLElement | null = null;

function resetTilt(): void {
  if (tilted) {
    tilted.style.transform = 'perspective(900px) rotateY(0) rotateX(0)';
    tilted = null;
  }
}

function bindPosterTilt(): void {
  document.addEventListener(
    'pointermove',
    (e) => {
      const target = e.target as Element | null;
      const poster = target?.closest?.('[data-poster3d]') as HTMLElement | null;
      if (!poster) {
        resetTilt();
        return;
      }
      if (tilted && tilted !== poster) resetTilt();
      tilted = poster;
      const rect = poster.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      poster.style.transform = `perspective(900px) rotateY(${px * 8}deg) rotateX(${py * -8}deg)`;
    },
    { passive: true },
  );
  document.addEventListener('pointerleave', resetTilt);
}

/* ---- Scroll progress bar ---- */
function bindScrollProgress(): void {
  const bar = document.getElementById('scroll-progress');
  if (!bar) return;
  const update = () => {
    const doc = document.documentElement;
    const max = doc.scrollHeight - doc.clientHeight;
    bar.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`;
  };
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update, { passive: true });
  update();
}

/* ---- Contact form (delegated on document) ---- */
const val = (form: HTMLFormElement, name: string): string => {
  const el = form.elements.namedItem(name) as
    | HTMLInputElement
    | HTMLTextAreaElement
    | HTMLSelectElement
    | null;
  return el?.value ?? '';
};

async function handleFormSubmit(e: Event): Promise<void> {
  const form = e.target as HTMLFormElement;
  if (!form.matches('[data-contact-form]')) return;
  e.preventDefault();

  const submitBtn = form.querySelector<HTMLButtonElement>('[data-submit]');
  const statusOk = form.querySelector<HTMLElement>('[data-status]');
  const statusErr = form.querySelector<HTMLElement>('[data-status-error]');
  const errorDetail = form.querySelector<HTMLElement>('[data-error-detail]');
  const originalLabel = submitBtn?.textContent ?? '';
  const sendingLabel = submitBtn?.dataset.sending ?? 'Sending...';

  const payload: SignalPayload = {
    type: (form.dataset.type as SignalPayload['type']) ?? 'contact',
    name: val(form, 'name'),
    email: val(form, 'email'),
    company: val(form, 'company') || undefined,
    service: val(form, 'service') || undefined,
    message: val(form, 'message'),
    source_page: form.dataset.sourcePage,
    locale: form.dataset.locale ?? 'en',
  };

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = sendingLabel;
  }
  statusOk?.classList.add('hidden');
  statusErr?.classList.add('hidden');

  try {
    await submitSignal(payload);
    statusOk?.classList.remove('hidden');
    form.reset();
  } catch (err) {
    statusErr?.classList.remove('hidden');
    if (errorDetail) {
      errorDetail.textContent = err instanceof Error ? ` (${err.message})` : '';
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  }
}

function bindForms(): void {
  document.addEventListener('submit', (e) => {
    void handleFormSubmit(e);
  });
}

/* ---- Setup ---- */
export function initSite(): void {
  document.documentElement.classList.add('js');
  observeReveals();
  bindScrollProgress();
  bindPosterTilt();
  bindForms();
}

// View transitions replace the DOM but keep document: re-scan the new page.
document.addEventListener('astro:page-load', () => {
  observeReveals();
  bindScrollProgress();
});