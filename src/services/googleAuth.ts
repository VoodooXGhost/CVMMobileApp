import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { runtimeConfig } from '../config/runtime';

export const configureGoogleSignIn = () => {
  GoogleSignin.configure({
    // We use the Web Client ID to request an idToken from Google
    // which our BFF will verify.
    webClientId: (runtimeConfig as any).googleWebClientId || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    offlineAccess: true,
  });
};

export const googleSignIn = async () => {
  try {
    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();
    return (userInfo as any).data?.idToken || (userInfo as any).idToken;
  } catch (error) {
    console.error('Google Sign-In failed', error);
    throw error;
  }
};

export const googleSignOut = async () => {
  try {
    await GoogleSignin.signOut();
  } catch (error) {
    console.error('Google Sign-Out failed', error);
  }
};

export const googleSignInSilently = async () => {
  try {
    const userInfo = await GoogleSignin.signInSilently();
    return (userInfo as any).data?.idToken || (userInfo as any).idToken;
  } catch (error) {
    console.warn('Google silent Sign-In failed', error);
    throw error;
  }
};
