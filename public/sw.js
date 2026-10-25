/* Service worker DINO : affiche les notifications push (alertes de prix). Aucun cache de données personnelles. */
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "DINO", body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "🦖 DINO", {
      body: data.body || "",
      icon: "/icon.svg",
      badge: "/icon.svg",
      data: { link: data.url || data.link || "/alertes" },
      tag: data.tag || undefined,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || "/alertes";
  event.waitUntil(self.clients.openWindow(link));
});
