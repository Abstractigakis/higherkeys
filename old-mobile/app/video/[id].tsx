import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useHighlights } from '@/hooks/use-highlights';
import { addAnalogStickListener, addButtonListener, GamepadAnalogStickEvent, GamepadButtonEvent } from '@/mobile/modules/expo-gamepad';
import { getVideoDirectory, isVideoDownloaded } from '@/services/offline-storage-service';
import { getVideoById, getVideoPlaylistUrl, getVideoVttUrl } from '@/services/video-service';
import { Video } from '@/types/video';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface VttCue {
  startTime: number;
  endTime: number;
  text: string;
}

interface WordChunk {
  id: string;
  words: VttCue[];
  startIndex: number;
}

// Memoized chunk component for performance
interface WordChunkProps {
  chunk: WordChunk;
  currentWordIndex: number;
  selectedWordIndex: number;
  highlightedRanges: {start: number; end: number}[];
  highlightStartIndex: number | null;
  antiHighlightStartIndex: number | null;
}

const WordChunkComponent = memo<WordChunkProps>(
  function WordChunkComponent({ chunk, currentWordIndex, selectedWordIndex, highlightedRanges, highlightStartIndex, antiHighlightStartIndex }) {
    return (
      <Text style={styles.chunkContainer}>
        {chunk.words.map((cue, index) => {
          const globalIndex = chunk.startIndex + index;
          const isCurrentWord = globalIndex === currentWordIndex;
          const isSelectedWord = globalIndex === selectedWordIndex;
          
          // Check if word is in a saved highlight range
          const isInHighlightedRange = highlightedRanges.some(
            range => globalIndex >= range.start && globalIndex <= range.end
          );
          
          // Check if word is in current preview range (between highlightStart and selected)
          const isInPreviewRange = highlightStartIndex !== null && (
            (globalIndex >= highlightStartIndex && globalIndex <= selectedWordIndex) ||
            (globalIndex >= selectedWordIndex && globalIndex <= highlightStartIndex)
          );
          
          // Check if word is in anti-highlight preview range
          const isInAntiHighlightRange = antiHighlightStartIndex !== null && (
            (globalIndex >= antiHighlightStartIndex && globalIndex <= selectedWordIndex) ||
            (globalIndex >= selectedWordIndex && globalIndex <= antiHighlightStartIndex)
          );
          
          return (
            <Text key={globalIndex}>
              <Text
                style={[
                  styles.word,
                  isCurrentWord && styles.highlightedWord,
                  isSelectedWord && styles.selectedWord,
                  isInHighlightedRange && styles.permanentHighlight,
                  isInPreviewRange && styles.previewHighlight,
                  isInAntiHighlightRange && styles.antiHighlightPreview
                ]}
              >
                {cue.text}
              </Text>
              {' '}
            </Text>
          );
        })}
      </Text>
    );
  },
  (prevProps, nextProps) => {
    // Check if any relevant word is in this chunk
    const prevHasCurrent = 
      prevProps.currentWordIndex >= prevProps.chunk.startIndex && 
      prevProps.currentWordIndex < prevProps.chunk.startIndex + prevProps.chunk.words.length;
    const nextHasCurrent = 
      nextProps.currentWordIndex >= nextProps.chunk.startIndex && 
      nextProps.currentWordIndex < nextProps.chunk.startIndex + nextProps.chunk.words.length;
    
    const prevHasSelected = 
      prevProps.selectedWordIndex >= prevProps.chunk.startIndex && 
      prevProps.selectedWordIndex < prevProps.chunk.startIndex + prevProps.chunk.words.length;
    const nextHasSelected = 
      nextProps.selectedWordIndex >= nextProps.chunk.startIndex && 
      nextProps.selectedWordIndex < nextProps.chunk.startIndex + nextProps.chunk.words.length;
    
    // Check if highlight ranges or preview changed
    const highlightRangesEqual = 
      prevProps.highlightedRanges.length === nextProps.highlightedRanges.length &&
      prevProps.highlightedRanges.every((r, i) => 
        r.start === nextProps.highlightedRanges[i]?.start && 
        r.end === nextProps.highlightedRanges[i]?.end
      );
    
    const highlightStartEqual = prevProps.highlightStartIndex === nextProps.highlightStartIndex;
    const antiHighlightStartEqual = prevProps.antiHighlightStartIndex === nextProps.antiHighlightStartIndex;
    
    return prevProps.chunk.id === nextProps.chunk.id && 
           prevHasCurrent === nextHasCurrent &&
           prevHasSelected === nextHasSelected &&
           highlightRangesEqual &&
           highlightStartEqual &&
           antiHighlightStartEqual &&
           (prevHasCurrent ? prevProps.currentWordIndex === nextProps.currentWordIndex : true) &&
           (prevHasSelected ? prevProps.selectedWordIndex === nextProps.selectedWordIndex : true);
  }
);

function VideoPlayer({ url, onTimeUpdate, onPlayerReady }: { url: string; onTimeUpdate: (time: number) => void; onPlayerReady: (player: any) => void }) {
  const player = useVideoPlayer({ uri: url }, (player) => {
    console.log('=== Video player initialized ===');
    console.log('URL:', url);
    console.log('Player status:', player.status);
    player.muted = false;
    player.volume = 1.0;
    player.play();
    onPlayerReady(player);
  });

  // Monitor player status
  useEffect(() => {
    if (!player) return;
    
    const checkStatus = setInterval(() => {
      console.log('Status:', player.status, '| Playing:', player.playing, '| Time:', player.currentTime.toFixed(2));
      
      if (player.status === 'error') {
        console.error('Player error - check HLS stream compatibility');
      }
    }, 2000);

    return () => clearInterval(checkStatus);
  }, [player]);

  // Update current time
  useEffect(() => {
    if (!player) return;

    const interval = setInterval(() => {
      const time = player.currentTime;
      onTimeUpdate(time);
    }, 100);

    return () => clearInterval(interval);
  }, [player, onTimeUpdate]);

  return (
    <VideoView
      player={player}
      style={styles.video}
      allowsPictureInPicture
      nativeControls
    />
  );
}

export default function VideoPlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  
  const [video, setVideo] = useState<Video | null>(null);
  const [playlistUrl, setPlaylistUrl] = useState<string | null>(null);
  const [allVttCues, setAllVttCues] = useState<VttCue[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWordIndex, setSelectedWordIndex] = useState(0);
  const [isHighlightMode, setIsHighlightMode] = useState(false);
  const [isAntiHighlightMode, setIsAntiHighlightMode] = useState(false);
  const [highlightStartIndex, setHighlightStartIndex] = useState<number | null>(null);
  const [antiHighlightStartIndex, setAntiHighlightStartIndex] = useState<number | null>(null);
  const [highlightedRanges, setHighlightedRanges] = useState<{start: number; end: number; highlightId?: string}[]>([]);
  const [showLegend, setShowLegend] = useState(false);
  const [showTranscript, setShowTranscript] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [showSpeedIndicator, setShowSpeedIndicator] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const playbackSpeedsRef = useRef([1.0, 1.25, 1.5, 1.75, 2.0]);
  const speedIndicatorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Firebase highlights integration
  const { highlights, loading: highlightsLoading, addHighlight, removeHighlight } = useHighlights(id || '');
  
  const flatListRef = useRef<FlatList>(null);
  const scrollOffsetRef = useRef(0);
  const playerRef = useRef<any>(null);
  const analogNavigationRef = useRef<{ lastNavTime: number; direction: string | null }>({
    lastNavTime: 0,
    direction: null,
  });

  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
  };

  // Load video data
  useEffect(() => {
    if (!id) return;

    const parseVttFile = async (url: string) => {
      try {
        const response = await fetch(url);
        const text = await response.text();
        const cues = parseVtt(text);
        setAllVttCues(cues);
        console.log(`Loaded ${cues.length} VTT cues`);
      } catch (err) {
        console.error('Error parsing VTT:', err);
      }
    };

    const loadVideo = async () => {
      try {
        setLoading(true);
        setError(null);

        const videoData = await getVideoById(id);
        if (!videoData) {
          setError('Video not found');
          return;
        }

        setVideo(videoData);

        // Check if video is downloaded locally
        const isOffline = await isVideoDownloaded(id);
        console.log('Video offline status:', isOffline);

        if (isOffline) {
          const localDir = getVideoDirectory(id);
          const localVideoUrl = `${localDir}video.mp4`;
          console.log('Using local video:', localVideoUrl);
          setPlaylistUrl(localVideoUrl);

          // Try to load local VTT
          try {
            const localVttUrl = `${localDir}words.vtt`;
            console.log('Using local VTT:', localVttUrl);
            await parseVttFile(localVttUrl);
          } catch (vttError) {
            console.log('No local VTT file available', vttError);
            setAllVttCues([]);
          }
        } else {
          // Load playlist URL
          const playlist = await getVideoPlaylistUrl(videoData);
          console.log('Loaded playlist URL:', playlist);
          setPlaylistUrl(playlist);

          // Try to load VTT file if it exists
          try {
            const vtt = await getVideoVttUrl(videoData);
            console.log('Loaded VTT URL:', vtt);
            await parseVttFile(vtt);
          } catch (vttError: any) {
            // VTT file doesn't exist, that's okay - just skip captions
            if (vttError?.code === 'storage/object-not-found') {
              console.log('No VTT file available for this video - captions disabled');
              setAllVttCues([]);
            } else {
              console.error('Error loading VTT:', vttError);
            }
          }
        }
      } catch (err) {
        console.error('Error loading video:', err);
        setError('Failed to load video');
      } finally {
        setLoading(false);
      }
    };

    loadVideo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Load saved highlights from Firebase and convert to word indices
  useEffect(() => {
    if (!highlightsLoading && highlights.length > 0 && allVttCues.length > 0) {
      try {
        const ranges: {start: number; end: number; highlightId?: string}[] = [];
        
        highlights.forEach(highlight => {
          // Find the word indices that correspond to these timestamps
          const startIndex = allVttCues.findIndex(cue => cue.startTime >= highlight.startTime);
          const endIndex = allVttCues.findIndex(cue => cue.endTime >= highlight.endTime);
          
          if (startIndex >= 0 && endIndex >= 0 && highlight.id) {
            ranges.push({ start: startIndex, end: endIndex, highlightId: highlight.id });
          }
        });
        
        setHighlightedRanges(ranges);
        console.log(`Loaded ${highlights.length} highlights from Firebase`);
      } catch (err) {
        console.error('Error loading highlights:', err);
      }
    }
  }, [highlights, highlightsLoading, allVttCues]);

  // Simple VTT parser
  const parseVtt = (vttText: string): VttCue[] => {
    const cues: VttCue[] = [];
    const lines = vttText.split('\n');
    let i = 0;

    // Skip header
    while (i < lines.length && !lines[i].includes('-->')) {
      i++;
    }

    // Parse cues
    while (i < lines.length) {
      const line = lines[i].trim();
      
      if (line.includes('-->')) {
        const [startStr, endStr] = line.split('-->').map(s => s.trim());
        const startTime = parseVttTimestamp(startStr);
        const endTime = parseVttTimestamp(endStr);
        
        i++;
        const textLines: string[] = [];
        while (i < lines.length && lines[i].trim() !== '') {
          textLines.push(lines[i].trim());
          i++;
        }
        
        if (textLines.length > 0) {
          cues.push({
            startTime,
            endTime,
            text: textLines.join(' '),
          });
        }
      }
      i++;
    }

    return cues;
  };

  // Parse VTT timestamp (HH:MM:SS.mmm or MM:SS.mmm)
  const parseVttTimestamp = (timestamp: string): number => {
    const parts = timestamp.split(':');
    let seconds = 0;

    if (parts.length === 3) {
      // HH:MM:SS.mmm
      seconds = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2]);
    } else if (parts.length === 2) {
      // MM:SS.mmm
      seconds = parseInt(parts[0]) * 60 + parseFloat(parts[1]);
    }

    return seconds;
  };

  // Helper function to scroll to a word index
  const scrollToWordIndex = (wordIndex: number) => {
    if (wordIndex < 0 || !flatListRef.current) return;
    
    const CHUNK_SIZE = 14;
    const chunkIndex = Math.floor(wordIndex / CHUNK_SIZE);
    
    // Scroll to the chunk containing this word, centered
    flatListRef.current.scrollToIndex({
      index: chunkIndex,
      animated: true,
      viewPosition: 0.5, // Center the item
    });
  };

  // Group words into chunks of 16 for virtualization
  const wordChunks = useMemo(() => {
    if (allVttCues.length === 0) return [];
    
    const CHUNK_SIZE = 14;
    const chunks: WordChunk[] = [];
    
    for (let i = 0; i < allVttCues.length; i += CHUNK_SIZE) {
      chunks.push({
        id: `chunk-${i}`,
        words: allVttCues.slice(i, i + CHUNK_SIZE),
        startIndex: i,
      });
    }
    
    return chunks;
  }, [allVttCues]);

  // Find current word index in all cues
  const currentWordIndex = useMemo(() => {
    return allVttCues.findIndex(
      cue => currentTime >= cue.startTime && currentTime <= cue.endTime
    );
  }, [currentTime, allVttCues]);

  // Sync selected word to current word when locked
  useEffect(() => {
    if (isLocked && currentWordIndex >= 0) {
      setSelectedWordIndex(currentWordIndex);
    }
  }, [isLocked, currentWordIndex]);

  // Gamepad navigation for selected word
  useEffect(() => {
    // Approximate words per line (will vary based on word length, but ~14-21 is reasonable)
    const WORDS_PER_LINE = 14;

    const buttonSubscription = addButtonListener((event: GamepadButtonEvent) => {
      if (event.action !== 'pressed') return;

      console.log('Button pressed:', event.buttonName);

      switch (event.buttonName) {
        case 'DPAD_UP':
          // Cycle through playback speeds (with pitch correction)
          setPlaybackSpeed(prev => {
            const speeds = playbackSpeedsRef.current;
            const currentIndex = speeds.indexOf(prev);
            const nextIndex = (currentIndex + 1) % speeds.length;
            const newSpeed = speeds[nextIndex];
            if (playerRef.current) {
              playerRef.current.playbackRate = newSpeed;
              playerRef.current.preservesPitch = true; // Prevent pitch changes
            }
            console.log('Playback speed:', newSpeed);
            
            // Show speed indicator
            setShowSpeedIndicator(true);
            if (speedIndicatorTimeoutRef.current) {
              clearTimeout(speedIndicatorTimeoutRef.current);
            }
            speedIndicatorTimeoutRef.current = setTimeout(() => {
              setShowSpeedIndicator(false);
            }, 2000); // Show for 2 seconds
            
            return newSpeed;
          });
          break;
        case 'DPAD_DOWN':
          // Toggle pause/play
          if (playerRef.current) {
            if (playerRef.current.playing) {
              playerRef.current.pause();
              console.log('Video paused');
            } else {
              playerRef.current.play();
              console.log('Video playing');
            }
          }
          break;
        case 'DPAD_LEFT':
          // Skip backward 10 seconds
          if (playerRef.current) {
            playerRef.current.currentTime = Math.max(0, playerRef.current.currentTime - 10);
            console.log('Skipped -10s');
          }
          break;
        case 'DPAD_RIGHT':
          // Skip forward 10 seconds
          if (playerRef.current) {
            playerRef.current.currentTime = playerRef.current.currentTime + 10;
            console.log('Skipped +10s');
          }
          break;
        case 'L_STICK_UP':
          // Move up one line (approximately WORDS_PER_LINE words)
          setSelectedWordIndex((prev) => Math.max(0, prev - WORDS_PER_LINE));
          break;
        case 'L_STICK_DOWN':
          // Move down one line (approximately WORDS_PER_LINE words)
          setSelectedWordIndex((prev) => Math.min(allVttCues.length - 1, prev + WORDS_PER_LINE));
          break;
        case 'L_STICK_LEFT':
          // Move left one word
          setSelectedWordIndex((prev) => Math.max(0, prev - 1));
          break;
        case 'L_STICK_RIGHT':
          // Move right one word
          setSelectedWordIndex((prev) => Math.min(allVttCues.length - 1, prev + 1));
          break;
        case 'ZR':
          // Toggle lock: sync blue (selected) to yellow (current) and lock them together
          setIsLocked(prev => {
            const newLocked = !prev;
            if (newLocked && currentWordIndex >= 0) {
              // When locking, sync selected to current
              setSelectedWordIndex(currentWordIndex);
            }
            console.log(newLocked ? 'Locked blue to yellow' : 'Unlocked');
            return newLocked;
          });
          break;
        case 'ZL':
          // Move yellow (current) to blue (selected) by seeking video
          if (selectedWordIndex >= 0 && selectedWordIndex < allVttCues.length && playerRef.current) {
            const targetTime = allVttCues[selectedWordIndex].startTime;
            playerRef.current.currentTime = targetTime;
          }
          break;
        case 'R_STICK':
          // Right stick click: scroll yellow highlight (current word) to center
          if (currentWordIndex >= 0) {
            scrollToWordIndex(currentWordIndex);
          }
          break;
        case 'HOME':
          // Home button: open profile modal
          router.push('/modal');
          break;
        case 'PLUS':
          // Plus button: toggle legend modal
          console.log('PLUS button pressed');
          setShowLegend(prev => {
            console.log('Toggling legend from', prev, 'to', !prev);
            return !prev;
          });
          break;
        case 'MINUS':
          // Minus button: toggle transcript visibility
          setShowTranscript(prev => !prev);
          break;
        case 'B':
          // B button acts as back button in video player
          router.back();
          break;
        case 'Y':
          // Toggle highlight mode
          if (!isHighlightMode) {
            // Enter highlight mode - set start position
            setIsHighlightMode(true);
            setHighlightStartIndex(selectedWordIndex);
          } else {
            // Exit highlight mode - save the range
            if (highlightStartIndex !== null && allVttCues.length > 0) {
              const start = Math.min(highlightStartIndex, selectedWordIndex);
              const end = Math.max(highlightStartIndex, selectedWordIndex);
              
              // Get timestamps from VTT cues
              const startTime = allVttCues[start]?.startTime || 0;
              const endTime = allVttCues[end]?.endTime || 0;
              
              // Save to local state
              setHighlightedRanges(prev => [...prev, { start, end }]);
              
              // Save to Firebase
              addHighlight(startTime, endTime)
                .then(() => {
                  console.log('Highlight saved to Firebase');
                })
                .catch((err) => {
                  console.error('Error saving highlight:', err);
                });
            }
            setIsHighlightMode(false);
            setHighlightStartIndex(null);
          }
          break;
        case 'X':
          // If in highlight mode, cancel it
          if (isHighlightMode) {
            setIsHighlightMode(false);
            setHighlightStartIndex(null);
            console.log('Cancelled highlight mode');
            break;
          }
          
          // Toggle anti-highlight mode (remove words from highlights)
          if (!isAntiHighlightMode) {
            // Enter anti-highlight mode - set start position
            setIsAntiHighlightMode(true);
            setAntiHighlightStartIndex(selectedWordIndex);
          } else {
            // Exit anti-highlight mode - remove the range from highlights
            if (antiHighlightStartIndex !== null) {
              const removeStart = Math.min(antiHighlightStartIndex, selectedWordIndex);
              const removeEnd = Math.max(antiHighlightStartIndex, selectedWordIndex);
              
              setHighlightedRanges(prev => {
                const newRanges: {start: number; end: number; highlightId?: string}[] = [];
                const highlightsToDelete: string[] = [];
                
                prev.forEach(range => {
                  // Check if removal range intersects with this highlight
                  if (removeEnd < range.start || removeStart > range.end) {
                    // No overlap - keep the range as is
                    newRanges.push(range);
                  } else if (removeStart <= range.start && removeEnd >= range.end) {
                    // Removal covers entire range - delete it from Firebase
                    if (range.highlightId) {
                      highlightsToDelete.push(range.highlightId);
                    }
                  } else if (removeStart > range.start && removeEnd < range.end) {
                    // Removal is in the middle - split into two ranges
                    // Note: We can't split a Firebase highlight, so we delete the original
                    // In the future, we could create two new highlights
                    if (range.highlightId) {
                      highlightsToDelete.push(range.highlightId);
                    }
                    newRanges.push({ start: range.start, end: removeStart - 1 });
                    newRanges.push({ start: removeEnd + 1, end: range.end });
                  } else if (removeStart <= range.start) {
                    // Removal overlaps start - delete from Firebase (partial deletion not supported)
                    if (range.highlightId) {
                      highlightsToDelete.push(range.highlightId);
                    }
                    newRanges.push({ start: removeEnd + 1, end: range.end });
                  } else {
                    // Removal overlaps end - delete from Firebase (partial deletion not supported)
                    if (range.highlightId) {
                      highlightsToDelete.push(range.highlightId);
                    }
                    newRanges.push({ start: range.start, end: removeStart - 1 });
                  }
                });
                
                // Delete highlights from Firebase
                highlightsToDelete.forEach(async (highlightId) => {
                  try {
                    await removeHighlight(highlightId);
                    console.log(`Deleted highlight ${highlightId} from Firebase`);
                  } catch (err) {
                    console.error('Error deleting highlight:', err);
                  }
                });
                
                return newRanges;
              });
            }
            setIsAntiHighlightMode(false);
            setAntiHighlightStartIndex(null);
          }
          break;
      }
    });

    const analogSubscription = addAnalogStickListener((event: GamepadAnalogStickEvent) => {
      const now = Date.now();
      const deadzone = 0.5;
      const repeatDelay = 150; // ms between navigation repeats
      
      let direction: string | null = null;
      
      // Handle right stick for independent scrolling
      if (Math.abs(event.rightStick.y) > deadzone && flatListRef.current) {
        const scrollSpeed = 20; // Pixels per frame
        const scrollAmount = event.rightStick.y * scrollSpeed;
        
        // Update scroll position and scroll
        scrollOffsetRef.current = Math.max(0, scrollOffsetRef.current + scrollAmount);
        flatListRef.current.scrollToOffset({
          offset: scrollOffsetRef.current,
          animated: false,
        });
      }
      
      // Determine direction from left stick (prioritize vertical over horizontal)
      if (Math.abs(event.leftStick.y) > deadzone) {
        if (event.leftStick.y < -deadzone) {
          direction = 'UP';
        } else if (event.leftStick.y > deadzone) {
          direction = 'DOWN';
        }
      } else if (Math.abs(event.leftStick.x) > deadzone) {
        if (event.leftStick.x < -deadzone) {
          direction = 'LEFT';
        } else if (event.leftStick.x > deadzone) {
          direction = 'RIGHT';
        }
      }
      
      // Only navigate if enough time has passed or direction changed
      const directionChanged = direction !== analogNavigationRef.current.direction;
      const timeElapsed = now - analogNavigationRef.current.lastNavTime;
      
      if (direction && (directionChanged || timeElapsed >= repeatDelay)) {
        analogNavigationRef.current.lastNavTime = now;
        analogNavigationRef.current.direction = direction;
        
        switch (direction) {
          case 'UP':
            // Move up one line
            setSelectedWordIndex((prev) => Math.max(0, prev - WORDS_PER_LINE));
            break;
          case 'DOWN':
            // Move down one line
            setSelectedWordIndex((prev) => Math.min(allVttCues.length - 1, prev + WORDS_PER_LINE));
            break;
          case 'LEFT':
            // Move left one word
            setSelectedWordIndex((prev) => Math.max(0, prev - 1));
            break;
          case 'RIGHT':
            // Move right one word
            setSelectedWordIndex((prev) => Math.min(allVttCues.length - 1, prev + 1));
            break;
        }
      } else if (!direction) {
        // Reset direction when stick is neutral
        analogNavigationRef.current.direction = null;
      }
    });

    return () => {
      buttonSubscription.remove();
      analogSubscription.remove();
    };
  }, [allVttCues, currentWordIndex, selectedWordIndex, router, isHighlightMode, highlightStartIndex, isAntiHighlightMode, antiHighlightStartIndex, addHighlight, removeHighlight]);

  // Auto-scroll blue highlight to center when selectedWordIndex changes (from left stick navigation)
  useEffect(() => {
    if (selectedWordIndex >= 0) {
      scrollToWordIndex(selectedWordIndex);
    }
  }, [selectedWordIndex]);

  if (loading) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </ThemedView>
    );
  }

  if (error || !video || !playlistUrl) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ThemedText style={styles.errorText}>{error || 'Failed to load video'}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Full Screen Video Player */}
      <View style={styles.videoContainer}>
        {playlistUrl ? (
          <VideoPlayer 
            url={playlistUrl} 
            onTimeUpdate={handleTimeUpdate}
            onPlayerReady={(player) => { playerRef.current = player; }}
          />
        ) : (
          <View style={styles.loadingVideo}>
            <ActivityIndicator size="large" color="#007AFF" />
            <ThemedText style={styles.loadingText}>Loading video...</ThemedText>
          </View>
        )}
      </View>

      {/* Scrollable Translucent Transcript Overlay */}
      {wordChunks.length > 0 && showTranscript && (
        <View style={styles.transcriptOverlay}>
          <FlatList
            ref={flatListRef}
            data={wordChunks}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <WordChunkComponent 
                chunk={item} 
                currentWordIndex={currentWordIndex}
                selectedWordIndex={selectedWordIndex}
                highlightedRanges={highlightedRanges}
                highlightStartIndex={highlightStartIndex}
                antiHighlightStartIndex={antiHighlightStartIndex}
              />
            )}
            contentContainerStyle={styles.transcriptContent}
            showsVerticalScrollIndicator={true}
            removeClippedSubviews={false}
            maxToRenderPerBatch={20}
            windowSize={21}
            initialNumToRender={30}
            updateCellsBatchingPeriod={50}
            onScroll={(event) => {
              scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={16}
          />
        </View>
      )}

      {/* Speed Indicator */}
      {showSpeedIndicator && (
        <View style={styles.speedIndicator}>
          <ThemedText style={styles.speedIndicatorText}>{playbackSpeed}x</ThemedText>
        </View>
      )}

      {/* Back Button and Title Overlay at Top */}
      <View style={styles.titleOverlay}>
        <View style={styles.headerRow}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={28} color="#fff" />
          </TouchableOpacity>
          <ThemedText style={styles.videoTitleOverlay} numberOfLines={2}>
            {video.title}
          </ThemedText>
        </View>
        
        {/* Time Display */}
        <View style={styles.timeDisplay}>
          <View style={styles.timeItem}>
            <View style={[styles.timeDot, { backgroundColor: '#FFD700' }]} />
            <ThemedText style={styles.timeLabel}>
              Video: {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')}
            </ThemedText>
          </View>
          <View style={styles.timeItem}>
            <View style={[styles.timeDot, { backgroundColor: '#4A90E2' }]} />
            <ThemedText style={styles.timeLabel}>
              Cursor: {selectedWordIndex >= 0 && allVttCues[selectedWordIndex] 
                ? `${Math.floor(allVttCues[selectedWordIndex].startTime / 60)}:${String(Math.floor(allVttCues[selectedWordIndex].startTime % 60)).padStart(2, '0')}`
                : '--:--'}
            </ThemedText>
          </View>
          {isLocked && (
            <ThemedText style={styles.lockIndicator}>🔒</ThemedText>
          )}
        </View>
      </View>

      {/* Legend Modal */}
      <Modal
        visible={showLegend}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLegend(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.legendModal}>
            <ThemedText style={styles.legendTitle}>Controls</ThemedText>
            
            <View style={styles.legendSection}>
              <ThemedText style={styles.legendHeader}>D-Pad</ThemedText>
              <ThemedText style={styles.legendItem}>↑ Cycle speed • ↓ Pause/Play • ← -10s • → +10s</ThemedText>
            </View>

            <View style={styles.legendSection}>
              <ThemedText style={styles.legendHeader}>Left Stick</ThemedText>
              <ThemedText style={styles.legendItem}>Navigate blue highlight (lines/words)</ThemedText>
            </View>

            <View style={styles.legendSection}>
              <ThemedText style={styles.legendHeader}>Right Stick</ThemedText>
              <ThemedText style={styles.legendItem}>Scroll transcript • Click to center yellow</ThemedText>
            </View>

            <View style={styles.legendSection}>
              <ThemedText style={styles.legendHeader}>Buttons</ThemedText>
              <ThemedText style={styles.legendItem}>A Select • B Back • Y Add • X Remove</ThemedText>
              <ThemedText style={styles.legendItem}>+ Legend • - Transcript • Home Exit</ThemedText>
            </View>

            <View style={styles.legendSection}>
              <ThemedText style={styles.legendHeader}>Triggers</ThemedText>
              <ThemedText style={styles.legendItem}>ZL Jump to blue • ZR Lock/unlock blue to yellow</ThemedText>
            </View>

            <View style={styles.legendSection}>
              <ThemedText style={styles.legendHeader}>Highlights</ThemedText>
              <ThemedText style={styles.legendItem}>🟡 Playing • 🔵 Selection • 🔴 Saved</ThemedText>
              <ThemedText style={styles.legendItem}>Y adds range • X removes range (splits/shrinks)</ThemedText>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  loadingVideo: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    opacity: 0.7,
    color: '#fff',
  },
  titleOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  videoTitleOverlay: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  timeDisplay: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    alignItems: 'center',
  },
  timeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  lockIndicator: {
    fontSize: 16,
    marginLeft: 8,
  },
  transcriptOverlay: {
    position: 'absolute',
    bottom: 60,
    left: 20,
    right: 20,
    top: 140,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  transcriptScroll: {
    flex: 1,
  },
  transcriptContent: {
    padding: 20,
  },
  chunkContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  transcriptText: {
    fontSize: 18,
    lineHeight: 32,
    color: '#fff',
    flexWrap: 'wrap',
  },
  word: {
    fontSize: 18,
    lineHeight: 32,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '400',
  },
  highlightedWord: {
    color: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
  },
  selectedWord: {
    color: '#4DA6FF',
    backgroundColor: 'rgba(77, 166, 255, 0.2)',
  },
  permanentHighlight: {
    backgroundColor: 'rgba(255, 107, 107, 0.3)',
  },
  previewHighlight: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
  },
  antiHighlightPreview: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    textDecorationLine: 'line-through',
    textDecorationColor: '#FF0000',
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  legendModal: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  legendTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#fff',
  },
  legendSection: {
    marginBottom: 16,
  },
  legendHeader: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#FFD700',
  },
  legendItem: {
    fontSize: 14,
    marginBottom: 4,
    paddingLeft: 8,
    color: '#E5E5EA',
  },
  speedIndicator: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  speedIndicatorText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFD700',
  },
});
