import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Highlight } from '../types/highlight';

interface HighlightMarkerProps {
  highlight: Highlight;
  onPress: () => void;
  onDelete?: () => void;
  videoDuration: number;
}

export const HighlightMarker: React.FC<HighlightMarkerProps> = ({
  highlight,
  onPress,
  onDelete,
  videoDuration,
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const startPercentage = (highlight.startTime / videoDuration) * 100;
  const duration = highlight.endTime - highlight.startTime;
  const widthPercentage = (duration / videoDuration) * 100;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.marker,
          {
            left: `${startPercentage}%`,
            width: `${widthPercentage}%`,
          },
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.markerContent}>
          <Text style={styles.timeText}>
            {formatTime(highlight.startTime)} - {formatTime(highlight.endTime)}
          </Text>
        </View>
      </TouchableOpacity>
      
      {onDelete && (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={onDelete}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.deleteText}>×</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    height: 30,
    marginVertical: 4,
  },
  marker: {
    position: 'absolute',
    height: '100%',
    backgroundColor: 'rgba(255, 193, 7, 0.6)',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ffc107',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  markerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 10,
    color: '#000',
    fontWeight: '600',
  },
  deleteButton: {
    position: 'absolute',
    right: 4,
    top: 2,
    width: 20,
    height: 20,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
