import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { firebaseConfig } from './firebase.config.ts';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

/**
 * Auth keeps its session in AsyncStorage, so a restart does not sign the user out.
 * initializeAuth throws when called twice for one app (Fast Refresh re-runs this module),
 * hence the fallback to getAuth.
 */
function createAuth() {
  try {
    return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    return getAuth(app);
  }
}

export const auth = createAuth();

/** Long polling, because React Native's WebChannel streaming is unreliable. */
export const db = initializeFirestore(app, { experimentalForceLongPolling: true });
