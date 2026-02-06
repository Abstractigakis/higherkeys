import os
from pathlib import Path
from supabase import Client
from .db import BUCKET_SOURCES


def upload_directory_to_supabase(
    supabase: Client, bucket_name: str, local_dir: Path, storage_prefix: str
):
    """Recursively upload directory contents to Supabase Storage."""
    print(f"Uploading {local_dir} to {bucket_name}/{storage_prefix}...")

    # Convert to Path object if string
    local_dir = Path(local_dir)

    for file_path in local_dir.rglob("*"):
        if file_path.is_file():
            relative_path = file_path.relative_to(local_dir)
            storage_path = f"{storage_prefix}/{relative_path}"

            # Determine content type
            content_type = "application/octet-stream"
            if file_path.suffix == ".m3u8":
                content_type = (
                    "application/vnd.apple.mpegurl"  # or application/x-mpegURL
                )
            elif file_path.suffix == ".ts":
                content_type = "video/MP2T"
            elif file_path.suffix == ".vtt":
                content_type = "text/vtt"
            elif file_path.suffix == ".json":
                content_type = "application/json"
            elif file_path.suffix == ".png":
                content_type = "image/png"
            elif file_path.suffix == ".txt":
                content_type = "text/plain"
            elif file_path.suffix == ".mp4":
                content_type = "video/mp4"
            elif file_path.suffix == ".wav":
                content_type = "audio/wav"

            try:
                with open(file_path, "rb") as f:
                    supabase.storage.from_(bucket_name).upload(
                        storage_path,
                        f,
                        file_options={"content-type": content_type, "upsert": "true"},
                    )
            except Exception as e:
                print(f"Failed to upload {file_path}: {e}")


def fix_hls_playlist_with_absolute_urls(
    supabase: Client, profile_id: str, video_id: str
):
    """
    Fix HLS playlist by rewriting segment references with absolute public URLs.
    This is necessary because the player might not handle relative paths correctly
    if the m3u8 is served from a different context or if we want to be explicit.
    """
    bucket_name = BUCKET_SOURCES
    storage_prefix = f"{profile_id}/{video_id}"
    playlist_path_storage = f"{storage_prefix}/hls/playlist.m3u8"

    try:
        # Download existing playlist
        data = supabase.storage.from_(bucket_name).download(playlist_path_storage)
        content = data.decode("utf-8")

        # Get public URL base
        # The public URL for a file is usually:
        # {supabase_url}/storage/v1/object/public/{bucket}/{path}
        # We need the path to the HLS folder

        # Supabase python client doesn't always give the full public URL easily for a folder
        # We construct it manually or use get_public_url for a dummy file

        # Let's construct the base URL for the segments
        # segments are in .../hls/segmentXXX.ts

        # We can get the public URL for the playlist itself and strip the filename
        playlist_public_url = supabase.storage.from_(bucket_name).get_public_url(
            playlist_path_storage
        )
        base_url = playlist_public_url.rsplit("/", 1)[0]

        new_lines = []
        for line in content.splitlines():
            if line.endswith(".ts") and not line.startswith("http"):
                # It's a relative segment path
                new_lines.append(f"{base_url}/{line}")
            else:
                new_lines.append(line)

        new_content = "\n".join(new_lines)

        # Upload back
        supabase.storage.from_(bucket_name).upload(
            playlist_path_storage,
            new_content.encode("utf-8"),
            file_options={
                "content-type": "application/vnd.apple.mpegurl",
                "upsert": "true",
            },
        )
        print("Fixed HLS playlist with absolute URLs.")

    except Exception as e:
        print(f"Error fixing HLS playlist: {e}")
