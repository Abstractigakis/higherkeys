import os
import uuid
import shutil
import logging
import json
import requests
import subprocess
from pathlib import Path
from typing import Optional

from .db import (
    get_supabase_client,
    ensure_profile_exists,
    create_source_record,
    update_source_status,
    create_higherkey_for_source,
    BUCKET_SOURCES,
)
from .processing import (
    extract_audio_wav,
    generate_waveform_data,
    convert_to_hls,
    generate_thumbnail,
    get_video_duration,
    transcribe_vosk,
    generate_word_level_vtt,
)
from .storage import upload_directory_to_supabase, fix_hls_playlist_with_absolute_urls
from .youtube import (
    download_video,
    extract_video_id,
    get_youtube_api_metadata,
    get_video_info,
)


def process_url_logic(
    source: str,
    profile_id: str,
    is_dry_run: bool = False,
    config: dict = None,
    existing_video_uuid: str = None,
    lat: float = None,
    lng: float = None,
):
    """
    Core logic for processing a URL.
    """
    if config is None:
        config = {}

    # Initialize Supabase
    supabase = get_supabase_client()
    if not supabase:
        logging.error("Supabase configuration missing.")
        raise Exception("Supabase configuration missing")

    # Setup directories
    video_uuid = existing_video_uuid or str(uuid.uuid4())
    base_temp_dir = Path("temp_videos")
    video_dir = base_temp_dir / profile_id / video_uuid
    temp_dl_dir = video_dir / "temp"
    hls_dir = video_dir / "hls"

    video_dir.mkdir(parents=True, exist_ok=True)
    temp_dl_dir.mkdir(exist_ok=True)
    hls_dir.mkdir(exist_ok=True)

    logging.info(f"Starting processing for {source}")
    logging.info(f"UUID: {video_uuid}")
    logging.info(f"Profile: {profile_id}")

    try:
        # Pre-step: Get info and thumbnail early
        cookies_path = "cookies.txt" if os.path.exists("cookies.txt") else None
        info = get_video_info(source, cookies_path)
        title = info.get("title") or "Untitled"
        description = info.get("description") or ""
        duration = info.get("duration") or 0
        ext_thumbnail_url = info.get("thumbnail")

        # 1. Initial DB Record with Info
        storage_prefix = f"{profile_id}/{video_uuid}"
        thumbnail_path = f"{storage_prefix}/thumbnail.png"

        if not is_dry_run:
            ensure_profile_exists(supabase, profile_id)
            if not existing_video_uuid:
                create_source_record(
                    supabase,
                    video_uuid,
                    profile_id,
                    title,
                    description,
                    status="getting thumbnail",
                    lat=lat,
                    lng=lng,
                    metadata=info,
                    thumbnail_url=thumbnail_path,
                )
            else:
                update_source_status(
                    supabase,
                    video_uuid,
                    "getting thumbnail",
                    {
                        "title": title,
                        "description": description,
                        "metadata": info,
                        "thumbnail_url": thumbnail_path,
                    },
                )

            # Create the HigherKey now that we have the real title
            create_higherkey_for_source(
                supabase, video_uuid, profile_id, title, lat=lat, lng=lng
            )

        # 1.5 Download and upload thumbnail early
        if not is_dry_run and ext_thumbnail_url:
            try:
                logging.info(f"Downloading early thumbnail from {ext_thumbnail_url}")
                headers = {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
                }
                resp = requests.get(ext_thumbnail_url, headers=headers, timeout=10)
                if resp.status_code == 200:
                    temp_thumb = video_dir / "temp_thumb"
                    with open(temp_thumb, "wb") as f:
                        f.write(resp.content)

                    # Normalize to PNG using ffmpeg
                    thumb_path = video_dir / "thumbnail.png"
                    try:
                        subprocess.run(
                            ["ffmpeg", "-y", "-i", str(temp_thumb), str(thumb_path)],
                            check=True,
                            stdout=subprocess.DEVNULL,
                            stderr=subprocess.DEVNULL,
                        )
                    except Exception as e:
                        logging.warning(
                            f"ffmpeg thumbnail normalization failed, using original: {e}"
                        )
                        shutil.move(temp_thumb, thumb_path)
                    finally:
                        if temp_thumb.exists():
                            temp_thumb.unlink()

                    # Upload to Supabase
                    with open(thumb_path, "rb") as f:
                        supabase.storage.from_(BUCKET_SOURCES).upload(
                            path=f"{storage_prefix}/thumbnail.png",
                            file=f,
                            file_options={
                                "content-type": "image/png",
                                "upsert": "true",
                            },
                        )
                    logging.info("Early thumbnail uploaded successfully")
                    update_source_status(supabase, video_uuid, "downloading")
                else:
                    logging.warning(f"Failed to download thumbnail: {resp.status_code}")
                    update_source_status(supabase, video_uuid, "downloading")
            except Exception as e:
                logging.warning(f"Error processing early thumbnail: {e}")
                update_source_status(supabase, video_uuid, "downloading")
        elif not is_dry_run:
            update_source_status(supabase, video_uuid, "downloading")

        # 2. Download
        logging.info("Downloading video...")
        dl_result = download_video(source, temp_dl_dir, cookies_path)

        video_file_temp = dl_result["video_path"]
        if not video_file_temp:
            raise Exception("Download failed, no video file found.")

        # Move video to root as video.mp4
        video_file = video_dir / "video.mp4"
        shutil.move(video_file_temp, video_file)
        video_file = str(video_file)

        # Update title/description if more accurate info came from download
        title = dl_result["title"] or title
        description = dl_result["description"] or description

        # Save Chapters
        if dl_result["chapters"]:
            with open(video_dir / "chapters.json", "w", encoding="utf-8") as f:
                json.dump(dl_result["chapters"], f, indent=2)

        # Save Metadata (YouTube API if key provided)
        yt_id = extract_video_id(source)
        if yt_id and config.get("YOUTUBE_API_KEY"):
            meta = get_youtube_api_metadata(yt_id, config["YOUTUBE_API_KEY"])
            if meta:
                with open(video_dir / "meta.json", "w", encoding="utf-8") as f:
                    json.dump(meta, f, indent=2)

        # 3. Processing
        if not is_dry_run:
            update_source_status(
                supabase,
                video_uuid,
                "processing",
                {"title": title, "description": description},
            )

        # Audio & Waveform
        wav_file = str(video_dir / "audio.wav")
        extract_audio_wav(video_file, wav_file)
        generate_waveform_data(wav_file, str(video_dir / "wave.json"))

        # Thumbnail
        generate_thumbnail(video_file, str(video_dir / "thumbnail.png"))

        # HLS
        convert_to_hls(video_file, hls_dir)

        # Transcription
        video_duration = get_video_duration(video_file) or duration
        words = dl_result["words"]

        if not words:
            logging.info("No subtitles downloaded, transcribing with Vosk...")
            try:
                words = transcribe_vosk(wav_file, "model")
            except Exception as e:
                logging.error(f"Transcription failed: {e}")
                words = []  # Will result in blanks

        generate_word_level_vtt(
            words, video_dir / "words.vtt", video_dir / "words.txt", video_duration
        )

        # 4. Upload
        if not is_dry_run:
            update_source_status(supabase, video_uuid, "uploading")

            # Cleanup temp dir before upload
            if temp_dl_dir.exists():
                shutil.rmtree(temp_dl_dir)

            storage_prefix = f"{profile_id}/{video_uuid}"
            upload_directory_to_supabase(
                supabase, BUCKET_SOURCES, video_dir, storage_prefix
            )
            fix_hls_playlist_with_absolute_urls(supabase, profile_id, video_uuid)

            # Final DB Update
            update_source_status(
                supabase,
                video_uuid,
                "completed",
                {
                    "duration": video_duration,
                    "title": title,
                    "description": description,
                    "thumbnail_url": f"{storage_prefix}/thumbnail.png",
                },
            )

            logging.info("Processing complete!")
            return video_uuid
        else:
            logging.info("[Dry Run] Skipping upload and final DB updates.")
            return "dry-run-uuid"

    except Exception as e:
        logging.error(f"Error: {e}")
        if not is_dry_run:
            update_source_status(supabase, video_uuid, "error")
        raise e
    finally:
        # Cleanup
        if video_dir.exists():
            logging.info(f"Cleaning up {video_dir}")
            shutil.rmtree(video_dir)

        # Clean empty profile dir
        if (base_temp_dir / profile_id).exists() and not any(
            (base_temp_dir / profile_id).iterdir()
        ):
            (base_temp_dir / profile_id).rmdir()


def process_file_logic(
    file_path: Path,
    profile_id: str,
    is_dry_run: bool = False,
    config: dict = None,
    existing_video_uuid: str = None,
    lat: float = None,
    lng: float = None,
):
    """
    Core logic for processing a local file.
    """
    if config is None:
        config = {}

    if not file_path.exists():
        logging.error(f"File not found: {file_path}")
        raise FileNotFoundError(f"File not found: {file_path}")

    # Initialize Supabase
    supabase = get_supabase_client()
    if not supabase:
        logging.error("Supabase configuration missing.")
        raise Exception("Supabase configuration missing")

    # Setup directories
    video_uuid = existing_video_uuid or str(uuid.uuid4())
    base_temp_dir = Path("temp_videos")
    video_dir = base_temp_dir / profile_id / video_uuid
    temp_dl_dir = video_dir / "temp"
    hls_dir = video_dir / "hls"

    video_dir.mkdir(parents=True, exist_ok=True)
    temp_dl_dir.mkdir(exist_ok=True)
    hls_dir.mkdir(exist_ok=True)

    logging.info(f"Starting processing for {file_path}")
    logging.info(f"UUID: {video_uuid}")
    logging.info(f"Profile: {profile_id}")

    title = file_path.stem
    description = ""

    try:
        # Pre-step: Get duration
        video_duration = get_video_duration(str(file_path))
        storage_prefix = f"{profile_id}/{video_uuid}"
        thumbnail_path = f"{storage_prefix}/thumbnail.png"

        # 1. Create HigherKey and update status
        if not is_dry_run:
            ensure_profile_exists(supabase, profile_id)
            # Create HigherKey now that we are starting processing (previously 'uploading' in main.py)
            create_higherkey_for_source(
                supabase, video_uuid, profile_id, title, lat=lat, lng=lng
            )
            update_source_status(supabase, video_uuid, "getting thumbnail")

        # 2. Generate and upload thumbnail
        thumb_path = video_dir / "thumbnail.png"
        generate_thumbnail(str(file_path), str(thumb_path))

        if not is_dry_run and thumb_path.exists():
            try:
                from .db import BUCKET_SOURCES

                with open(thumb_path, "rb") as f:
                    supabase.storage.from_(BUCKET_SOURCES).upload(
                        path=thumbnail_path,
                        file=f,
                        file_options={
                            "content-type": "image/png",
                            "upsert": "true",
                        },
                    )
                logging.info(f"Uploaded thumbnail to {thumbnail_path}")
            except Exception as e:
                logging.warning(f"Could not upload thumbnail: {e}")

        # 3. Update status to processing
        if not is_dry_run:
            update_source_status(
                supabase,
                video_uuid,
                "processing",
                {"thumbnail_url": thumbnail_path, "duration": video_duration},
            )

        # 4. Copy File
        logging.info("Copying video file...")
        video_file = video_dir / "video.mp4"
        shutil.copy2(file_path, video_file)
        video_file = str(video_file)

        # 3. Processing
        # (Status is already 'processing')

        # Audio & Waveform
        wav_file = str(temp_dl_dir / "audio.wav")
        extract_audio_wav(video_file, wav_file)
        generate_waveform_data(wav_file, str(video_dir / "wave.json"))

        # HLS
        convert_to_hls(video_file, hls_dir)

        # Transcription
        logging.info("Transcribing with Vosk...")
        try:
            words = transcribe_vosk(wav_file, "model")
        except Exception as e:
            logging.error(f"Transcription failed: {e}")
            words = []

        generate_word_level_vtt(
            words, video_dir / "words.vtt", video_dir / "words.txt", video_duration
        )

        # 4. Upload
        if not is_dry_run:
            update_source_status(supabase, video_uuid, "uploading")

            # Cleanup temp dir before upload
            if temp_dl_dir.exists():
                shutil.rmtree(temp_dl_dir)

            storage_prefix = f"{profile_id}/{video_uuid}"
            upload_directory_to_supabase(
                supabase, BUCKET_SOURCES, video_dir, storage_prefix
            )
            fix_hls_playlist_with_absolute_urls(supabase, profile_id, video_uuid)

            # Final DB Update
            update_source_status(
                supabase,
                video_uuid,
                "completed",
                {
                    "duration": video_duration,
                    "title": title,
                    "description": description,
                    "thumbnail_url": f"{storage_prefix}/thumbnail.png",
                },
            )

            logging.info("Processing complete!")
            return video_uuid
        else:
            logging.info("[Dry Run] Skipping upload and final DB updates.")
            return "dry-run-uuid"

    except Exception as e:
        logging.error(f"Error: {e}")
        if not is_dry_run:
            update_source_status(supabase, video_uuid, "error")
        raise e
    finally:
        # Cleanup
        if video_dir.exists():
            logging.info(f"Cleaning up {video_dir}")
            shutil.rmtree(video_dir)

        # Clean empty profile dir
        if (base_temp_dir / profile_id).exists() and not any(
            (base_temp_dir / profile_id).iterdir()
        ):
            (base_temp_dir / profile_id).rmdir()
