import { Database } from './supabase';

export type MaterialType = 'root' | 'atom' | 'sequence';

export interface BaseMaterial {
  id: string;
  profile_id: string;
  type: MaterialType;
  title: string | null;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  latitude: number | null;
  longitude: number | null;
}

export interface RootMaterial extends BaseMaterial {
  type: 'root';
  source_id: string;
  start_time: number; // Always 0
  end_time: number;   // Duration of source
}

export interface AtomMaterial extends BaseMaterial {
  type: 'atom';
  source_id: string;
  start_time: number;
  end_time: number;
}

export interface SequenceItem {
  id: string;
  sequence_id: string;
  material_id: string;
  order_index: number;
  created_at: string;
  // Expanded material (optional, for UI)
  material?: Material;
}

export interface SequenceMaterial extends BaseMaterial {
  type: 'sequence';
  source_id: null;
  start_time: null;
  end_time: null;
  // Computed duration (sum of children)
  duration?: number;
  items?: SequenceItem[];
}

export type Material = RootMaterial | AtomMaterial | SequenceMaterial;

// Helper to check type
export const isRoot = (m: Material): m is RootMaterial => m.type === 'root';
export const isAtom = (m: Material): m is AtomMaterial => m.type === 'atom';
export const isSequence = (m: Material): m is SequenceMaterial => m.type === 'sequence';
