export interface Segment {
  id: string;
  mat_id: string;
  video_id: string;
  start_time: number;
  end_time: number;
  order_index: number;
  created_at: string;
}

export interface Mat {
  id: string;
  title: string | null;
  status: string;
  profile_id: string;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  segments?: Segment[];
}
