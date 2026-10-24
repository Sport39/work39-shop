import type { PixelQueue, PixelWindow, S39TrackingPayload } from './types';

const TIKTOK_SDK_URL = 'https://analytics.tiktok.com/i18n/pixel/events.js';
const META_SDK_URL = 'https://connect.facebook.net/en_US/fbevents.js';
const TIKTOK_METHODS = [
  'page',
  'track',
  'identify',
  'instances',
  'debug',
  'on',
  'off',
  'once',
  'ready',
  'alias',
  'group',
  'enableCookie',
  'disableCookie',
  'holdConsent',
  'revokeConsent',
  'grantConsent',
];

/**
 * Laedt ein externes Script asynchron. Dynamisch erzeugte Scripts sind durch
 * die CSP ('strict-dynamic') erlaubt, Inline-Scripts dagegen nicht – deshalb
 * werden die Basiscodes von TikTok und Meta hier nachgebaut statt inline eingefuegt.
 * @param src Script-URL
 */
const loadExternalScript = (src: string) => {
  const script = document.createElement('script');
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
};

/**
 * Laedt den TikTok-Pixel (Nachbau des offiziellen Basiscodes) und meldet den ersten Seitenaufruf.
 * Darf nur nach Einwilligung aufgerufen werden.
 * @param pixelId TikTok Pixel-Code
 */
export const s39LoadTikTokPixel = (pixelId: string) => {
  const w = window as unknown as PixelWindow;
  if (w.ttq) {
    return;
  }
  const queue = [] as unknown as PixelQueue;
  const setAndDefer = (target: PixelQueue, method: string) => {
    target[method] = (...args: unknown[]) => {
      target.push([method, ...args]);
    };
  };
  const instanceQueue = Object.assign([], { _u: TIKTOK_SDK_URL }) as unknown as PixelQueue;
  queue.methods = TIKTOK_METHODS;
  queue.setAndDefer = setAndDefer;
  queue.instance = () => {
    TIKTOK_METHODS.forEach((method) => setAndDefer(instanceQueue, method));
    return instanceQueue;
  };
  TIKTOK_METHODS.forEach((method) => setAndDefer(queue, method));
  queue._i = { [pixelId]: instanceQueue };
  queue._t = { [pixelId]: Date.now() };
  queue._o = { [pixelId]: {} };
  w.TiktokAnalyticsObject = 'ttq';
  w.ttq = queue;
  loadExternalScript(`${TIKTOK_SDK_URL}?sdkid=${encodeURIComponent(pixelId)}&lib=ttq`);
  queue.page();
};

/**
 * Laedt den Meta-Pixel (Nachbau des offiziellen Basiscodes) und meldet den ersten Seitenaufruf.
 * Darf nur nach Einwilligung aufgerufen werden.
 * @param pixelId Meta Pixel-ID
 */
export const s39LoadMetaPixel = (pixelId: string) => {
  const w = window as unknown as PixelWindow;
  if (w.fbq) {
    return;
  }
  const fbq = ((...args: unknown[]) => {
    if (fbq.callMethod) {
      fbq.callMethod(...args);
    } else {
      fbq.queue.push(args);
    }
  }) as PixelWindow['fbq'] & Record<string, unknown> & { queue: unknown[]; callMethod?: (...args: unknown[]) => void };
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = '2.0';
  fbq.queue = [];
  w.fbq = fbq;
  w._fbq = fbq;
  loadExternalScript(META_SDK_URL);
  fbq('init', pixelId);
  fbq('track', 'PageView');
};

/**
 * Meldet ein Ereignis an TikTok und/oder Meta – jeweils nur, wenn der Pixel geladen ist.
 * @param tiktokEvent Ereignisname fuer TikTok (null = nicht melden)
 * @param metaEvent Ereignisname fuer Meta (null = nicht melden)
 * @param payload Daten je Plattform
 * @param eventId Optionale ID zur Deduplizierung
 */
export const s39SendPixelEvent = (
  tiktokEvent: string | null,
  metaEvent: string | null,
  payload: S39TrackingPayload = {},
  eventId?: string,
) => {
  const w = window as unknown as PixelWindow;
  if (tiktokEvent && w.ttq) {
    w.ttq.track(tiktokEvent, payload.tt || {}, eventId ? { event_id: eventId } : undefined);
  }
  if (metaEvent && w.fbq) {
    w.fbq('track', metaEvent, payload.fb || {}, eventId ? { eventID: eventId } : undefined);
  }
};

/**
 * Meldet einen Seitenwechsel innerhalb der PWA an beide Pixel (falls geladen).
 */
export const s39SendPageView = () => {
  const w = window as unknown as PixelWindow;
  if (w.ttq) {
    w.ttq.page();
  }
  if (w.fbq) {
    w.fbq('track', 'PageView');
  }
};
