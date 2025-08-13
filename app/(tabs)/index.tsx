import { Redirect } from 'expo-router';

// Redirect from index to channels tab
export default function IndexScreen() {
  return <Redirect href="/channels" />;
}