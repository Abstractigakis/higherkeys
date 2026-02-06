import os
import argparse
from dotenv import load_dotenv
from pathlib import Path


def load_config(args=None):
    """
    Load environment variables based on CLI arguments or default to .env.
    Returns a dictionary of configuration.
    """
    env_file = ".env"

    if args:
        if hasattr(args, "DEV") and args.DEV:
            env_file = ".env.dev"
        elif hasattr(args, "PROD") and args.PROD:
            env_file = ".env.prod"

    # Look for env file in the media root directory (parent of core)
    # Assuming this code runs from media/ or media/core/
    # We want /Users/airx/hks/media/.env.dev

    # If running from script in media/, __file__ is inside core/
    base_dir = Path(__file__).parent.parent
    env_path = base_dir / env_file

    if not env_path.exists():
        # Fallback to current directory
        env_path = Path(env_file)

    if env_path.exists():
        print(f"Loading config from: {env_path}")
        load_dotenv(env_path)
    else:
        print(f"Warning: Configuration file {env_file} not found.")

    return {
        "SUPABASE_URL": os.getenv("SUPABASE_URL"),
        "SUPABASE_KEY": os.getenv("SUPABASE_SERVICE_ROLE_KEY"),
        "YOUTUBE_API_KEY": os.getenv("YOUTUBE_API_KEY"),
    }


def add_common_args(parser):
    """Add common arguments (DEV, PROD, dry-run, GPS) to an argparse parser."""
    group = parser.add_mutually_exclusive_group(required=False)
    group.add_argument("--DEV", action="store_true", help="Use .env.dev")
    group.add_argument("--PROD", action="store_true", help="Use .env.prod")
    parser.add_argument(
        "--dry-run", action="store_true", help="Simulate actions without making changes"
    )
    parser.add_argument("--lat", type=float, help="Latitude for the source")
    parser.add_argument("--lng", type=float, help="Longitude for the source")
