export interface HigherKey {
  id: string;
  profile_id: string;
  parent_id: string | null;
  source_id: string | null;
  highlight_id: string | null;
  name: string;
  path: string;
  description: string | null;
  color: string | null;
  order_index: number;
  image_url?: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

export interface HigherKeyAssignment {
  id: string;
  profile_id: string;
  higherkey_id: string;
  video_id: string | null;
  mat_id: string | null;
  created_at: string;
}
