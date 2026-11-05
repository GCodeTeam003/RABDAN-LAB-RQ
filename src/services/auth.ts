import {
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import firebaseConfig from '../../firebase-applet-config.json';

declare global {
  interface Window {
    google?: any;
  }
}

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

// In-memory token cache (never stored in localStorage)
let cachedAccessToken: string | null = null;
let cachedGisUser: User | null = null;
let isSigningIn = false;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else if (cachedGisUser && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(cachedGisUser, cachedAccessToken);
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

const signInWithGIS = async (): Promise<{ user: User; accessToken: string }> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.google?.accounts?.oauth2) {
      reject(new Error('Google Identity Services SDK belum tersedia di browser.'));
      return;
    }

    const clientId = firebaseConfig?.oAuthClientId;
    if (!clientId) {
      reject(new Error('OAuth Client ID tidak ditemukan di konfigurasi.'));
      return;
    }

    try {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope:
          'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            reject(new Error(tokenResponse.error_description || tokenResponse.error));
            return;
          }
          const token = tokenResponse.access_token;
          if (!token) {
            reject(new Error('Token akses tidak diterima dari Google.'));
            return;
          }

          cachedAccessToken = token;

          try {
            const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${token}` },
            });
            const profile = await profileRes.json();
            const fallbackUser = {
              uid: profile.sub || 'gis-' + Date.now(),
              email: profile.email || 'Pengguna Google',
              displayName: profile.name || profile.email || 'Pengguna Google',
              photoURL: profile.picture || null,
              emailVerified: profile.email_verified ?? true,
              isAnonymous: false,
              metadata: {},
              providerData: [],
              refreshToken: '',
              tenantId: null,
              delete: async () => {},
              getIdToken: async () => token,
              getIdTokenResult: async () => ({} as any),
              reload: async () => {},
              toJSON: () => ({}),
              phoneNumber: null,
              providerId: 'google.com',
            } as unknown as User;

            cachedGisUser = fallbackUser;
            resolve({ user: fallbackUser, accessToken: token });
          } catch {
            const basicUser = {
              uid: 'gis-' + Date.now(),
              email: 'Pengguna Google',
              displayName: 'Pengguna Google',
              emailVerified: true,
            } as unknown as User;
            cachedGisUser = basicUser;
            resolve({ user: basicUser, accessToken: token });
          }
        },
      });

      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (err) {
      reject(err);
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential?.accessToken) {
        throw new Error('Gagal mendapatkan token akses dari Google Sign-In');
      }
      cachedAccessToken = credential.accessToken;
      return { user: result.user, accessToken: cachedAccessToken };
    } catch (error: any) {
      const isUnauthorizedDomain =
        error?.code === 'auth/unauthorized-domain' ||
        (error?.message && String(error.message).includes('auth/unauthorized-domain'));

      // If Firebase Auth throws unauthorized domain, try direct Google Identity Services
      if (isUnauthorizedDomain && typeof window !== 'undefined' && window.google?.accounts?.oauth2) {
        console.warn('Firebase Auth unauthorized domain encountered. Attempting direct Google Identity Services fallback...');
        const gisResult = await signInWithGIS();
        return gisResult;
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (_) {}
  cachedAccessToken = null;
  cachedGisUser = null;
};
