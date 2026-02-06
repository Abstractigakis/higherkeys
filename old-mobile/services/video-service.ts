import { db, storage } from '@/config/firebase';
import { Video } from '@/types/video';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { getDownloadURL, ref } from 'firebase/storage';

/**
 * Fetches all videos for a specific user from Firestore
 */
export async function getUserVideos(userid: string): Promise<Video[]> {
  try {
    const videosRef = collection(db, 'videos');
    const q = query(
      videosRef, 
      where('userid', '==', userid),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    const videos: Video[] = [];
    querySnapshot.forEach((doc) => {
      videos.push({
        id: doc.id,
        ...doc.data() as Omit<Video, 'id'>
      });
    });
    
    return videos;
  } catch (error) {
    console.error('Error fetching user videos:', error);
    throw error;
  }
}

/**
 * Gets the download URL for a video thumbnail from Firebase Storage
 * Path format: videos/{userid}/{videoid}/thumbnail.png
 */
export async function getVideoThumbnailUrl(video: Video): Promise<string> {
  try {
    // Parse the storage path to extract userid and videoid
    // path format: gs://vcms-1763522692.firebasestorage.app/videos/{userid}/{videoid}
    const pathMatch = video.path.match(/videos\/([^\/]+)\/([^\/]+)/);

    if (!pathMatch) {
      throw new Error('Invalid video path format');
    }

    const [, userid, videoid] = pathMatch;
    const thumbnailPath = `videos/${userid}/${videoid}/thumbnail.png`;    const thumbnailRef = ref(storage, thumbnailPath);
    const url = await getDownloadURL(thumbnailRef);
    
    return url;
  } catch (error) {
    console.error('Error fetching thumbnail URL:', error);
    // Return a placeholder or throw based on your preference
    throw error;
  }
}

/**
 * Gets the HLS playlist URL for a video
 * Path format: videos/{userid}/{videoid}/hls/playlist.m3u8
 */
export async function getVideoPlaylistUrl(video: Video): Promise<string> {
  try {
    const pathMatch = video.path.match(/videos\/([^\/]+)\/([^\/]+)/);
    
    if (!pathMatch) {
      throw new Error('Invalid video path format');
    }
    
    const [, userid, videoid] = pathMatch;
    const playlistPath = `videos/${userid}/${videoid}/hls/playlist.m3u8`;
    
    const playlistRef = ref(storage, playlistPath);
    const url = await getDownloadURL(playlistRef);
    
    return url;
  } catch (error) {
    console.error('Error fetching playlist URL:', error);
    throw error;
  }
}

/**
 * Gets the VTT subtitle URL for a video
 * Path format: videos/{userid}/{videoid}/words.vtt
 */
export async function getVideoVttUrl(video: Video): Promise<string> {
  try {
    const pathMatch = video.path.match(/videos\/([^\/]+)\/([^\/]+)/);
    
    if (!pathMatch) {
      throw new Error('Invalid video path format');
    }
    
    const [, userid, videoid] = pathMatch;
    const vttPath = `videos/${userid}/${videoid}/words.vtt`;
    
    const vttRef = ref(storage, vttPath);
    const url = await getDownloadURL(vttRef);
    
    return url;
  } catch (error) {
    console.error('Error fetching VTT URL:', error);
    throw error;
  }
}

/**
 * Gets a video by its ID from Firestore
 */
export async function getVideoById(videoId: string): Promise<Video | null> {
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const videoRef = doc(db, 'videos', videoId);
    const videoSnap = await getDoc(videoRef);
    
    if (!videoSnap.exists()) {
      return null;
    }
    
    return {
      id: videoSnap.id,
      ...videoSnap.data() as Omit<Video, 'id'>
    };
  } catch (error) {
    console.error('Error fetching video by ID:', error);
    throw error;
  }
}

/**
 * Gets the absolute URL for a specific HLS segment
 */
async function getVideoSegmentUrl(userid: string, videoid: string, segmentName: string): Promise<string> {
  const segmentPath = `videos/${userid}/${videoid}/hls/${segmentName}`;
  const segmentRef = ref(storage, segmentPath);
  
  try {
    const url = await getDownloadURL(segmentRef);
    return url;
  } catch (error) {
    console.error(`Error getting segment URL for ${segmentName}:`, error);
    throw error;
  }
}

/**
 * Fetches the HLS playlist and converts relative segment URLs to absolute Firebase Storage URLs
 * This is necessary because HLS players cannot resolve relative URLs from Firebase Storage
 */
export async function getAbsolutePlaylistContent(video: Video): Promise<string> {
  try {
    const pathMatch = video.path.match(/videos\/([^\/]+)\/([^\/]+)/);
    
    if (!pathMatch) {
      throw new Error('Invalid video path format');
    }
    
    const [, userid, videoid] = pathMatch;
    const playlistUrl = await getVideoPlaylistUrl(video);
    
    // Fetch the original playlist
    const response = await fetch(playlistUrl);
    const playlistContent = await response.text();
    
    // Convert relative segment URLs to absolute Firebase Storage URLs
    const lines = playlistContent.split('\n');
    const absoluteLines = await Promise.all(
      lines.map(async (line) => {
        const trimmed = line.trim();
        // If line is a segment reference (ends with .ts), convert to absolute URL
        if (trimmed.endsWith('.ts')) {
          const segmentUrl = await getVideoSegmentUrl(userid, videoid, trimmed);
          return segmentUrl;
        }
        return line;
      })
    );
    
    return absoluteLines.join('\n');
  } catch (error) {
    console.error('Error creating absolute playlist:', error);
    throw error;
  }
}
