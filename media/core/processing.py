import os
import json
import wave
import logging
import subprocess
import math
from pathlib import Path
from typing import List, Dict
from vosk import Model, KaldiRecognizer


def get_video_duration(video_file: str) -> float:
    """Get video duration in seconds using ffprobe."""
    cmd = [
        "ffprobe",
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        video_file,
    ]
    try:
        output = subprocess.check_output(cmd).decode().strip()
        return float(output)
    except Exception as e:
        logging.error(f"Error getting duration: {e}")
        return 0.0


def extract_audio_wav(video_file: str, output_wav: str):
    """Extract audio from video as 16kHz mono WAV."""
    logging.info(f"Extracting audio from {video_file} to {output_wav}...")
    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        video_file,
        "-ar",
        "16000",
        "-ac",
        "1",
        "-f",
        "wav",
        output_wav,
    ]
    subprocess.run(
        cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
    )


def generate_waveform_data(wav_file: str, output_json: str, width: int = 1000):
    """Generate waveform data from a WAV file."""
    logging.info("Generating waveform data...")
    try:
        with wave.open(wav_file, "rb") as wav:
            frames = wav.readframes(-1)
            import numpy as np

            samples = np.frombuffer(frames, dtype=np.int16)

        max_samples = min(width * 10, 10000)
        if len(samples) > 0:
            block_size = int(len(samples) / max_samples)
            waveform_data = []
            # Simple downsampling
            for i in range(0, max_samples):
                start = i * block_size
                end = start + block_size
                chunk = samples[start:end]
                if len(chunk) > 0:
                    waveform_data.append(
                        round(float(np.max(np.abs(chunk))) / 32768.0, 4)
                    )
                else:
                    waveform_data.append(0)
        else:
            waveform_data = []

        with open(output_json, "w") as f:
            json.dump(waveform_data, f)
    except Exception as e:
        logging.error(f"Error generating waveform: {e}")
        # Write empty array on failure
        with open(output_json, "w") as f:
            json.dump([], f)


def convert_to_hls(input_file: str, hls_dir: Path):
    """Convert video to HLS format."""
    logging.info(f"Converting {input_file} to HLS format...")
    hls_dir.mkdir(parents=True, exist_ok=True)
    playlist_path = hls_dir / "playlist.m3u8"

    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        str(input_file),
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "23",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-hls_time",
        "10",
        "-hls_list_size",
        "0",
        "-hls_segment_filename",
        str(hls_dir / "segment%03d.ts"),
        "-f",
        "hls",
        str(playlist_path),
    ]
    subprocess.run(
        cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
    )


def generate_thumbnail(video_file: str, output_png: str):
    """Generate a thumbnail from the video."""
    logging.info(f"Generating thumbnail for {video_file}...")

    # Try 1 second in first
    cmd = [
        "ffmpeg",
        "-y",
        "-ss",
        "00:00:01.000",
        "-i",
        video_file,
        "-vframes",
        "1",
        "-q:v",
        "2",
        output_png,
    ]
    try:
        subprocess.run(
            cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )
        if os.path.exists(output_png) and os.path.getsize(output_png) > 0:
            return True
    except Exception:
        pass

    # Fallback to start of video
    logging.info(f"Thumbnail at 1s failed, falling back to start for {video_file}")
    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        video_file,
        "-vframes",
        "1",
        "-q:v",
        "2",
        output_png,
    ]
    try:
        subprocess.run(
            cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )
        return True
    except Exception as e:
        logging.error(f"Failed to generate thumbnail: {e}")
        return False


# --- Transcription Logic ---


def transcribe_vosk(wav_file: str, model_path: str = "model") -> List[Dict]:
    """Transcribe audio using Vosk."""
    logging.info(f"Transcribing with Vosk using model: {model_path}")

    if not os.path.exists(model_path):
        # Try looking in parent directories or common locations
        candidates = ["model", "../model", "media/model"]
        found = False
        for c in candidates:
            if os.path.exists(c):
                model_path = c
                found = True
                break
        if not found:
            raise FileNotFoundError(f"Vosk model not found at {model_path}")

    model = Model(model_path)
    wf = wave.open(wav_file, "rb")

    rec = KaldiRecognizer(model, wf.getframerate())
    rec.SetWords(True)

    results = []
    while True:
        data = wf.readframes(4000)
        if len(data) == 0:
            break
        if rec.AcceptWaveform(data):
            part = json.loads(rec.Result())
            if "result" in part:
                for item in part["result"]:
                    if "word" in item:
                        item["text"] = item.pop("word")
                results.extend(part["result"])

    part = json.loads(rec.FinalResult())
    if "result" in part:
        for item in part["result"]:
            if "word" in item:
                item["text"] = item.pop("word")
        results.extend(part["result"])

    return results


def fill_gaps_with_blanks(
    words: List[Dict], video_duration: float, interval: float = 0.5
) -> List[Dict]:
    """Fill gaps in word timestamps with BLANK entries."""
    words = sorted(words, key=lambda x: x["start"])
    filled = []
    current = 0.0

    for word in words:
        if word["start"] > current + 0.01:
            # Gap found
            gap_duration = word["start"] - current
            num_blanks = max(1, int(gap_duration / interval))
            blank_duration = gap_duration / num_blanks

            for i in range(num_blanks):
                filled.append(
                    {
                        "start": current + (i * blank_duration),
                        "end": current + ((i + 1) * blank_duration),
                        "text": "BLANK",
                    }
                )

        filled.append(word)
        current = word["end"]

    # Fill tail
    if current < video_duration:
        gap_duration = video_duration - current
        if gap_duration > 0.01:
            num_blanks = max(1, int(gap_duration / interval))
            blank_duration = gap_duration / num_blanks
            for i in range(num_blanks):
                filled.append(
                    {
                        "start": current + (i * blank_duration),
                        "end": current + ((i + 1) * blank_duration),
                        "text": "BLANK",
                    }
                )

    return filled


def format_timestamp(seconds):
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}.{millis:03d}"


def generate_word_level_vtt(
    words: List[Dict], output_vtt: Path, output_txt: Path, video_duration: float
):
    """Generate VTT and TXT files."""
    filled_words = fill_gaps_with_blanks(words, video_duration)

    with open(output_vtt, "w", encoding="utf-8") as vtt:
        vtt.write("WEBVTT\n\n")
        for word in filled_words:
            start = format_timestamp(word["start"])
            end = format_timestamp(word["end"])
            text = word["text"]
            vtt.write(f"{start} --> {end}\n{text}\n\n")

    actual_words = [w["text"] for w in filled_words if w["text"] != "BLANK"]
    with open(output_txt, "w", encoding="utf-8") as f:
        f.write(" ".join(actual_words))
