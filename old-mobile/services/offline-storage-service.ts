import { db, storage } from '@/config/firebase';
import { createHighlight } from '@/services/highlight-service';
import { CreateHighlightData, Highlight } from '@/types/highlight';
import { Video } from '@/types/video';
import * as FileSystem from 'expo-file-system/legacy';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { getDownloadURL, listAll, ref, StorageReference } from 'firebase/storage';

const BASE_DIR = `${FileSystem.documentDirectory}vcms/videos/`;
const SYNC_DIR = `${FileSystem.documentDirectory}vcms/sync/`;
const PENDING_HIGHLIGHTS_FILE = `${SYNC_DIR}pending_highlights.json`;

export interface DownloadProgress {
  videoId: string;
  progress: number; // 0-1
  status: 'downloading' | 'completed' | 'error';
}

interface PendingHighlight extends CreateHighlightData {
  tempId: string;
  videoid: string;
  userid: string;
  createdAt: string;
}

export const ensureDirectoryExists = async (dir: string) => {
  const dirInfo = await FileSystem.getInfoAsync(dir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
};

export const getVideoDirectory = (videoId: string) => {
  return `${BASE_DIR}${videoId}/`;
};

export const saveOfflineHighlight = async (
  userid: string,
  videoid: string,
  data: CreateHighlightData
): Promise<Highlight> => {
  await ensureDirectoryExists(SYNC_DIR);

  const tempId = `offline_${Date.now()}`;
  const newHighlight: PendingHighlight = {
    ...data,
    tempId,
    videoid,
    userid,
    createdAt: new Date().toISOString(),
  };

  // 1. Add to pending sync queue
  let pending: PendingHighlight[] = [];
  const pendingInfo = await FileSystem.getInfoAsync(PENDING_HIGHLIGHTS_FILE);
  if (pendingInfo.exists) {
    const content = await FileSystem.readAsStringAsync(PENDING_HIGHLIGHTS_FILE);
    pending = JSON.parse(content);
  }
  pending.push(newHighlight);
  await FileSystem.writeAsStringAsync(PENDING_HIGHLIGHTS_FILE, JSON.stringify(pending));

  // 2. Update local video highlights if downloaded
  const videoDir = getVideoDirectory(videoid);
  const highlightsFile = `${videoDir}highlights.json`;
  const videoInfo = await FileSystem.getInfoAsync(highlightsFile);
  
  if (videoInfo.exists) {
    const content = await FileSystem.readAsStringAsync(highlightsFile);
    const localHighlights: Highlight[] = JSON.parse(content);
    
    // Convert to Highlight type for local display
    const displayHighlight: Highlight = {
      id: tempId,
      videoid,
      userid,
      startTime: data.startTime,
      endTime: data.endTime,
      location: data.location,
      createdAt: newHighlight.createdAt,
    };
    
    localHighlights.push(displayHighlight);
    // Sort by start time
    localHighlights.sort((a, b) => a.startTime - b.startTime);
    
    await FileSystem.writeAsStringAsync(highlightsFile, JSON.stringify(localHighlights));
    return displayHighlight;
  }

  return {
    id: tempId,
    videoid,
    userid,
    startTime: data.startTime,
    endTime: data.endTime,
    location: data.location,
    createdAt: newHighlight.createdAt,
  };
};

export const syncPendingHighlights = async () => {
  const pendingInfo = await FileSystem.getInfoAsync(PENDING_HIGHLIGHTS_FILE);
  if (!pendingInfo.exists) return;

  try {
    const content = await FileSystem.readAsStringAsync(PENDING_HIGHLIGHTS_FILE);
    const pending: PendingHighlight[] = JSON.parse(content);

    if (pending.length === 0) return;

    console.log(`Syncing ${pending.length} pending highlights...`);

    // Process sequentially to maintain order if needed, or parallel
    const remaining: PendingHighlight[] = [];

    for (const h of pending) {
      try {
        await createHighlight(h.userid, h.videoid, {
          startTime: h.startTime,
          endTime: h.endTime,
          location: h.location,
        });
      } catch (error) {
        console.error('Failed to sync highlight:', error);
        remaining.push(h); // Keep failed ones
      }
    }

    // Update pending file
    if (remaining.length > 0) {
      await FileSystem.writeAsStringAsync(PENDING_HIGHLIGHTS_FILE, JSON.stringify(remaining));
    } else {
      await FileSystem.deleteAsync(PENDING_HIGHLIGHTS_FILE);
    }
  } catch (error) {
    console.error('Error syncing highlights:', error);
  }
};

export const isVideoDownloaded = async (videoId: string): Promise<boolean> => {
  const dir = getVideoDirectory(videoId);
  const videoFile = `${dir}video.mp4`;
  const vttFile = `${dir}words.vtt`;
  const highlightsFile = `${dir}highlights.json`;

  const [videoInfo, vttInfo, highlightsInfo] = await Promise.all([
    FileSystem.getInfoAsync(videoFile),
    FileSystem.getInfoAsync(vttFile),
    FileSystem.getInfoAsync(highlightsFile),
  ]);

  return videoInfo.exists && vttInfo.exists && highlightsInfo.exists;
};

export const deleteVideo = async (videoId: string) => {
  const dir = getVideoDirectory(videoId);
  await FileSystem.deleteAsync(dir, { idempotent: true });
};

export const downloadVideo = async (
  video: Video,
  onProgress?: (progress: number) => void
) => {
  const dir = getVideoDirectory(video.id);
  await ensureDirectoryExists(dir);

  try {
    // 1. Get Storage Reference
    const pathMatch = video.path.match(/videos\/([^\/]+)\/([^\/]+)/);
    if (!pathMatch) throw new Error('Invalid video path format');
    const [, userid, videoid] = pathMatch;
    const rootRef = ref(storage, `videos/${userid}/${videoid}`);

    // 2. Recursive Download Function
    const downloadRecursive = async (currentRef: StorageReference, localDir: string) => {
      await ensureDirectoryExists(localDir);
      const listResult = await listAll(currentRef);

      // Download files
      const filePromises = listResult.items.map(async (itemRef) => {
        const url = await getDownloadURL(itemRef);
        const localPath = `${localDir}${itemRef.name}`;

        if (itemRef.name === 'video.mp4') {
          // Track progress for the main video file
          const downloadResumable = FileSystem.createDownloadResumable(
            url,
            localPath,
            {},
            (downloadProgress) => {
              const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
              if (onProgress) onProgress(progress);
            }
          );
          await downloadResumable.downloadAsync();
        } else {
          await FileSystem.downloadAsync(url, localPath);
        }
      });

      await Promise.all(filePromises);

      // Recurse into subdirectories (prefixes)
      const folderPromises = listResult.prefixes.map(async (prefixRef) => {
        await downloadRecursive(prefixRef, `${localDir}${prefixRef.name}/`);
      });

      await Promise.all(folderPromises);
    };

    // Start download
    await downloadRecursive(rootRef, dir);

    // 3. Fetch and Save Highlights
    const highlightsRef = collection(db, 'highlights');
    const q = query(highlightsRef, where('videoid', '==', video.id));
    const querySnapshot = await getDocs(q);
    
    const highlights = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    await FileSystem.writeAsStringAsync(
      `${dir}highlights.json`,
      JSON.stringify(highlights)
    );

    return true;
  } catch (error) {
    console.error('Error downloading video:', error);
    // Cleanup on error
    await deleteVideo(video.id);
    throw error;
  }
};
