import * as FileSystem from 'expo-file-system/legacy';
import * as Location from 'expo-location';
import * as Network from 'expo-network';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/auth-context';
import {
    createHighlight,
    deleteHighlight,
    getCurrentLocation,
    getHighlightsByUserAndVideo,
} from '../services/highlight-service';
import {
    getVideoDirectory,
    saveOfflineHighlight,
    syncPendingHighlights
} from '../services/offline-storage-service';
import { Highlight } from '../types/highlight';

export const useHighlights = (videoid: string) => {
  const { user } = useAuth();
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationPermission, setLocationPermission] = useState<Location.PermissionStatus | null>(null);

  // Check location permission status
  useEffect(() => {
    const checkPermission = async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      setLocationPermission(status);
    };
    checkPermission();
  }, []);

  // Sync pending highlights when online
  useEffect(() => {
    const checkSync = async () => {
      const state = await Network.getNetworkStateAsync();
      if (state.isConnected && state.isInternetReachable) {
        await syncPendingHighlights();
      }
    };
    checkSync();
  }, []);

  // Load highlights for the current video and user
  const loadHighlights = useCallback(async () => {
    if (!user || !videoid) {
      setLoading(false);
      setHighlights([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const state = await Network.getNetworkStateAsync();
      const isOffline = !state.isConnected || !state.isInternetReachable;

      if (isOffline) {
        // Load from local file
        const videoDir = getVideoDirectory(videoid);
        const highlightsFile = `${videoDir}highlights.json`;
        const fileInfo = await FileSystem.getInfoAsync(highlightsFile);
        
        if (fileInfo.exists) {
          const content = await FileSystem.readAsStringAsync(highlightsFile);
          const localHighlights = JSON.parse(content);
          setHighlights(localHighlights);
        } else {
          setHighlights([]);
        }
      } else {
        // Load from Firestore
        const data = await getHighlightsByUserAndVideo(user.uid, videoid);
        setHighlights(data);
      }
    } catch (err) {
      console.error('Error loading highlights:', err);
      // Fallback to local if Firestore fails
      try {
        const videoDir = getVideoDirectory(videoid);
        const highlightsFile = `${videoDir}highlights.json`;
        const fileInfo = await FileSystem.getInfoAsync(highlightsFile);
        if (fileInfo.exists) {
          const content = await FileSystem.readAsStringAsync(highlightsFile);
          setHighlights(JSON.parse(content));
        } else {
          setHighlights([]);
        }
      } catch (localErr) {
        setHighlights([]);
      }
    } finally {
      setLoading(false);
    }
  }, [user, videoid]);

  useEffect(() => {
    loadHighlights();
  }, [loadHighlights]);

  // Create a new highlight
  const addHighlight = async (startTime: number, endTime: number) => {
    if (!user) {
      throw new Error('User must be authenticated to create highlights');
    }

    if (!videoid) {
      throw new Error('Video ID is required to create highlights');
    }

    try {
      // Get current location
      let location: { latitude: number; longitude: number };
      
      try {
        location = await getCurrentLocation();
      } catch (locationError) {
        console.warn('Could not get location, using default:', locationError);
        // Use default location (0,0) if location is unavailable
        location = { latitude: 0, longitude: 0 };
      }

      const state = await Network.getNetworkStateAsync();
      const isOffline = !state.isConnected || !state.isInternetReachable;

      if (isOffline) {
        await saveOfflineHighlight(user.uid, videoid, {
          startTime,
          endTime,
          location,
        });
        // Reload to show the new local highlight
        await loadHighlights();
        return 'offline_pending';
      } else {
        const highlightId = await createHighlight(user.uid, videoid, {
          startTime,
          endTime,
          location,
        });
        // Reload highlights
        await loadHighlights();
        return highlightId;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create highlight');
      throw err;
    }
  };

  // Delete a highlight
  const removeHighlight = async (highlightId: string) => {
    try {
      await deleteHighlight(highlightId);
      setHighlights((prev) => prev.filter((h) => h.id !== highlightId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete highlight');
      throw err;
    }
  };

  return {
    highlights,
    loading,
    error,
    locationPermission,
    addHighlight,
    removeHighlight,
    refreshHighlights: loadHighlights,
  };
};
