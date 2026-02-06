export interface Highlight {
  id?: string;
  videoid: string;
  userid: string;
  startTime: number;
  endTime: number;
  createdAt: string;
  location: {
    latitude: number;
    longitude: number;
  };
}

export interface CreateHighlightData {
  startTime: number;
  endTime: number;
  location: {
    latitude: number;
    longitude: number;
  };
}
