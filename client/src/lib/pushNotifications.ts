function base64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let index = 0; index < rawData.length; index += 1) {
    output[index] = rawData.charCodeAt(index);
  }
  return output;
}

export function isPushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function enablePushNotifications({ requestPermission = true } = {}) {
  if (!isPushSupported()) {
    throw new Error("Outside-app notifications are not supported on this browser.");
  }

  if (Notification.permission === "denied") {
    throw new Error("Notifications are blocked. Enable them from browser settings.");
  }

  if (Notification.permission !== "granted") {
    if (!requestPermission) return false;
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;
  }

  const keyRes = await fetch("/api/push/public-key", { credentials: "include" });
  if (!keyRes.ok) throw new Error("Push notifications are not configured.");
  const { publicKey } = await keyRes.json() as { publicKey: string };

  const registration = await navigator.serviceWorker.register("/sw.js");
  const existing = await registration.pushManager.getSubscription();
  const subscription = existing || await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64ToUint8Array(publicKey),
  });

  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription.toJSON()),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Could not save notification subscription.");
  }

  return true;
}

export async function syncGrantedPushSubscription() {
  if (!isPushSupported() || Notification.permission !== "granted") return false;
  return enablePushNotifications({ requestPermission: false });
}
