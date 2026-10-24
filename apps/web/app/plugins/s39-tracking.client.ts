/**
 * S39 Tracking (Work39): TikTok- und Meta-Pixel, nur nach Einwilligung
 * im Cookie-Banner (Gruppe Marketing, Eintraege aus s39-tracking.server.ts).
 *
 * Ereignisse:
 *  - Seitenaufruf ............ TikTok Pageview / Meta PageView
 *  - Artikelseite ............ ViewContent
 *  - In den Warenkorb ........ AddToCart
 *  - Kontaktformular gesendet  Contact + SubmitForm / Contact + Lead
 *  - Bestellung abgeschlossen  CompletePayment / Purchase (mit Wert)
 */
import { orderGetters, productGetters } from '@plentymarkets/shop-api';

export default defineNuxtPlugin((nuxtApp) => {
  const { on } = usePlentyEvent();
  const { consent: tiktokConsent } = useCookieConsent(S39_TIKTOK_CONSENT_NAME);
  const { consent: metaConsent } = useCookieConsent(S39_META_CONSENT_NAME);

  let tiktokLoaded = false;
  let metaLoaded = false;

  watch(
    tiktokConsent,
    (accepted) => {
      if (accepted && !tiktokLoaded) {
        tiktokLoaded = true;
        s39LoadTikTokPixel(S39_TIKTOK_PIXEL_ID);
      }
    },
    { immediate: true },
  );

  watch(
    metaConsent,
    (accepted) => {
      if (accepted && !metaLoaded) {
        metaLoaded = true;
        s39LoadMetaPixel(S39_META_PIXEL_ID);
      }
    },
    { immediate: true },
  );

  // Seitenwechsel innerhalb der PWA (der erste Aufruf wird beim Laden gemeldet)
  let firstPage = true;
  nuxtApp.hook('page:finish', () => {
    if (firstPage) {
      firstPage = false;
      return;
    }
    s39SendPageView();
  });

  on('frontend:productLoaded', ({ product }) => {
    try {
      const id = String(productGetters.getVariationNumber(product) || productGetters.getVariationId(product));
      const name = productGetters.getName(product);
      const price = Number(productGetters.getPrice(product)) || undefined;
      s39SendPixelEvent('ViewContent', 'ViewContent', {
        tt: {
          contents: [{ content_id: id, content_name: name, content_type: 'product', price }],
          value: price,
          currency: S39_DEFAULT_CURRENCY,
        },
        fb: {
          content_ids: [id],
          content_name: name,
          content_type: 'product',
          value: price,
          currency: S39_DEFAULT_CURRENCY,
        },
      });
    } catch {
      // Tracking darf den Shop nie stoeren
    }
  });

  on('frontend:addToCart', ({ item, addItemParams }) => {
    try {
      const quantity = Number(addItemParams?.quantity) || 1;
      const price = Number(item?.price) || undefined;
      const id = String(item?.variationId ?? addItemParams?.productId ?? '');
      const value = price ? Math.round(price * quantity * 100) / 100 : undefined;
      s39SendPixelEvent('AddToCart', 'AddToCart', {
        tt: {
          contents: [{ content_id: id, content_type: 'product', quantity, price }],
          value,
          currency: S39_DEFAULT_CURRENCY,
        },
        fb: { content_ids: [id], content_type: 'product', value, currency: S39_DEFAULT_CURRENCY },
      });
    } catch {
      // Tracking darf den Shop nie stoeren
    }
  });

  on('frontend:orderCreated', (order) => {
    try {
      const value = Number(orderGetters.getTotal(orderGetters.getTotals(order))) || undefined;
      const currency = orderGetters.getCurrency(order) || S39_DEFAULT_CURRENCY;
      const items = (orderGetters.getItems(order) || []).filter((item) => orderGetters.getItemVariationId(item));
      const contents = items.map((item) => ({
        content_id: String(orderGetters.getItemVariationId(item)),
        content_name: orderGetters.getItemName(item),
        content_type: 'product',
        quantity: orderGetters.getItemQty(item),
      }));
      s39SendPixelEvent(
        'CompletePayment',
        'Purchase',
        {
          tt: { contents, value, currency },
          fb: {
            content_ids: contents.map((content) => content.content_id),
            content_type: 'product',
            num_items: contents.length,
            value,
            currency,
          },
        },
        'order-' + orderGetters.getId(order),
      );
    } catch {
      // Tracking darf den Shop nie stoeren
    }
  });

  // Kontaktformular: erst melden, wenn der Versand erfolgreich war
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const response = await originalFetch(...args);
    try {
      const request = args[0];
      const url = typeof request === 'string' ? request : request instanceof Request ? request.url : String(request);
      if (response.ok && S39_CONTACT_MAIL_PATTERN.test(url)) {
        const eventId = 'kontakt-' + Date.now();
        const payload = { tt: { content_name: 'Kontaktformular' }, fb: { content_name: 'Kontaktformular' } };
        s39SendPixelEvent('Contact', 'Contact', payload, eventId);
        s39SendPixelEvent('SubmitForm', 'Lead', payload, eventId + '-lead');
      }
    } catch {
      // Tracking darf den Shop nie stoeren
    }
    return response;
  };
});
