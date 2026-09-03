import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as NavigationBar from 'expo-navigation-bar';
import * as SystemUI from 'expo-system-ui';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import 'react-native-reanimated';

import { AppThemeProvider, useAppTheme } from '@/lib/app-theme';

function RootLayoutContent() {
  const { isDark } = useAppTheme();

  const keepAndroidNavigationBarHidden = useCallback(async () => {
    if (Platform.OS !== 'android') {
      return;
    }

    try {
      await NavigationBar.setPositionAsync('absolute');
      await NavigationBar.setBehaviorAsync('overlay-swipe');
      await NavigationBar.setVisibilityAsync('hidden');
    } catch {
      // Some Android navigation modes ignore programmatic visibility changes.
    }
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    keepAndroidNavigationBarHidden();

    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        keepAndroidNavigationBarHidden();
      }
    });

    const visibilitySubscription = NavigationBar.addVisibilityListener(({ visibility }) => {
      if (visibility === 'visible') {
        setTimeout(keepAndroidNavigationBarHidden, 250);
      }
    });

    return () => {
      appStateSubscription.remove();
      visibilitySubscription.remove();
    };
  }, [keepAndroidNavigationBarHidden]);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(isDark ? '#0F172A' : '#F4F7F6');
  }, [isDark]);

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <RootLayoutContent />
    </AppThemeProvider>
  );
}
