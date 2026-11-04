import {
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { saveFirestoreSharedAuth, getFirestoreSharedAuth, SharedGoogleAuth } from './firestoreService';

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

const LOCAL_TOKEN_KEY = 'fia_google_access_token_v1';
const LOCAL_USER_KEY = 'fia_google_user_v1';

let cachedAccessToken: string | null = (typeof window !== 'undefined' ? localStorage.getItem(LOCAL_TOKEN_KEY) : null);
let isSigningIn = false;

export interface AppGoogleUser {
  uid?: string;
  email: string;
  displayName: string;
  photoURL?: string;
  isSharedConnection?: boolean;
}

/**
 * Persist user and token locally so browser refresh never requires re-login
 */
export function saveLocalGoogleSession(
  user: { email?: string | null; displayName?: string | null; photoURL?: string | null; uid?: string },
  token: string
) {
  try {
    cachedAccessToken = token;
    localStorage.setItem(LOCAL_TOKEN_KEY, token);
    const emailStr = user.email || '';
    localStorage.setItem(
      LOCAL_USER_KEY,
      JSON.stringify({
        email: emailStr,
        displayName: user.displayName || (emailStr ? emailStr.split('@')[0] : 'User'),
        photoURL: user.photoURL || '',
        uid: user.uid || '',
      })
    );
  } catch (e) {
    console.warn('Error saving local auth session:', e);
  }
}

export function getLocalGoogleSession(): { user: AppGoogleUser | null; token: string | null } {
  try {
    const rawUser = localStorage.getItem(LOCAL_USER_KEY);
    const token = localStorage.getItem(LOCAL_TOKEN_KEY) || cachedAccessToken;
    if (rawUser && token) {
      return { user: JSON.parse(rawUser), token };
    }
  } catch (e) {
    // Non-blocking
  }
  return { user: null, token: null };
}

export function clearLocalGoogleSession() {
  cachedAccessToken = null;
  try {
    localStorage.removeItem(LOCAL_TOKEN_KEY);
    localStorage.removeItem(LOCAL_USER_KEY);
  } catch (e) {
    // Non-blocking
  }
}

/**
 * Sync shared Google authentication status with central server & Cloud Firestore
 */
export async function broadcastSharedGoogleAuth(
  user: { email?: string | null; displayName?: string | null; photoURL?: string | null },
  token: string
) {
  const emailStr = user.email || '';
  const sharedData: SharedGoogleAuth = {
    connected: true,
    email: emailStr,
    displayName: user.displayName || (emailStr ? emailStr.split('@')[0] : 'User'),
    photoURL: user.photoURL || '',
    connectedAt: new Date().toISOString(),
  };

  // 1. Sync to Cloud Firestore
  try {
    await saveFirestoreSharedAuth(sharedData);
  } catch (err) {
    console.warn('Notice saving shared auth to Firestore:', err);
  }

  // 2. Sync to Express Server
  try {
    await fetch('/api/auth/shared-google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...sharedData,
        accessToken: token,
      }),
    });
  } catch (err) {
    console.warn('Notice saving shared auth to server:', err);
  }
}

export const initAuth = (
  onAuthSuccess?: (user: User | AppGoogleUser, token: string) => void,
  onAuthFailure?: () => void
) => {
  // First, instantly check if we already have a saved session in localStorage
  const localSession = getLocalGoogleSession();
  if (localSession.user && localSession.token && onAuthSuccess) {
    onAuthSuccess(localSession.user as any, localSession.token);
  }

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const token = cachedAccessToken || localStorage.getItem(LOCAL_TOKEN_KEY) || '';
      saveLocalGoogleSession(user, token);
      if (onAuthSuccess) onAuthSuccess(user, token);
    } else {
      // If Firebase Auth does not have user, check if localSession exists
      const restored = getLocalGoogleSession();
      if (restored.user && restored.token) {
        if (onAuthSuccess) onAuthSuccess(restored.user as any, restored.token);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan token akses dari Google Sign-In');
    }
    cachedAccessToken = credential.accessToken;

    // 1. Save locally for 1-time login across page reloads on this device
    saveLocalGoogleSession(result.user, cachedAccessToken);

    // 2. Broadcast to Cloud Database so OTHER devices don't have to login
    await broadcastSharedGoogleAuth(result.user, cachedAccessToken);

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken || (typeof window !== 'undefined' ? localStorage.getItem(LOCAL_TOKEN_KEY) : null);
};

export const logout = async () => {
  await signOut(auth);
  clearLocalGoogleSession();
  try {
    await fetch('/api/auth/shared-google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ disconnect: true }),
    });
  } catch (e) {
    // Non-blocking
  }
};
