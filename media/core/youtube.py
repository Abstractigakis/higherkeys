import os
import re
import json
import requests
import yt_dlp
from pathlib import Path
from typing import Optional, Dict, Any


def extract_video_id(url: str) -> Optional[str]:
    """Extract video ID from YouTube or Pornhub URL."""
    patterns = [
        r"(?:v=|\/)([0-9A-Za-z_-]{11}).*",
        r"(?:embed\/)([0-9A-Za-z_-]{11})",
        r"^([0-9A-Za-z_-]{11})$",
        r"viewkey=([a-zA-Z0-9]+)",
        r"v=([a-zA-Z0-9]+)",
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None


def get_youtube_api_metadata(video_id: str, youtube_api_key: str) -> Dict[str, Any]:
    """Fetch video metadata from YouTube Data API v3."""
    if not youtube_api_key:
        return {}

    video_url = "https://www.googleapis.com/youtube/v3/videos"
    video_params = {
        "part": "snippet,contentDetails,statistics",
        "id": video_id,
        "key": youtube_api_key,
    }
    try:
        video_response = requests.get(video_url, params=video_params)
        video_response.raise_for_status()
        video_data = video_response.json()
        if not video_data.get("items"):
            return {}
        video_item = video_data["items"][0]
        snippet = video_item["snippet"]
        return {
            "video": {
                "video_id": video_id,
                "title": snippet.get("title"),
                "description": snippet.get("description"),
                "published_at": snippet.get("publishedAt"),
                "tags": snippet.get("tags", []),
                "category_id": snippet.get("categoryId"),
            }
        }
    except Exception as e:
        print(f"Error fetching YouTube metadata: {e}")
        return {}


def get_video_info(url: str, cookies_path: Optional[str] = None) -> Dict[str, Any]:
    """
    Get video info using yt-dlp without downloading.
    Returns title, description, thumbnail, duration, etc.
    """
    ydl_opts = {
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
    }

    if cookies_path and os.path.exists(cookies_path):
        ydl_opts["cookiefile"] = cookies_path

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            return {
                "title": info.get("title"),
                "description": info.get("description"),
                "thumbnail": info.get("thumbnail"),
                "duration": info.get("duration"),
                "uploader": info.get("uploader"),
                "webpage_url": info.get("webpage_url"),
                "chapters": info.get("chapters", []),
            }
    except Exception as e:
        print(f"Error getting video info: {e}")
        return {}


def download_video(
    url: str, output_dir: Path, cookies_path: Optional[str] = None
) -> Dict[str, Any]:
    """
    Download video using yt-dlp.
    Returns a dictionary with 'video_path', 'title', 'description', 'chapters', 'words' (from subs).
    """
    output_dir.mkdir(parents=True, exist_ok=True)

    is_pornhub = "pornhub.com" in url

    ydl_opts = {
        "format": "bestvideo+bestaudio/best",
        "merge_output_format": "mp4",
        "noplaylist": True,
        "outtmpl": str(output_dir / "%(title)s.%(ext)s"),
        "writesubtitles": not is_pornhub,
        "writeautomaticsub": not is_pornhub,
        "subtitleslangs": ["en"],
        "subtitlesformat": "json3",
        "skip_download": False,
        "quiet": True,
        "no_warnings": True,
    }

    if cookies_path and os.path.exists(cookies_path):
        ydl_opts["cookiefile"] = cookies_path

    result = {
        "video_path": None,
        "title": None,
        "description": None,
        "chapters": {},
        "words": [],
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=True)
        result["title"] = info.get("title")
        result["description"] = info.get("description")

        # Chapters
        chapters = info.get("chapters", [])
        if chapters:
            result["chapters"] = {
                str(c.get("start_time", 0)): c.get("title", "Untitled")
                for c in chapters
            }

        # Find downloaded video file
        # yt-dlp might merge to mp4 or keep as is
        # We look for the file in the output directory
        # Since we don't know the exact filename (title might contain special chars),
        # we can rely on 'requested_downloads' if available or scan the dir

        if "requested_downloads" in info:
            for d in info["requested_downloads"]:
                if os.path.exists(d["filepath"]):
                    result["video_path"] = d["filepath"]
                    break

        if not result["video_path"]:
            # Fallback scan
            for ext in ["*.mp4", "*.mkv", "*.webm"]:
                files = list(output_dir.glob(ext))
                if files:
                    result["video_path"] = str(files[0])
                    break

        # Subtitles (JSON3)
        json3_files = list(output_dir.glob("*.json3"))
        if json3_files and not is_pornhub:
            try:
                with open(json3_files[0], "r", encoding="utf-8") as f:
                    transcript_data = json.load(f)

                words = []
                if "events" in transcript_data:
                    for event in transcript_data["events"]:
                        if "segs" in event and "tStartMs" in event:
                            start_ms = event["tStartMs"]
                            for seg in event["segs"]:
                                if "utf8" in seg:
                                    raw_text = seg["utf8"].strip()
                                    if raw_text and raw_text != "\n":
                                        sub_words = raw_text.split()
                                        word_start_sec = (
                                            start_ms + seg.get("tOffsetMs", 0)
                                        ) / 1000.0
                                        for idx, w_text in enumerate(sub_words):
                                            words.append(
                                                {
                                                    "start": word_start_sec
                                                    + (idx * 0.01),
                                                    "end": word_start_sec
                                                    + ((idx + 1) * 0.01),
                                                    "text": w_text,
                                                }
                                            )
                result["words"] = words
            except Exception as e:
                print(f"Error parsing subtitles: {e}")

    return result
