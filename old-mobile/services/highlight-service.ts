import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    orderBy,
    query,
    where
} from 'firebase/firestore';
import * as Location from 'expo-location';
import { db } from '../config/firebase';
import { CreateHighlightData, Highlight } from '../types/highlight';

const HIGHLIGHTS_COLLECTION = 'highlights';

/**
 * Request location permission and get current coordinates
 */
export const getCurrentLocation = async (): Promise<{
  latitude: number;
  longitude: number;
}> => {
  try {
    // Request permission
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      console.warn('Location permission denied');
      throw new Error('Location permission denied');
    }

    // Get current location
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (error) {
    console.error('Error getting location:', error);
    throw error;
  }
};

/**
 * Create a new highlight
 */
export const createHighlight = async (
  userid: string,
  videoid: string,
  data: CreateHighlightData
): Promise<string> => {
  try {
    const highlightData = {
      videoid,
      userid,
      startTime: data.startTime,
      endTime: data.endTime,
      location: data.location,
      createdAt: new Date().toISOString(),
    };

    const docRef = await addDoc(
      collection(db, HIGHLIGHTS_COLLECTION),
      highlightData
    );

    return docRef.id;
  } catch (error) {
    console.error('Error creating highlight:', error);
    throw error;
  }
};

/**
 * Get all highlights for a specific video
 */
export const getHighlightsByVideo = async (
  videoid: string
): Promise<Highlight[]> => {
  try {
    const q = query(
      collection(db, HIGHLIGHTS_COLLECTION),
      where('videoid', '==', videoid),
      orderBy('startTime', 'asc')
    );

    const querySnapshot = await getDocs(q);
    const highlights: Highlight[] = [];

    querySnapshot.forEach((doc) => {
      highlights.push({
        id: doc.id,
        ...doc.data(),
      } as Highlight);
    });

    return highlights;
  } catch (error: any) {
    console.error('Error fetching highlights:', error);
    // If index is missing, return empty array instead of crashing
    if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
      console.warn('Firestore index missing for highlights query. Returning empty array.');
      return [];
    }
    throw error;
  }
};

/**
 * Get highlights for a specific user and video
 */
export const getHighlightsByUserAndVideo = async (
  userid: string,
  videoid: string
): Promise<Highlight[]> => {
  try {
    const q = query(
      collection(db, HIGHLIGHTS_COLLECTION),
      where('userid', '==', userid),
      where('videoid', '==', videoid),
      orderBy('startTime', 'asc')
    );

    const querySnapshot = await getDocs(q);
    const highlights: Highlight[] = [];

    querySnapshot.forEach((doc) => {
      highlights.push({
        id: doc.id,
        ...doc.data(),
      } as Highlight);
    });

    return highlights;
  } catch (error: any) {
    console.error('Error fetching highlights:', error);
    // If index is missing, return empty array instead of crashing
    if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
      console.warn('Firestore index missing for highlights query. Returning empty array.');
      return [];
    }
    throw error;
  }
};

/**
 * Delete a highlight
 */
export const deleteHighlight = async (highlightId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, HIGHLIGHTS_COLLECTION, highlightId));
  } catch (error) {
    console.error('Error deleting highlight:', error);
    throw error;
  }
};
