import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { VideoCard } from '@/components/video-card';
import { useAuth } from '@/contexts/auth-context';
import { useGamepadNavigation } from '@/hooks/use-gamepad-navigation';
import { deleteVideo, downloadVideo, isVideoDownloaded } from '@/services/offline-storage-service';
import { getUserVideos } from '@/services/video-service';
import { Video } from '@/types/video';
import { useIsFocused } from '@react-navigation/native';
import * as Network from 'expo-network';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
} from 'react-native';

export default function VideosScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const isFocused = useIsFocused();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<Record<string, boolean>>({});
  const [downloading, setDownloading] = useState<Record<string, boolean>>({});
  const [isOffline, setIsOffline] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    checkNetworkStatus();
    const interval = setInterval(checkNetworkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const checkNetworkStatus = async () => {
    const state = await Network.getNetworkStateAsync();
    setIsOffline(!state.isConnected || !state.isInternetReachable);
  };

  useEffect(() => {
    if (user) {
      loadVideos();
    }
  }, [user]);

  const loadVideos = async () => {
    if (!user) return;

    try {
      setError(null);
      const userVideos = await getUserVideos(user.uid);
      setVideos(userVideos);

      const status: Record<string, boolean> = {};
      await Promise.all(userVideos.map(async (v) => {
        status[v.id] = await isVideoDownloaded(v.id);
      }));
      setDownloadStatus(status);
    } catch (err) {
      console.error('Error loading videos:', err);
      setError('Failed to load videos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadVideos();
  };

  const handleVideoPress = async (video: Video) => {
    const networkState = await Network.getNetworkStateAsync();
    const isOffline = !networkState.isConnected || !networkState.isInternetReachable;
    const isDownloaded = downloadStatus[video.id];

    if (isOffline && !isDownloaded) {
      Alert.alert(
        "Offline",
        "This video has not been downloaded. Please connect to the internet to watch it.",
        [{ text: "OK" }]
      );
      return;
    }

    router.push(`/video/${video.id}`);
  };

  const handleGamepadSelect = (index: number) => {
    if (videos[index]) {
      handleVideoPress(videos[index]);
    }
  };

  const handleGamepadAction = async (index: number) => {
    const video = videos[index];
    if (!video) return;

    if (downloading[video.id]) return;

    if (downloadStatus[video.id]) {
      Alert.alert(
        "Delete Download",
        "Are you sure you want to remove this video from your device?",
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                setDownloading(prev => ({ ...prev, [video.id]: true }));
                await deleteVideo(video.id);
                setDownloadStatus(prev => ({ ...prev, [video.id]: false }));
              } catch (error) {
                console.error('Error deleting video:', error);
                Alert.alert("Error", "Failed to delete video.");
              } finally {
                setDownloading(prev => ({ ...prev, [video.id]: false }));
              }
            }
          }
        ]
      );
    } else {
      try {
        setDownloading(prev => ({ ...prev, [video.id]: true }));
        await downloadVideo(video);
        setDownloadStatus(prev => ({ ...prev, [video.id]: true }));
      } catch (error) {
        console.error('Error handling offline video:', error);
        Alert.alert("Error", "Failed to download video.");
      } finally {
        setDownloading(prev => ({ ...prev, [video.id]: false }));
      }
    }
  };

  const handleHomeButton = () => {
    router.push('/modal');
  };

  const { focusedIndex, lastButtonPressed, debugLog } = useGamepadNavigation({
    itemCount: videos.length,
    onSelect: handleGamepadSelect,
    onAction: handleGamepadAction,
    onHome: handleHomeButton,
    columns: videos.length,
    debug: debugMode,
    enabled: isFocused && !loading && !error && videos.length > 0,
  });

  // Auto-scroll to focused item
  useEffect(() => {
    if (flatListRef.current && videos.length > 0) {
      flatListRef.current.scrollToIndex({
        index: focusedIndex,
        animated: true,
        viewPosition: 0.5,
      });
    }
  }, [focusedIndex, videos.length]);

  if (loading) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ThemedText style={styles.errorText}>{error}</ThemedText>
      </ThemedView>
    );
  }

  if (videos.length === 0) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ThemedText style={styles.emptyText}>No videos yet</ThemedText>
        <ThemedText style={styles.emptySubtext}>
          Your videos will appear here
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {isOffline && (
        <ThemedView style={styles.offlineBanner}>
          <ThemedText style={styles.offlineText}>Offline Mode</ThemedText>
        </ThemedView>
      )}
      <FlatList
        ref={flatListRef}
        data={videos}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => (
          <VideoCard 
            video={item} 
            onPress={handleVideoPress}
            isFocused={index === focusedIndex}
            isDownloaded={downloadStatus[item.id]}
            isDownloading={downloading[item.id]}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        removeClippedSubviews={false}
        windowSize={10}
        snapToInterval={undefined}
        decelerationRate="fast"
        onScrollToIndexFailed={(info) => {
          const wait = new Promise(resolve => setTimeout(resolve, 500));
          wait.then(() => {
            flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
          });
        }}
      />
      

    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
  },
  offlineBanner: {
    backgroundColor: '#FF9500',
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
