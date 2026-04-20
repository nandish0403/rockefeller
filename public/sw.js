self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = payload.title || "Rockefeller Alert";
  const body = payload.message || "New safety notification";
  const zoneId = payload.zone_id || null;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      data: {
        zoneId,
      },
      tag: payload.id || undefined,
      renotify: true,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const zoneId = event.notification?.data?.zoneId;
  const nextPath = zoneId ? `/zones/${zoneId}` : "/dashboard";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ("focus" in client) {
          client.navigate(nextPath);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(nextPath);
      }
      return null;
    })
  );
});
