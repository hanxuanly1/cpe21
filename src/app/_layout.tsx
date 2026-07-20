import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '@/components/ui';
import { SettingsProvider, useSettings } from '@/lib/settings';

void SplashScreen.preventAutoHideAsync();

function SplashGate({ children }: { children: React.ReactNode }) {
  const { ready } = useSettings();
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);
  if (!ready) return null;
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SettingsProvider>
          <SplashGate>
            <ToastProvider>
              <StatusBar style="auto" />
              <Stack screenOptions={{ headerShown: false }} />
            </ToastProvider>
          </SplashGate>
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
