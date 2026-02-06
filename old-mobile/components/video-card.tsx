import { getVideoThumbnailUrl } from '@/services/video-service';
import { Video } from '@/types/video';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface VideoCardProps {
  video: Video;
  onPress?: (video: Video) => void;
  isFocused?: boolean;
  isDownloaded?: boolean;
  isDownloading?: boolean;
}

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width * 0.25;
const CARD_HEIGHT = CARD_WIDTH * (9 / 16);

export function VideoCard({ video, onPress, isFocused = false, isDownloaded = false, isDownloading = false }: VideoCardProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadThumbnail = async () => {
      try {
        setLoading(true);
        setError(false);
        const url = await getVideoThumbnailUrl(video);
        setThumbnailUrl(url);
      } catch (err) {
        console.error('Failed to load thumbnail:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadThumbnail();
  }, [video]);

  return (
    <View style={[styles.wrapper, isFocused && styles.focusedWrapper]}>
      <TouchableOpacity
        style={styles.container}
        onPress={() => onPress?.(video)}
        activeOpacity={0.9}>
        <View style={styles.contentWrapper}>
        {/* Always render the image if we have a URL */}
        {thumbnailUrl && !error && (
          <>
            <Image
              source={{ uri: thumbnailUrl }}
              style={styles.thumbnail}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)']}
              style={styles.gradient}
            />
            <View style={styles.textOverlay}>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                <Text style={[styles.title, {flex: 1}]} numberOfLines={2}>
                  {video.title}
                </Text>
                {isDownloading && <ActivityIndicator size="small" color="#fff" style={{marginLeft: 8}} />}
                {!isDownloading && isDownloaded && <Text style={{fontSize: 16, marginLeft: 8}}>✅</Text>}
              </View>
              {video.description && (
                <Text style={styles.description} numberOfLines={2}>
                  {video.description}
                </Text>
              )}
            </View>
          </>
        )}
        
        {/* Show loading indicator on top if still loading */}
        {loading && (
          <View style={styles.placeholderContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        )}
        
        {/* Show error if failed and no thumbnail */}
        {error && !thumbnailUrl && (
          <View style={styles.placeholderContainer}>
            <Text style={styles.errorText}>Failed to load thumbnail</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 12,
  },
  focusedWrapper: {
    borderWidth: 4,
    borderColor: '#007AFF',
    borderRadius: 12,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  container: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  contentWrapper: {
    width: '100%',
    height: '100%',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
  },
  textOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  errorText: {
    fontSize: 14,
    color: '#999',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  description: {
    fontSize: 13,
    color: '#fff',
    lineHeight: 18,
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
