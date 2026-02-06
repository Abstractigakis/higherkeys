import os
import uuid
import logging
import shutil
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv
from fastapi import (
    FastAPI,
    BackgroundTasks,
    UploadFile,
    File,
    Form,
    HTTPException,
    Header,
    Request,
)
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

# Import core logic
from core.db import (
    get_supabase_client,
    ensure_profile_exists,
    create_source_record,
)
from core.pipeline import process_url_logic, process_file_logic

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)

app = FastAPI(
    title="HKS Media Server",
    description="API for processing videos via URL or file upload.",
    version="2.0.0",
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logging.error(f"Validation error: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": str(exc.body)},
    )


# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": "HKS Media Server is running", "docs": "/docs"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


# --- Background Task Wrappers ---


def process_url_task(
    source: str, profile_id: str, video_uuid: str, lat: float = None, lng: float = None
):
    try:
        process_url_logic(
            source,
            profile_id,
            is_dry_run=False,
            existing_video_uuid=video_uuid,
            lat=lat,
            lng=lng,
        )
    except Exception as e:
        logging.error(f"Background task failed for {video_uuid}: {e}")


def process_file_task(
    file_path: str,
    profile_id: str,
    video_uuid: str,
    lat: float = None,
    lng: float = None,
):
    try:
        process_file_logic(
            Path(file_path),
            profile_id,
            is_dry_run=False,
            existing_video_uuid=video_uuid,
            lat=lat,
            lng=lng,
        )
    except Exception as e:
        logging.error(f"Background task failed for {video_uuid}: {e}")


# --- API Endpoints ---


@app.post("/process/url", tags=["Processing"])
async def process_url(
    background_tasks: BackgroundTasks,
    url: str = Form(..., description="The video URL to process"),
    profile_id: Optional[str] = Form(None),
    x_profile_id: Optional[str] = Header(None, alias="X-Profile-ID"),
    lat: Optional[float] = Form(None),
    lng: Optional[float] = Form(None),
):
    effective_profile_id = profile_id or x_profile_id
    if not effective_profile_id:
        raise HTTPException(status_code=400, detail="profile_id is required")

    logging.info(f"Received URL request: {url} for profile: {effective_profile_id}")

    video_uuid = str(uuid.uuid4())

    try:
        supabase = get_supabase_client()
        if supabase:
            ensure_profile_exists(supabase, effective_profile_id)
            create_source_record(
                supabase,
                video_uuid,
                effective_profile_id,
                title="New Source",
                description=url,
                status="gathering meta data",
                lat=lat,
                lng=lng,
            )

        background_tasks.add_task(
            process_url_task, url, effective_profile_id, video_uuid, lat, lng
        )

        return {
            "message": "Video processing started",
            "video_id": video_uuid,
            "profile_id": effective_profile_id,
        }
    except Exception as e:
        logging.error(f"Error in process_url: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/process/file", tags=["Processing"])
async def process_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    profile_id: Optional[str] = Form(None),
    x_profile_id: Optional[str] = Header(None, alias="X-Profile-ID"),
    lat: Optional[float] = Form(None),
    lng: Optional[float] = Form(None),
):
    effective_profile_id = profile_id or x_profile_id
    if not effective_profile_id:
        raise HTTPException(status_code=400, detail="profile_id is required")

    logging.info(
        f"Received file upload: {file.filename} for profile: {effective_profile_id}"
    )

    video_uuid = str(uuid.uuid4())

    try:
        supabase = get_supabase_client()
        if supabase:
            ensure_profile_exists(supabase, effective_profile_id)
            create_source_record(
                supabase,
                video_uuid,
                effective_profile_id,
                title=filename,
                description="",
                status="uploading",
                lat=lat,
                lng=lng,
            )

        # Save uploaded file to temp location
        temp_dir = Path(f"temp_videos/{effective_profile_id}/{video_uuid}/temp")
        temp_dir.mkdir(parents=True, exist_ok=True)

        filename = file.filename or f"upload_{uuid.uuid4()}.mp4"
        file_path = temp_dir / filename

        with open(file_path, "wb") as f:
            while chunk := await file.read(1024 * 1024):
                f.write(chunk)

        background_tasks.add_task(
            process_file_task,
            str(file_path),
            effective_profile_id,
            video_uuid,
            lat,
            lng,
        )

        return {
            "message": "File upload successful, processing started",
            "video_id": video_uuid,
            "profile_id": effective_profile_id,
        }
    except Exception as e:
        logging.error(f"Error in process_file: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/process/stream", tags=["Processing"])
async def process_stream(
    request: Request,
    background_tasks: BackgroundTasks,
    x_profile_id: str = Header(..., alias="X-Profile-ID"),
    x_file_name: str = Header(..., alias="X-File-Name"),
    lat: Optional[float] = Header(None, alias="X-Lat"),
    lng: Optional[float] = Header(None, alias="X-Lng"),
):
    logging.info(f"Received stream upload: {x_file_name} for profile: {x_profile_id}")

    video_uuid = str(uuid.uuid4())

    try:
        supabase = get_supabase_client()
        if supabase:
            ensure_profile_exists(supabase, x_profile_id)
            create_source_record(
                supabase,
                video_uuid,
                x_profile_id,
                title=x_file_name,
                description="",
                status="uploading",
                lat=lat,
                lng=lng,
            )

        temp_dir = Path(f"temp_videos/{x_profile_id}/{video_uuid}/temp")
        temp_dir.mkdir(parents=True, exist_ok=True)
        file_path = temp_dir / x_file_name

        with open(file_path, "wb") as f:
            async for chunk in request.stream():
                f.write(chunk)

        background_tasks.add_task(
            process_file_task, str(file_path), x_profile_id, video_uuid, lat, lng
        )

        return {
            "message": "Stream upload successful, processing started",
            "video_id": video_uuid,
            "profile_id": x_profile_id,
        }
    except Exception as e:
        logging.error(f"Error in process_stream: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)
