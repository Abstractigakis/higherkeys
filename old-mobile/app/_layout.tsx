import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import 'react-native-reanimated';

import { ControllerNavigationBlocker } from '@/components/controller-navigation-blocker';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [locationPermission, setLocationPermission] = useState<Location.PermissionStatus | null>(null);
  const [checkingPermission, setCheckingPermission] = useState(true);

  // Check location permission on mount
  useEffect(() => {
    const checkPermission = async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      setLocationPermission(status);
      setCheckingPermission(false);
    };
    checkPermission();
  }, []);

  useEffect(() => {
    if (loading || checkingPermission) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!user && !inAuthGroup) {
      // Redirect to sign in if not authenticated
      router.replace('/auth/sign-in');
    } else if (user && inAuthGroup) {
      // Redirect to home if authenticated
      router.replace('/');
    }
  }, [user, loading, segments, router, checkingPermission]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status);
      
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'This app requires precise location access to save where you create highlights. Please enable location permissions in your device settings.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      Alert.alert('Error', 'Failed to request location permission');
    }
  };

  // Show location permission blocker if not granted
  if (!checkingPermission && locationPermission !== 'granted') {
    return (
      <View style={styles.blockerContainer}>
        <View style={styles.blockerContent}>
          <Text style={styles.blockerTitle}>Location Permission Required</Text>
          <Text style={styles.blockerText}>
            This app needs precise location access to remember where you were when you create highlights.
          </Text>
          <Text style={styles.blockerSubtext}>
            Your location is only saved when you create a highlight and is never shared with anyone else.
          </Text>
          <TouchableOpacity 
            style={styles.permissionButton}
            onPress={requestLocationPermission}
          >
            <Text style={styles.permissionButtonText}>Grant Location Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <ControllerNavigationBlocker />
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false, title: 'Videos' }} />
        <Stack.Screen name="auth/sign-in" options={{ headerShown: false }} />
        <Stack.Screen name="auth/sign-up" options={{ headerShown: false }} />
        <Stack.Screen name="auth/forgot-password" options={{ headerShown: false }} />
        <Stack.Screen name="video" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Profile' }} />
        <Stack.Screen name="+not-found" options={{ title: 'Not Found' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  blockerContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  blockerContent: {
    maxWidth: 400,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  blockerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  blockerText: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 24,
  },
  blockerSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 200,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
