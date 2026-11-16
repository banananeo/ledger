// Ledger - Service Worker for Mobile Notifications
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  let targetUrl = new URL('/', self.location.origin);
  try {
    const requestedUrl = event.notification.data?.url;
    if (typeof requestedUrl === 'string') {
      const candidate = new URL(requestedUrl, self.location.origin);
      if (candidate.origin === self.location.origin) targetUrl = candidate;
    }
  } catch {
    // Keep the safe same-origin home URL.
  }

  event.waitUntil((async () => {
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const client = clientList.find((item) => 'focus' in item);
    if (client) {
      try {
        const navigated = typeof client.navigate === 'function'
          ? await client.navigate(targetUrl.href)
          : null;
        return await (navigated || client).focus();
      } catch {
        return await client.focus();
      }
    }
    if (self.clients.openWindow) return self.clients.openWindow(targetUrl.href);
    return undefined;
  })());
});
