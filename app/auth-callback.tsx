import { Redirect } from 'expo-router';

/**
 * Landing route for the sign-in redirect (`mingalartarot://auth-callback`). The browser session
 * normally intercepts it; if the OS opens the app instead, just return to Settings.
 */
export default function AuthCallback() {
  return <Redirect href="/settings" />;
}
