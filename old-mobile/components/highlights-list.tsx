import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Highlight } from '../types/highlight';

interface HighlightsListProps {
  highlights: Highlight[];
  onHighlightPress: (highlight: Highlight) => void;
  onHighlightDelete: (highlightId: string) => void;
}

export const HighlightsList: React.FC<HighlightsListProps> = ({
  highlights,
  onHighlightPress,
  onHighlightDelete,
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  const formatLocation = (lat: number, lon: number) => {
    if (lat === 0 && lon === 0) {
      return 'Location unavailable';
    }
    return `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`;
  };

  const handleDelete = (highlightId: string | undefined) => {
    if (!highlightId) return;

    Alert.alert(
      'Delete Highlight',
      'Are you sure you want to delete this highlight?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onHighlightDelete(highlightId),
        },
      ]
    );
  };

  if (highlights.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No highlights yet</Text>
        <Text style={styles.emptySubtext}>
          Create a highlight by selecting a video segment
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {highlights.map((highlight) => (
        <TouchableOpacity
          key={highlight.id}
          style={styles.highlightCard}
          onPress={() => onHighlightPress(highlight)}
          activeOpacity={0.7}
        >
          <View style={styles.highlightHeader}>
            <Text style={styles.timeRange}>
              {formatTime(highlight.startTime)} - {formatTime(highlight.endTime)}
            </Text>
            <TouchableOpacity
              onPress={() => handleDelete(highlight.id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.deleteIcon}>🗑️</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.duration}>
            Duration: {Math.round(highlight.endTime - highlight.startTime)}s
          </Text>
          
          <View style={styles.metadataRow}>
            <Text style={styles.metadata}>📍 {formatLocation(
              highlight.location.latitude,
              highlight.location.longitude
            )}</Text>
          </View>
          
          <View style={styles.metadataRow}>
            <Text style={styles.metadata}>🕐 {formatDate(highlight.createdAt)}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  highlightCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  highlightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeRange: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  deleteIcon: {
    fontSize: 20,
  },
  duration: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  metadataRow: {
    marginTop: 4,
  },
  metadata: {
    fontSize: 12,
    color: '#888',
  },
});
