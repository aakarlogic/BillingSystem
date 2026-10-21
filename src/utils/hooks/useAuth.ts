import { useNavigate } from 'react-router';
import appConfig from '@/configs/app.config';
import { useUserData } from '@/context/UserDataContext';
import { getAccessToken, getRefreshToken, isValidToken } from '@/guards/jwt/jwt';
import type { SignInData, SignInRequest } from '@/types/auth';

/** Signed in: the access token is still good, or there is a refresh token to get a new one on the next 401. */
export function isAuthenticated(): boolean {
  return isValidToken(getAccessToken()) || !!getRefreshToken();
}

export type SignInResult = { status: 'success'; redirectPath: string } | { status: 'failed'; message: string };

/** Sign in / sign out with navigation, same idea as Health 360's useAuth. */
export default function useAuth() {
  const navigate = useNavigate();
  const { signIn: doSignIn, startSession, signOut: doSignOut } = useUserData();

  async function signIn(req: SignInRequest, redirectTo?: string): Promise<SignInResult> {
    try {
      await doSignIn(req);
      const redirectPath = redirectTo || appConfig.authenticatedEntryPath;
      navigate(redirectPath, { replace: true });
      return { status: 'success', redirectPath };
    } catch (e) {
      return { status: 'failed', message: (e as Error).message };
    }
  }

  /** After sign-up: the API already answered with tokens, so open the app straight away. */
  async function enter(data: SignInData, redirectTo?: string) {
    await startSession(data);
    navigate(redirectTo || appConfig.authenticatedEntryPath, { replace: true });
  }

  async function signOut() {
    await doSignOut();
    navigate(appConfig.unAuthenticatedEntryPath, { replace: true });
  }

  return { signIn, enter, signOut, authenticated: isAuthenticated() };
}
