/* eslint-disable */
// This service worker is loaded by src/lib/push-notifications.ts with the
// Firebase config in the query string, because service workers cannot read
// import.meta.env at runtime.

importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

const params = Object.fromEntries(new URL(self.location).searchParams);
firebase.initializeApp(params);
firebase.messaging();
