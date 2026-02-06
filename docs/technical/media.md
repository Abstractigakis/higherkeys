# HKS Media Server Architecture

## Overview

The HKS Media Server is a specialized video processing pipeline designed to ingest, process, and serve video content. It supports two primary ingestion methods:

1. **Remote Download (`dl`)**: Fetching content from supported external platforms (YouTube, Pornhub).
2. **Local Upload (`ul`)**: Ingesting video files directly from the local filesystem.

The system is built around a **FastAPI** application for the HTTP interface and standalone Python scripts for CLI operations. It leverages **Supabase** for relational data storage (PostgreSQL) and object storage.

## Core Goals

1. **Unified Processing Pipeline**: Regardless of the source (URL or local file), all videos undergo the same rigorous processing steps to ensure consistent playback and metadata availability.
2. **Word-Level Precision**: A key feature is the generation of word-level WebVTT subtitles to enable precise frontend highlighting and navigation.
3. **Adaptive Streaming**: All videos are converted to HLS (HTTP Live Streaming) format to support efficient streaming across different network conditions.
4. **Data Integrity**: The system ensures that database records and storage artifacts are kept in sync.

## Processing Pipeline & Statuses

Regardless of the source (URL or local file), all videos undergo the same rigorous processing steps to ensure consistent playback and metadata availability. The pipeline provides immediate feedback by capturing metadata and thumbnails early. External thumbnails (e.g., from YouTube) are downloaded and hosted on Supabase Storage immediately to avoid cross-origin issues and provide a consistent UI.

### Status Progression

* `preparing`: Initial state. Retrieving metadata and downloading external thumbnails to Supabase storage.
* `downloading`: Pulling video content (URLs).
* `processing`: Transcoding, audio extraction, transcription.
* `uploading`: Moving artifacts to Supabase Storage.
* `completed`: All artifacts stored and ready for playback.
* `error`: Failure at any stage.

### Architecture Components

### 1. Data Layer (Supabase)

* **Database**:
  * **`sources` Table**: The central registry of video content. Stores metadata like title, duration, status, and the link to the owner's profile.
  * **RLS (Row Level Security)**: Policies ensure users can only manage their own content.
* **Storage**:
  * **`sources` Bucket**: Stores all video artifacts.
  * **Structure**: `sources/{profile_id}/{video_id}/...`
    * This hierarchical structure ensures isolation between users and logical grouping of video assets.

### 2. Processing Core (`media/core`)

To avoid code duplication between the API, the download script, and the upload script, core logic is centralized:

* **`processing.py`**: Handles heavy lifting:
  * **Transcoding**: Converting raw video to HLS (`.m3u8` + `.ts` segments) using `ffmpeg`.
  * **Audio Extraction**: Extracting 16kHz mono WAV files for analysis.
  * **Transcription**: Using **Vosk** to generate word-level timestamps and VTT files.
  * **Waveform Generation**: Creating JSON data for visualizing audio amplitude.
* **`storage.py`**: Manages interactions with Supabase Storage, including recursive directory uploads and HLS playlist path corrections.
* **`db.py`**: Handles database record creation and status updates.

### 3. Interfaces

* **`dl` (Download Script)**:
  * **Role**: Wrapper around `yt-dlp`.
  * **Function**: Downloads video from URLs, extracts metadata, and initiates the processing pipeline.
  * **Modes**: Supports Dev/Prod environments and Dry Runs.
* **`ul` (Upload Script)**:
  * **Role**: Local file ingester.
  * **Function**: Takes a local file path, validates it, and initiates the processing pipeline.
  * **Modes**: Supports Dev/Prod environments and Dry Runs.
* **`main.py` (API)**:
  * **Role**: HTTP Gateway.
  * **Function**: Exposes endpoints for web clients to trigger downloads or uploads. It delegates actual processing to the Core library (often as background tasks).

## File Organization & Storage Pattern

As defined in `storage.md`, the file organization is strict:

```text
sources/
  └── {profile_id}/
      └── {video_id}/
          ├── thumbnail.png       # Video preview
          ├── words.vtt           # Subtitles (Web VTT)
          ├── words.txt           # Raw text transcript
          ├── chapters.json       # Video chapters/markers
          ├── meta.json           # Source metadata (e.g., YouTube info)
          ├── wave.json           # Audio waveform data
          └── hls/                # Adaptive streaming files
              ├── playlist.m3u8
              └── segment001.ts
```

## Key Properties

* **Idempotency**: The system is designed to handle retries. If a step fails, status flags in the database (`pending`, `processing`, `uploading`, `completed`, `error`) help track progress.
* **Environment Isolation**: Strict separation between Development and Production environments via `.env` file selection.
