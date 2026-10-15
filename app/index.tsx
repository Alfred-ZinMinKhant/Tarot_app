import { Redirect } from 'expo-router';

import { useSettings } from '@/store/settings';

export default function Index() {
  const hasOnboarded = useSettings((s) => s.hasOnboarded);
  return <Redirect href={hasOnboarded ? '/home' : '/welcome'} />;
}
