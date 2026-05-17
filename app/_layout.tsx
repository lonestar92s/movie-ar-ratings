import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0a0a0a' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: '#0a0a0a' },
          headerBackTitle: 'Back',
        }}
      >
        <Stack.Screen name="index" options={{ title: 'CineScope', headerShown: false }} />
        <Stack.Screen name="scanner" options={{ title: 'Scan Screen', headerShown: false }} />
        <Stack.Screen name="rating" options={{ title: 'Ratings' }} />
      </Stack>
    </>
  );
}
