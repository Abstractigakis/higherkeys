import os
import logging
from supabase import create_client, Client
from typing import Optional, Dict, Any

# Table and Bucket names
TABLE_SOURCES = "sources"
BUCKET_SOURCES = "sources"


def get_supabase_client() -> Optional[Client]:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        return None

    # Ensure URL ends with a trailing slash to avoid storage client warnings
    if not url.endswith("/"):
        url += "/"

    return create_client(url, key)


def ensure_profile_exists(supabase: Client, profile_id: str):
    """Ensure a profile exists for the given profile_id."""
    try:
        # Check if profile exists
        res = supabase.table("profiles").select("id").eq("id", profile_id).execute()
        if not res.data:
            # Create dummy profile if it doesn't exist (for development/testing)
            # In production, profiles should usually exist via Auth
            print(f"Creating placeholder profile for {profile_id}")
            supabase.table("profiles").insert(
                {
                    "id": profile_id,
                    "username": f"user_{profile_id[:8]}",
                    "full_name": "Auto Generated",
                }
            ).execute()
    except Exception as e:
        print(f"Warning: Could not ensure profile exists: {e}")


def create_source_record(
    supabase: Client,
    video_id: str,
    profile_id: str,
    title: str,
    description: str = "",
    status: str = "pending",
    lat: float = None,
    lng: float = None,
    metadata: Dict[str, Any] = None,
    thumbnail_url: str = None,
):
    """Create initial record in sources table."""
    data = {
        "id": video_id,
        "title": title,
        "description": description,
        "profile_id": profile_id,
        "status": status,
        "latitude": lat,
        "longitude": lng,
        "metadata": metadata,
        "thumbnail_url": thumbnail_url,
    }
    return supabase.table(TABLE_SOURCES).insert(data).execute()


def create_higherkey_for_source(
    supabase: Client,
    video_id: str,
    profile_id: str,
    title: str,
    lat: float = None,
    lng: float = None,
):
    """Create associated HigherKey (Source Key) in the root folder."""
    try:
        # Find root HK for this profile
        root_res = (
            supabase.table("higherkeys")
            .select("id")
            .eq("profile_id", profile_id)
            .is_("parent_id", "null")
            .execute()
        )
        if root_res.data:
            root_id = root_res.data[0]["id"]

            # Check if source key already exists (to avoid duplicates)
            hk_exists = (
                supabase.table("higherkeys")
                .select("id")
                .eq("source_id", video_id)
                .is_("highlight_id", "null")
                .execute()
            )

            if not hk_exists.data:
                supabase.table("higherkeys").insert(
                    {
                        "profile_id": profile_id,
                        "parent_id": root_id,
                        "source_id": video_id,
                        "name": title,
                        "latitude": lat,
                        "longitude": lng,
                    }
                ).execute()
                logging.info(
                    f"Created HigherKey for source {video_id} with title: {title}"
                )
                return True
        else:
            logging.warning(f"Could not find root HigherKey for profile {profile_id}")
    except Exception as e:
        logging.error(f"Failed to create HigherKey for source: {e}")
    return False


def update_source_status(
    supabase: Client, video_id: str, status: str, extra_data: Dict[str, Any] = None
):
    """Update status and optionally other fields."""
    data = {"status": status}
    if extra_data:
        data.update(extra_data)
    return supabase.table(TABLE_SOURCES).update(data).eq("id", video_id).execute()
