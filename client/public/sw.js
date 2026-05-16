self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  const title = data.title || "QuickTurf";
  const options = {
    body: data.body || "You have a new update.",
    icon: "/favicon.png",
    badge: "/favicon.png",
    tag: data.tag || "quickturf",
    data: { url: data.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "/", self.location.origin).href;

  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const windowClient of windows) {
      if ("focus" in windowClient) {
        await windowClient.focus();
        if ("navigate" in windowClient) await windowClient.navigate(targetUrl);
        return;
      }
    }
    await clients.openWindow(targetUrl);
  })());
});
