import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { VideoCard } from "@/components/video-card";
import { useAuth } from "@/contexts/auth-context";
import { useGamepadNavigation } from "@/hooks/use-gamepad-navigation";
import {
  deleteVideo,
  downloadVideo,
  isVideoDownloaded,
} from "@/services/offline-storage-service";
import { getUserVideos } from "@/services/video-service";
import { Video } from "@/types/video";
import { useIsFocused } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function VideosScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const isFocused = useIsFocused();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<Record<string, boolean>>(
    {}
  );
  const [downloading, setDownloading] = useState<Record<string, boolean>>({});
  const flatListRef = useRef<FlatList>(null);

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
      await Promise.all(
        userVideos.map(async (v) => {
          status[v.id] = await isVideoDownloaded(v.id);
        })
      );
      setDownloadStatus(status);
    } catch (err) {
      console.error("Error loading videos:", err);
      setError("Failed to load videos");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadVideos();
  };

  const handleVideoPress = (video: Video) => {
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

    try {
      setDownloading((prev) => ({ ...prev, [video.id]: true }));

      if (downloadStatus[video.id]) {
        await deleteVideo(video.id);
        setDownloadStatus((prev) => ({ ...prev, [video.id]: false }));
      } else {
        await downloadVideo(video);
        setDownloadStatus((prev) => ({ ...prev, [video.id]: true }));
      }
    } catch (error) {
      console.error("Error handling offline video:", error);
    } finally {
      setDownloading((prev) => ({ ...prev, [video.id]: false }));
    }
  };

  const { focusedIndex, lastButtonPressed, debugLog } = useGamepadNavigation({
    itemCount: videos.length,
    onSelect: handleGamepadSelect,
    onAction: handleGamepadAction,
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
      <View style={styles.header}>
        <ThemedText style={styles.explanation}>
          Your raw capture library. Pure source material waiting for the perfect
          highlight.
        </ThemedText>
      </View>

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
          const wait = new Promise((resolve) => setTimeout(resolve, 500));
          wait.then(() => {
            flatListRef.current?.scrollToIndex({
              index: info.index,
              animated: true,
            });
          });
        }}
      />

      {debugMode && (
        <View style={styles.debugOverlay}>
          <View style={styles.debugHeader}>
            <Text style={styles.debugTitle}>🎮 Controller Debug</Text>
            <Text style={styles.debugSubtitle}>Focused: {focusedIndex}</Text>
          </View>

          {lastButtonPressed && (
            <View style={styles.currentButtonContainer}>
              <Text style={styles.currentButtonLabel}>Current:</Text>
              <Text style={styles.currentButton}>{lastButtonPressed}</Text>
            </View>
          )}

          <ScrollView
            style={styles.debugLogScroll}
            showsVerticalScrollIndicator={false}
          >
            {debugLog.map((entry, idx) => (
              <View
                key={`${entry.timestamp}-${idx}`}
                style={styles.debugLogEntry}
              >
                <Text style={styles.debugLogButton}>{entry.button}</Text>
                <Text style={styles.debugLogAction}>{entry.action}</Text>
              </View>
            ))}
          </ScrollView>

          <Text style={styles.debugToggle} onPress={() => setDebugMode(false)}>
            Tap to hide
          </Text>
        </View>
      )}

      {!debugMode && videos.length > 0 && (
        <View style={styles.debugToggleButton}>
          <Text
            style={styles.debugToggleText}
            onPress={() => setDebugMode(true)}
          >
            🎮
          </Text>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: "rgba(128, 128, 128, 0.08)",
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#007AFF",
  },
  explanation: {
    fontSize: 13,
    opacity: 0.85,
    fontStyle: "italic",
    lineHeight: 18,
    color: "#8E8E93",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#FF3B30",
    textAlign: "center",
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#666",
  },
  debugOverlay: {
    position: "absolute",
    top: 60,
    right: 16,
    width: 280,
    maxHeight: 400,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "#007AFF",
  },
  debugHeader: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.2)",
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  debugSubtitle: {
    fontSize: 12,
    color: "#999",
  },
  currentButtonContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 122, 255, 0.2)",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  currentButtonLabel: {
    fontSize: 12,
    color: "#999",
    marginRight: 8,
  },
  currentButton: {
    fontSize: 16,
    fontWeight: "700",
    color: "#007AFF",
    flex: 1,
  },
  debugLogScroll: {
    maxHeight: 200,
  },
  debugLogEntry: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  debugLogButton: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "600",
    flex: 1,
  },
  debugLogAction: {
    fontSize: 11,
    color: "#888",
  },
  debugToggle: {
    fontSize: 12,
    color: "#007AFF",
    textAlign: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.2)",
  },
  debugToggleButton: {
    position: "absolute",
    top: 60,
    right: 16,
    width: 50,
    height: 50,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#007AFF",
  },
  debugToggleText: {
    fontSize: 24,
  },
});
