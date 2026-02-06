"use client";

import React, { useEffect, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import { VTTCue } from "@/lib/vtt-parser";

interface Highlight {
  id?: string;
  alias?: string | null;
  start_time: number;
  end_time: number;
  is_strikethrough?: boolean;
}

interface TranscriptOverlayProps {
  cues: (VTTCue & { highlightIndex?: number })[];
  currentTime: number;
  blueCursorTime: number;
  highlights: Highlight[];
  strikethroughs: number[] | Record<number, number[]>; // Flat [start, end, ...] or Map of them
  highlightSelectionRange?: { start: number; end: number } | null;
  strikethroughSelectionRange?: { start: number; end: number } | null;
  cleanSelectionRange?: { start: number; end: number } | null;
  clearHighlightSelectionRange?: { start: number; end: number } | null;
  onWordClick?: (time: number, highlightIndex?: number) => void;
  isLocked: boolean;
  isVisible?: boolean;
  isRelativeMode?: boolean;
  isPlaylistView?: boolean;
  activeHighlightIndex?: number;
  activeBlueIndex?: number;
  className?: string;
}

export const TranscriptOverlay = ({
  cues,
  currentTime,
  blueCursorTime,
  highlights,
  strikethroughs,
  highlightSelectionRange,
  strikethroughSelectionRange,
  cleanSelectionRange,
  clearHighlightSelectionRange,
  onWordClick,
  isLocked,
  isVisible = true,
  isRelativeMode = false,
  isPlaylistView = false,
  activeHighlightIndex,
  activeBlueIndex,
  className,
}: TranscriptOverlayProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const blueCursorRef = useRef<HTMLSpanElement>(null);

  const effectiveTime = isLocked ? currentTime : blueCursorTime;

  // Auto-scroll to blue cursor
  useEffect(() => {
    if (isVisible && blueCursorRef.current && containerRef.current) {
      blueCursorRef.current.scrollIntoView({
        behavior: isLocked ? "auto" : "smooth",
        block: "center",
      });
    }
  }, [effectiveTime, isVisible, isLocked]);

  const allStrikethroughRanges = useMemo(() => {
    if (Array.isArray(strikethroughs)) {
      const ranges: { start: number; end: number }[] = [];
      for (let i = 0; i < strikethroughs.length; i += 2) {
        ranges.push({ start: strikethroughs[i], end: strikethroughs[i + 1] });
      }
      return { [-1]: ranges }; // Use -1 for "default" or "current"
    } else {
      const map: Record<number, { start: number; end: number }[]> = {};
      Object.entries(strikethroughs).forEach(([idx, arr]) => {
        const ranges: { start: number; end: number }[] = [];
        for (let i = 0; i < arr.length; i += 2) {
          ranges.push({ start: arr[i], end: arr[i + 1] });
        }
        map[parseInt(idx)] = ranges;
      });
      return map;
    }
  }, [strikethroughs]);

  const getWordStatus = (cue: VTTCue & { highlightIndex?: number }) => {
    // In playlist view, a word is active for the playhead if it's the current highlight
    const isPlayheadClip =
      !isPlaylistView ||
      activeHighlightIndex === undefined ||
      cue.highlightIndex === activeHighlightIndex;

    // In playlist view, a word is active for the cursor if it's the blue index
    const isCursorClip =
      !isPlaylistView ||
      activeBlueIndex === undefined ||
      cue.highlightIndex === activeBlueIndex;

    const isYellow =
      isPlayheadClip &&
      currentTime >= cue.startTime &&
      currentTime < cue.endTime;

    const isBlue = isLocked
      ? isYellow
      : isCursorClip &&
        blueCursorTime >= cue.startTime &&
        blueCursorTime < cue.endTime;

    // For selections, use the cursor clip in playlist view, or playhead clip otherwise
    const isSelectionClip = isPlaylistView ? isCursorClip : isPlayheadClip;

    // Highlight Selection
    let isHighlightSelecting = false;
    if (highlightSelectionRange && isSelectionClip) {
      const sStart = Math.min(
        highlightSelectionRange.start,
        highlightSelectionRange.end,
      );
      const sEnd = Math.max(
        highlightSelectionRange.start,
        highlightSelectionRange.end,
      );
      isHighlightSelecting = cue.startTime >= sStart && cue.startTime <= sEnd;
    }

    // Strikethrough Selection
    let isStrikethroughSelecting = false;
    if (strikethroughSelectionRange && isSelectionClip) {
      const sStart = Math.min(
        strikethroughSelectionRange.start,
        strikethroughSelectionRange.end,
      );
      const sEnd = Math.max(
        strikethroughSelectionRange.start,
        strikethroughSelectionRange.end,
      );
      isStrikethroughSelecting =
        cue.startTime >= sStart && cue.startTime <= sEnd;
    }

    // Clean Selection
    let isCleanSelecting = false;
    if (cleanSelectionRange && isSelectionClip) {
      const sStart = Math.min(
        cleanSelectionRange.start,
        cleanSelectionRange.end,
      );
      const sEnd = Math.max(cleanSelectionRange.start, cleanSelectionRange.end);
      isCleanSelecting = cue.startTime >= sStart && cue.startTime <= sEnd;
    }

    // Clear Highlight Selection
    let isClearHighlightSelecting = false;
    if (clearHighlightSelectionRange && isSelectionClip) {
      const sStart = Math.min(
        clearHighlightSelectionRange.start,
        clearHighlightSelectionRange.end,
      );
      const sEnd = Math.max(
        clearHighlightSelectionRange.start,
        clearHighlightSelectionRange.end,
      );
      isClearHighlightSelecting =
        cue.startTime >= sStart && cue.startTime <= sEnd;
    }

    // Focused highlights (those containing the cursor)
    const focusedHighlights = isPlaylistView
      ? []
      : highlights.filter(
          (h) =>
            !h.is_strikethrough &&
            effectiveTime >= h.start_time &&
            effectiveTime <= h.end_time,
        );

    const isFocusedHighlight = focusedHighlights.some(
      (h) => cue.startTime >= h.start_time && cue.endTime <= h.end_time,
    );

    // Count highlights
    let highlightLevel = 0;
    if (!isPlaylistView) {
      for (const h of highlights) {
        if (
          !h.is_strikethrough &&
          cue.startTime >= h.start_time &&
          cue.endTime <= h.end_time
        ) {
          highlightLevel++;
        }
      }
    }

    // Check strikethrough
    const ranges = Array.isArray(strikethroughs)
      ? allStrikethroughRanges[-1]
      : allStrikethroughRanges[cue.highlightIndex ?? -1] || [];

    const isStruck = ranges.some(
      (r) => cue.startTime >= r.start && cue.endTime <= r.end,
    );

    return {
      isYellow,
      isBlue,
      highlightLevel,
      isStruck,
      isHighlightSelecting,
      isStrikethroughSelecting,
      isCleanSelecting,
      isClearHighlightSelecting,
      isFocusedHighlight,
    };
  };

  if (!isVisible) return null;

  return (
    <div
      ref={containerRef}
      className={cn(
        "absolute inset-0 z-10 overflow-y-auto py-24 select-text scrollbar-hide",
        className,
      )}
      style={{
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <div className="max-w-4xl mx-auto flex flex-wrap content-start items-start gap-x-2 gap-y-4 px-12 pb-48">
        {cues.map((cue, idx) => {
          const {
            isYellow,
            isBlue,
            highlightLevel,
            isStruck,
            isHighlightSelecting,
            isStrikethroughSelecting,
            isCleanSelecting,
            isClearHighlightSelecting,
            isFocusedHighlight,
          } = getWordStatus(cue);
          const isBlank = cue.text === "BLANK";

          if (isRelativeMode && isStruck) return null;

          return (
            <span
              key={idx}
              data-cue-index={idx}
              ref={isBlue ? blueCursorRef : null}
              className={cn(
                "relative px-1 py-1 rounded-md transition-colors duration-100 cursor-pointer text-4xl font-bold tracking-tight whitespace-nowrap",
                isYellow && "bg-yellow-400 text-black z-20",
                isBlue && !isYellow && "bg-blue-500 text-white z-20",
                !isYellow && isHighlightSelecting && "bg-green-500/50 z-10",
                !isYellow && isClearHighlightSelecting && "bg-lime-500/50 z-10",
                !isYellow && isStrikethroughSelecting && "bg-red-500/50 z-10",
                !isYellow && isCleanSelecting && "bg-orange-500/50 z-10",
                !isYellow &&
                  !isBlue &&
                  !isHighlightSelecting &&
                  !isStrikethroughSelecting &&
                  !isCleanSelecting &&
                  "text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.8),0_0_15px_rgba(0,0,0,0.8)] hover:scale-105 active:scale-95",
              )}
              onClick={() => onWordClick?.(cue.startTime, cue.highlightIndex)}
            >
              {/* Focused Highlight Background (Blue cursor is within this region) */}
              {isFocusedHighlight && !isYellow && !isBlue && (
                <span className="absolute inset-0 -z-10 bg-sky-400/30 rounded-md" />
              )}

              {/* Highlight Layer */}
              {highlightLevel > 0 && !isYellow && !isBlue && (
                <span
                  className={cn(
                    "absolute inset-0 -z-20 rounded-md",
                    highlightLevel === 1 && "bg-green-500/30",
                    highlightLevel >= 2 && "bg-emerald-500/60",
                  )}
                />
              )}

              {/* Strikethrough Layer */}
              {isStruck && (
                <span className="absolute inset-x-0 top-1/2 h-1 bg-red-500 z-30" />
              )}

              <span className={cn(isBlank && "opacity-0")}>
                {isBlank ? "\u00A0" : cue.text}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
};
