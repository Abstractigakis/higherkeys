# Supabase Storage Pattern Documentation

## Overview

This document describes the storage architecture for the Video Content Management System (VCMS). It uses Supabase Storage for video files and related assets.

## Storage Structure

The system uses a single bucket named `sources`.

### Path Pattern

Files are organized by `profile_id` and `source_id` (both UUIDs):

`sources/{profile_id}/{source_id}/{file_name}`

### Common Files

- **Thumbnail**: `sources/{profile_id}/{source_id}/thumbnail.png`
- **HLS Playlist**: `sources/{profile_id}/{source_id}/hls/playlist.m3u8` (and associated `.ts` segments)
- **Subtitles (VTT)**: `sources/{profile_id}/{source_id}/words.vtt`
- **Subtitles (TXT)**: `sources/{profile_id}/{source_id}/words.txt`
- **Chapters**: `sources/{profile_id}/{source_id}/chapters.json`
- **Metadata**: `sources/{profile_id}/{source_id}/meta.json`
- **Waveform**: `sources/{profile_id}/{source_id}/wave.json`
- **Waveform**: `sources/{profile_id}/{source_id}/video.mp4`

## Access Control

Supabase Storage RLS policies are used to control access:

- **Select**: Publicly viewable.
- **Insert/Update/Delete**: Restricted to the owner (`profile_id`).
