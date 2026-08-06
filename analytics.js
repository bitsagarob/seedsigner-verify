/*
 * Usage counting. Deliberately kept in its own file so it can be read, judged
 * and deleted without touching anything that verifies your firmware.
 *
 * What it does:
 *   - Sends page views and interaction events to Matomo on Bitsaga's own server.
 *   - Same origin. /mtm/ is served by this same host, so the page still never
 *     talks to any other server, and the Content-Security-Policy stays 'self'.
 *
 * What it does not do:
 *   - No cookies. disableCookies() is set before anything is sent, so there is
 *     no identifier stored on your machine and no consent banner is needed.
 *   - No third parties. Nothing is shared, sold or forwarded.
 *   - Nothing about your file. Not its name, not its size, not its hash. Only
 *     whether a check passed or failed, which is what tells us if this page works.
 *   - Nothing at all in cypherpunk mode, or if your browser sends Do Not Track
 *     or Global Privacy Control.
 */

const SITE_ID = 8;
const ENDPOINT = '/mtm/matomo.php';
const SCRIPT = '/mtm/matomo.js';

let live = false;

function optedOut() {
  const n = navigator;
  return (
    n.doNotTrack === '1' ||
    n.msDoNotTrack === '1' ||
    globalThis.doNotTrack === '1' ||
    n.globalPrivacyControl === true
  );
}

export function startAnalytics(mode) {
  if (live) return;
  if (mode === 'cypherpunk') return;
  if (optedOut()) return;

  const _paq = (globalThis._paq = globalThis._paq || []);

  // Order matters: privacy settings must be queued before the first request.
  _paq.push(['disableCookies']);
  _paq.push(['setDoNotTrack', true]);
  _paq.push(['setTrackerUrl', ENDPOINT]);
  _paq.push(['setSiteId', String(SITE_ID)]);
  _paq.push(['enableLinkTracking']);      // outbound clicks and downloads
  _paq.push(['enableHeartBeatTimer', 15]); // real time on page, not just entry
  _paq.push(['trackPageView']);

  const s = document.createElement('script');
  s.async = true;
  s.src = SCRIPT;
  document.head.append(s);
  live = true;
}

export function stopAnalytics() {
  // Switching into cypherpunk mode stops further events. Anything already sent
  // has been sent; this is not a retraction, it is an honest stop.
  live = false;
}

export function track(category, action, name, value) {
  if (!live) return;
  const ev = ['trackEvent', category, action];
  if (name !== undefined) ev.push(String(name));
  if (value !== undefined) ev.push(value);
  globalThis._paq?.push(ev);
}

/* A page view for each step reached, so the funnel is readable in Matomo as
   plain URLs rather than needing event maths. */
export function trackStep(path, title) {
  if (!live) return;
  globalThis._paq?.push(['setCustomUrl', location.pathname + path]);
  globalThis._paq?.push(['setDocumentTitle', title]);
  globalThis._paq?.push(['trackPageView']);
}
