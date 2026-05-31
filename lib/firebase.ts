// Firebase init — config-gated.
// If the NEXT_PUBLIC_FIREBASE_* env vars are absent, `isFirebaseConfigured` is
// false and the app stays in pass-and-play mode (zero regression). Once the keys
// are set, online mode (lobby + matchmaking + synced 1v1) activates.
//
// Required env vars (see SETUP-FIREBASE.md):
//   NEXT_PUBLIC_FIREBASE_API_KEY
//   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
//   NEXT_PUBLIC_FIREBASE_PROJECT_ID
//   NEXT_PUBLIC_FIREBASE_APP_ID
//   (optional) NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(config.apiKey && config.projectId && config.appId);

let _db: Firestore | null = null;

/** Lazily init Firestore. Returns null when Firebase isn't configured. */
export function getDb(): Firestore | null {
  if (!isFirebaseConfigured) return null;
  if (_db) return _db;
  const app: FirebaseApp = getApps().length ? getApp() : initializeApp(config);
  _db = getFirestore(app);
  return _db;
}
