"use client";

import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

interface VideoPlayerProps {
  src: string;
  onTimeUpdate?: (time: number) => void;
  onDurationChange?: (duration: number) => void;
  onPlayPause?: (isPaused: boolean) => void;
  playing: boolean;
  seekTo?: number;
  playbackRate?: number;
}

export const VideoPlayer = ({
  src,
  onTimeUpdate,
  onDurationChange,
  onPlayPause,
  playing,
  seekTo,
  playbackRate = 1.0,
}: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(src);
      hls.attachMedia(video);
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (seekTo !== undefined) {
          video.currentTime = seekTo;
        }
        if (playing) {
          video.play().catch((err) => {
            if (err.name === "AbortError") return;
            if (err.name === "NotAllowedError") {
              console.warn(
                "Autoplay blocked by browser. User interaction required."
              );
              onPlayPause?.(false);
              return;
            }
            console.error("HLS Play Error:", err);
          });
        }
      });

      return () => {
        hls.destroy();
      };
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
    }
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => {
      if (!playing) onPlayPause?.(true);
    };
    const handlePause = () => {
      if (playing) onPlayPause?.(false);
    };

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, [onPlayPause, playing]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (playing) {
      if (video.paused) {
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            if (error.name === "AbortError") return;
            if (error.name === "NotAllowedError") {
              console.warn(
                "Autoplay blocked by browser. User interaction required."
              );
              onPlayPause?.(false);
              return;
            }
            console.error("Autoplay/Playback blocked:", error);
          });
        }
      }
    } else {
      if (!video.paused) {
        video.pause();
      }
    }
  }, [playing]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  useEffect(() => {
    if (seekTo !== undefined && videoRef.current) {
      videoRef.current.currentTime = seekTo;
    }
  }, [seekTo, src]); // Re-seek if source changes too

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black">
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        onTimeUpdate={(e) => onTimeUpdate?.(e.currentTarget.currentTime)}
        onDurationChange={(e) => onDurationChange?.(e.currentTarget.duration)}
        playsInline
      />
    </div>
  );
};
