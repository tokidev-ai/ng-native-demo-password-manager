/**
 * Firebase web config, read from EXPO_PUBLIC_* variables in .env (see .env.example).
 * Expo replaces each `process.env.EXPO_PUBLIC_X` reference with its value at bundle time, so the
 * names are written out in full rather than read through a loop.
 */
export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
};

/** True once .env has been filled in, so the UI can show a setup hint instead of failing later. */
export const isFirebaseConfigured = firebaseConfig.apiKey !== '' && firebaseConfig.appId !== '';
