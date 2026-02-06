/**
 * Example Video Player with Highlights Integration
 * 
 * This component demonstrates how to integrate the highlights feature
 * into your video player. Copy this pattern into your actual video player.
 */

import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useHighlights } from '../hooks/use-highlights';
import { Highlight } from '../types/highlight';
import { HighlightsList } from './highlights-list';

interface VideoPlayerWithHighlightsProps {
  videoId: string;
  // Add your video player props here
}

export const VideoPlayerWithHighlights: React.FC<VideoPlayerWithHighlightsProps> = ({
  videoId,
}) => {
  // Video player state
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Highlight selection state
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
  
  // Highlights hook
  const {
    highlights,
    loading,
    error,
    locationPermission,
    addHighlight,
    removeHighlight,
  } = useHighlights(videoId);

  // Handle marking start of highlight
  const handleMarkStart = () => {
    setSelectionStart(currentTime);
    setSelectionEnd(null);
  };

  // Handle marking end of highlight
  const handleMarkEnd = () => {
    if (selectionStart === null) {
      Alert.alert('Error', 'Please mark the start time first');
      return;
    }
    
    if (currentTime <= selectionStart) {
      Alert.alert('Error', 'End time must be after start time');
      return;
    }
    
    setSelectionEnd(currentTime);
  };

  // Save highlight to Firebase
  const handleSaveHighlight = async () => {
    if (selectionStart === null || selectionEnd === null) {
      Alert.alert('Error', 'Please mark both start and end times');
      return;
    }

    try {
      await addHighlight(selectionStart, selectionEnd);
      
      Alert.alert(
        'Success',
        'Highlight saved with your location!',
        [{ text: 'OK' }]
      );
      
      // Reset selection
      setSelectionStart(null);
      setSelectionEnd(null);
    } catch (err) {
      Alert.alert('Error', 'Failed to save highlight');
      console.error(err);
    }
  };

  // Cancel highlight selection
  const handleCancelSelection = () => {
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  // Handle pressing a highlight - jump to that time
  const handleHighlightPress = (highlight: Highlight) => {
    // Jump video to highlight start time
    setCurrentTime(highlight.startTime);
    // Your video player seek logic here
    
    // Show highlight details
    const locationText = 
      highlight.location.latitude === 0 && highlight.location.longitude === 0
        ? 'Location unavailable'
        : `${highlight.location.latitude.toFixed(4)}°, ${highlight.location.longitude.toFixed(4)}°`;
    
    Alert.alert(
      'Highlight Details',
      `📍 Location: ${locationText}\n` +
      `🕐 Created: ${new Date(highlight.createdAt).toLocaleString()}\n` +
      `⏱️ Duration: ${Math.round(highlight.endTime - highlight.startTime)}s`,
      [{ text: 'OK' }]
    );
  };

  // Handle deleting a highlight
  const handleHighlightDelete = async (highlightId: string) => {
    try {
      await removeHighlight(highlightId);
      Alert.alert('Success', 'Highlight deleted');
    } catch (err) {
      Alert.alert('Error', 'Failed to delete highlight');
      console.error(err);
    }
  };

  // Format time helper
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {/* Your video player component goes here */}
      <View style={styles.videoContainer}>
        <Text style={styles.placeholderText}>Your Video Player Here</Text>
        <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
      </View>

      {/* Location permission warning */}
      {locationPermission === 'denied' && (
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>
            ⚠️ Location permission denied. Highlights will save without location data.
          </Text>
        </View>
      )}

      {/* Highlight Creation Controls */}
      <View style={styles.highlightControls}>
        <Text style={styles.sectionTitle}>Create Highlight</Text>
        
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[
              styles.button,
              selectionStart !== null && styles.buttonActive
            ]}
            onPress={handleMarkStart}
          >
            <Text style={styles.buttonText}>
              {selectionStart !== null 
                ? `▶️ ${formatTime(selectionStart)}`
                : '▶️ Mark Start'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.button,
              selectionStart === null && styles.buttonDisabled,
              selectionEnd !== null && styles.buttonActive
            ]}
            onPress={handleMarkEnd}
            disabled={selectionStart === null}
          >
            <Text style={styles.buttonText}>
              {selectionEnd !== null 
                ? `⏹️ ${formatTime(selectionEnd)}`
                : '⏹️ Mark End'}
            </Text>
          </TouchableOpacity>
        </View>

        {selectionStart !== null && selectionEnd !== null && (
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.button, styles.saveButton]}
              onPress={handleSaveHighlight}
            >
              <Text style={styles.buttonText}>💾 Save Highlight</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancelSelection}
            >
              <Text style={styles.buttonText}>❌ Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {selectionStart !== null && (
          <Text style={styles.selectionInfo}>
            {selectionEnd !== null
              ? `Selected: ${formatTime(selectionStart)} - ${formatTime(selectionEnd)} (${Math.round(selectionEnd - selectionStart)}s)`
              : `Start marked at ${formatTime(selectionStart)}`}
          </Text>
        )}
      </View>

      {/* Highlights List */}
      <View style={styles.highlightsContainer}>
        <Text style={styles.sectionTitle}>
          📌 Your Highlights ({highlights.length})
        </Text>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        ) : error ? (
          <Text style={styles.errorText}>❌ {error}</Text>
        ) : (
          <HighlightsList
            highlights={highlights}
            onHighlightPress={handleHighlightPress}
            onHighlightDelete={handleHighlightDelete}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  videoContainer: {
    height: 250,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 8,
  },
  timeText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  warningContainer: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ffc107',
  },
  warningText: {
    fontSize: 12,
    color: '#856404',
    textAlign: 'center',
  },
  highlightControls: {
    padding: 16,
    backgroundColor: '#fff',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: '#333',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  button: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonActive: {
    backgroundColor: '#34C759',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.5,
  },
  saveButton: {
    backgroundColor: '#34C759',
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  selectionInfo: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  highlightsContainer: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: 8,
    paddingTop: 16,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  errorText: {
    color: '#FF3B30',
    textAlign: 'center',
    padding: 16,
  },
});
