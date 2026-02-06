import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
// From firebase.json project: vcms-1763522692
const firebaseConfig = {
  apiKey: "AIzaSyAYBt6Ah1SOqZdZBnMa0Aao8UJbjvG5DsI",
  authDomain: "vcms-1763522692.firebaseapp.com",
  projectId: "vcms-1763522692",
  storageBucket: "vcms-1763522692.firebasestorage.app",
  messagingSenderId: "218535433510",
  appId: "1:218535433510:web:ee83cb3c44b8bdbf375de7"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize services
// Note: Firebase Auth in React Native uses memory persistence by default
// For production, consider using @react-native-firebase/auth for native persistence
let auth;
try {
  // @ts-ignore
  auth = initializeAuth(app, {
    // @ts-ignore
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
  });
} catch (e: any) {
  if (e.code === 'auth/already-initialized') {
    auth = getAuth(app);
  } else {
    console.error('Firebase auth initialization error:', e);
    throw e;
  }
}

const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
export default app;
