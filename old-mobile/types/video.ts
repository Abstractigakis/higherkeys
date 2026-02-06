export interface Video {
  id: string;
  title: string;
  description: string;
  userid: string;
  path: string;
  createdAt?: any;
}

export interface VideoMetadata {
  id: string;
  title: string;
  description: string;
  uploader?: string;
  uploader_id?: string;
  channel?: string;
  channel_id?: string;
  duration?: number;
  view_count?: number;
  like_count?: number;
  upload_date?: string;
  timestamp?: number;
  categories?: string[];
  tags?: string[];
  thumbnail?: string;
  thumbnails?: {
    url: string;
    height: number;
    width: number;
    preference?: number;
  }[];
}
