/**
 * S39 Tracking (Work39): meldet TikTok- und Meta-Pixel als eigene Eintraege
 * in der Gruppe "Marketing" des Cookie-Banners an.
 * Cookies koennen in der PWA nur serverseitig registriert werden.
 * enforce 'pre': muss vor 01.init-cookie-bar laufen, sonst sind die Eintraege
 * beim Aufbau des Cookie-Banners noch nicht vorhanden.
 */
export default defineNuxtPlugin({
  name: 's39-tracking-cookies',
  enforce: 'pre',
  setup() {
    const { add } = useRegisterCookie();

    add(
      {
        name: S39_TIKTOK_CONSENT_NAME,
        Provider: 'TikTok Technology Limited, Dublin, Irland',
        Status:
          'Misst, welche Besucher über unsere TikTok-Anzeigen kommen und was sie im Shop tun (z. B. Artikel ansehen, Anfrage senden, Kauf), damit wir unsere Werbung passend ausspielen können.',
        PrivacyPolicy: 'https://www.tiktok.com/legal/privacy-policy-eea',
        Lifespan: 'bis zu 13 Monate',
        cookieNames: ['_ttp', '/^_tt_/', '/^ttcsid/'],
        accepted: false,
      },
      S39_CONSENT_GROUP,
    );

    add(
      {
        name: S39_META_CONSENT_NAME,
        Provider: 'Meta Platforms Ireland Ltd., Dublin, Irland',
        Status:
          'Misst, welche Besucher über unsere Facebook- und Instagram-Anzeigen kommen und was sie im Shop tun (z. B. Artikel ansehen, Anfrage senden, Kauf), damit wir unsere Werbung passend ausspielen können.',
        PrivacyPolicy: 'https://www.facebook.com/privacy/policy/',
        Lifespan: 'bis zu 3 Monate',
        cookieNames: ['_fbp', '_fbc'],
        accepted: false,
      },
      S39_CONSENT_GROUP,
    );
  },
});
