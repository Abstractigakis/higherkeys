import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getSupabaseStorageUrl(path: string) {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) return "";
  return `${baseUrl}/storage/v1/object/public/${path}`;
}

export function getVideoThumbnailUrl(profileId: string, videoId: string) {
  return getSupabaseStorageUrl(`sources/${profileId}/${videoId}/thumbnail.png`);
}

export function getVideoHlsUrl(profileId: string, videoId: string) {
  return getSupabaseStorageUrl(
    `sources/${profileId}/${videoId}/hls/playlist.m3u8`,
  );
}

export function getVideoSubtitlesUrl(profileId: string, videoId: string) {
  return getSupabaseStorageUrl(`sources/${profileId}/${videoId}/words.vtt`);
}

export function getVideoWaveformUrl(profileId: string, videoId: string) {
  return getSupabaseStorageUrl(`sources/${profileId}/${videoId}/wave.json`);
}

export function formatDuration(seconds: number): string {
  if (!seconds && seconds !== 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s
      .toString()
      .padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export interface SubtitleCue {
  start: number;
  end: number;
  text: string;
}

export function parseVTT(vttText: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  const lines = vttText.split(/\r?\n/);

  let currentCue: Partial<SubtitleCue> | null = null;

  const timeRegex = /(\d{2}:\d{2}:\d{2}\.\d{3}) --> (\d{2}:\d{2}:\d{2}\.\d{3})/;

  function parseTime(timeStr: string): number {
    const [hms, ms] = timeStr.split(".");
    const [h, m, s] = hms.split(":").map(Number);
    return h * 3600 + m * 60 + s + Number(ms) / 1000;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line || line === "WEBVTT") continue;

    const match = line.match(timeRegex);
    if (match) {
      if (currentCue && currentCue.text) {
        cues.push(currentCue as SubtitleCue);
      }
      currentCue = {
        start: parseTime(match[1]),
        end: parseTime(match[2]),
        text: "",
      };
    } else if (currentCue) {
      currentCue.text = currentCue.text ? `${currentCue.text} ${line}` : line;
    }
  }

  if (currentCue && currentCue.text) {
    cues.push(currentCue as SubtitleCue);
  }

  return cues;
}

export function mergeIntervals(
  intervals: [number, number][],
): [number, number][] {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const curr = sorted[i];
    if (curr[0] <= last[1]) {
      last[1] = Math.max(last[1], curr[1]);
    } else {
      merged.push(curr);
    }
  }
  return merged;
}

export function calculateRelativeDuration(
  start: number,
  end: number,
  strikethroughs: { start_time: number; end_time: number }[],
): number {
  const absoluteDuration = end - start;
  if (absoluteDuration <= 0) return 0;

  const relevantStrikes = strikethroughs
    .filter((s) => s.start_time < end && s.end_time > start)
    .map(
      (s) =>
        [Math.max(s.start_time, start), Math.min(s.end_time, end)] as [
          number,
          number,
        ],
    );

  const mergedStrikes = mergeIntervals(relevantStrikes);
  const strikeReduction = mergedStrikes.reduce(
    (sum, [sStart, sEnd]) => sum + (sEnd - sStart),
    0,
  );

  return Math.max(0, absoluteDuration - strikeReduction);
}
