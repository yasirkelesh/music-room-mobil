import { Redirect } from 'expo-router';

// Until real auth exists, every launch starts at the welcome screen.
export default function Index() {
  return <Redirect href="/welcome" />;
}
