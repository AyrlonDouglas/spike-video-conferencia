import { Stack } from 'expo-router';
import { registerGlobals } from '@livekit/react-native';

registerGlobals();

export default function RootLayout() {
  return <Stack />;
}
