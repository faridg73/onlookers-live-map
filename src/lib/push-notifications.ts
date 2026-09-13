import { initializeApp } from "firebase/app";
import { getMessaging, getToken, isSupported } from "firebase/messaging";

const appId = import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_APP_ID as string | undefined;
const vapidKey = import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_VAPID_KEY as string | undefined;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_WEB_API_KEY as string | undefined,
  projectId: import.meta.env.VITE_LOVABLE_CONNECTOR_FIREBASE_MESSAGING_PROJECT_ID as string | undefined,
  appId,
  messagingSenderId: appId?.split(":")[1] ?? "",
};

export type PushResult =
  | { status: "registered"; token: string }
  | { status: "not-configured" | "unsupported" | "open-in-new-tab" | "denied" | "cancelled" };

export function pushConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.projectId &&
      appId &&
      vapidKey &&
      firebaseConfig.messagingSenderId,
  );
}

/**
 * Registers this device for Firebase push notifications.
 * Must be called from a user gesture (button click) — browsers ignore
 * permission requests without one.
 */
export async function enablePush(): Promise<PushResult> {
  if (!pushConfigured()) {
    return { status: "not-configured" };
  }

  if (!("Notification" in window) || !(await isSupported())) {
    return { status: "unsupported" };
  }

  // The Lovable preview runs in a cross-origin iframe; browsers reject
  // Notification.requestPermission() there without ever showing the prompt.
  if (window.top !== window.self) {
    return { status: "open-in-new-tab" };
  }

  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") {
    return { status: "denied" };
  }

  const query = new URLSearchParams(firebaseConfig as Record<string, string>).toString();
  const swRegistration = await navigator.serviceWorker.register(`/firebase-messaging-sw.js?${query}`);
  const messaging = getMessaging(initializeApp(firebaseConfig));
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: swRegistration });

  return token ? { status: "registered", token } : { status: "denied" };
}

/** Removes the Firebase service worker and disables push on this device. */
export async function disablePush(): Promise<void> {
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations
      .filter((r) => r.scope.includes("firebase-messaging-sw"))
      .map((r) => r.unregister()),
  );
}
