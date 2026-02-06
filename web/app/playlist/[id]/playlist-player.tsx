"use client";

import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { VideoPlayer } from "@/components/highlighter/video-player";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  SkipBack,
  SkipForward,
  GripVertical,
  Keyboard,
  X,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { HigherKey } from "@/types/higher-keys";
import { Tables } from "@/types/supabase";
import { HigherKeyEditor } from "@/components/higherkeys/higher-key-editor";
import { HighlightAliaser } from "@/components/highlighter/highlight-aliaser";
import { TranscriptOverlay } from "@/components/highlighter/transcript-overlay";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { VTTCue, parseVTT } from "@/lib/vtt-parser";
import { useLocation } from "@/components/location-guard";
import { useDashboardShortcuts } from "@/components/dashboard/hooks/use-dashboard-shortcuts";

interface Highlight {
  id: string;
  source_id: string;
  profile_id?: string;
  alias: string | null;
  start_time: number;
  end_time: number;
  is_strikethrough?: boolean;
  assignment_id?: string;
  higherkey_id?: string;
  order_index?: number;
}

interface PlaylistPlayerProps {
  keyId: string;
  keyName: string;
  breadcrumbs?: { id: string; name: string }[];
  highlights: Highlight[];
  user: any;
  profile: Tables<"profiles">;
}

export function PlaylistPlayer({
  keyId,
  keyName,
  breadcrumbs = [],
  highlights: initialHighlights,
  user,
  profile,
}: PlaylistPlayerProps) {
  const [highlights, setHighlights] = useState(initialHighlights);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [showLegend, setShowLegend] = useState(false);
  const [taggingHighlightIds, setTaggingHighlightIds] = useState<string[]>([]);
  const [aliasingHighlightIds, setAliasingHighlightIds] = useState<string[]>(
    [],
  );
  const [isHigherKeysModalOpen, setIsHigherKeysModalOpen] = useState(false);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [exitConfirmationFocus, setExitConfirmationFocus] = useState<
    "cancel" | "exit"
  >("cancel");
  const router = useRouter();

  useEffect(() => {
    if (taggingHighlightIds.length > 0) {
      setIsHigherKeysModalOpen(true);
    }
  }, [taggingHighlightIds.length]);

  useDashboardShortcuts({
    isFocused: true,
    onTab: () => setIsHigherKeysModalOpen((prev) => !prev),
  });
  const [seekTo, setSeekTo] = useState<number | undefined>(undefined);

  // Transcript & Strikethrough states
  const [showTranscript, setShowTranscript] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [blueCursorTime, setBlueCursorTime] = useState(0);
  const [blueIndex, setBlueIndex] = useState(0);
  const [isLocked, setIsLocked] = useState(true);
  const [vttMap, setVttMap] = useState<Record<string, VTTCue[]>>({});

  const effectiveBlueIndex = isLocked ? currentIndex : blueIndex;
  const effectiveBlueTime = isLocked ? currentTime : blueCursorTime;
  const [sourceHighlightsMap, setSourceHighlightsMap] = useState<
    Record<string, Highlight[]>
  >({});
  const [isStrikethroughMode, setIsStrikethroughMode] = useState(false);
  const [strikethroughSelectionStart, setStrikethroughSelectionStart] =
    useState<number | null>(null);
  const [isCleanMode, setIsCleanMode] = useState(false);
  const [cleanSelectionStart, setCleanSelectionStart] = useState<number | null>(
    null,
  );
  const { location } = useLocation();

  const [isRelativeMode, setIsRelativeMode] = useState(true);

  // Reordering states
  const [movingHighlightId, setMovingHighlightId] = useState<string | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClient();
  const currentHighlight = highlights[currentIndex];
  const blueHighlight = highlights[blueIndex];

  const totalPlaylistDuration = useMemo(() => {
    return highlights.reduce((acc, h) => acc + (h.end_time - h.start_time), 0);
  }, [highlights]);

  const elapsedPlaylistTime = useMemo(() => {
    let elapsed = 0;
    for (let i = 0; i < currentIndex; i++) {
      elapsed += highlights[i].end_time - highlights[i].start_time;
    }
    if (currentHighlight) {
      elapsed += Math.max(0, currentTime - currentHighlight.start_time);
    }
    return elapsed;
  }, [currentIndex, highlights, currentTime, currentHighlight]);

  useEffect(() => {
    if (isLocked && blueIndex !== currentIndex) {
      setBlueIndex(currentIndex);
    }
  }, [currentIndex, isLocked]);

  // Component state reference for unified access in event listeners
  const stateRef = useRef<any>({});
  useEffect(() => {
    stateRef.current = {
      highlights,
      currentIndex,
      movingHighlightId,
      isPlaying,
      isRelativeMode,
      currentTime,
      blueCursorTime,
      blueIndex,
      isLocked,
      effectiveBlueIndex,
      effectiveBlueTime,
      currentCues,
      currentCueIndex,
      playlistCues,
      strikethroughSelectionStart,
      cleanSelectionStart,
      isStrikethroughMode,
      isCleanMode,
      showLegend,
      showTranscript,
      currentHighlight,
      isHigherKeysModalOpen,
      playbackRate,
      showExitConfirmation,
      exitConfirmationFocus,
    };
  });

  const refreshHighlights = useCallback(async () => {
    let data;
    if (keyId === "unlabeled") {
      const { data: assignedIds } = await supabase
        .from("higherkeys")
        .select("highlight_id")
        .not("highlight_id", "is", null);
      const assignedSet = new Set(
        assignedIds?.map((a) => a.highlight_id) || [],
      );
      const { data: allH, error } = await supabase
        .from("highlights")
        .select("*, sources(*)")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error refreshing unlabeled:", error);
        return;
      }
      data =
        allH
          ?.filter((h: any) => !assignedSet.has(h.id))
          .map((h: any) => ({
            ...h,
            profile_id: h.sources?.profile_id,
          })) || [];
    } else {
      const { data: rpcData, error } = await supabase.rpc(
        "fetch_playlist_highlights",
        {
          target_key_id: keyId,
        },
      );

      if (error) {
        console.error("Error refreshing playlist:", error);
        return;
      }
      data = rpcData;
    }

    // We need to re-attach assignment IDs because RPC results might not have them
    const highlightIds = data?.map((h: any) => h.id) || [];
    const { data: assignments } = await supabase
      .from("higherkeys")
      .select("id, highlight_id, parent_id, order_index")
      .in("highlight_id", highlightIds);

    const highlightsWithAssignments = data?.map((h: any) => {
      const assignment = assignments?.find((a) => a.highlight_id === h.id);
      return {
        ...h,
        assignment_id: assignment?.id,
        higherkey_id: assignment?.parent_id,
        order_index: assignment?.order_index,
      };
    });

    setHighlights(highlightsWithAssignments || []);
  }, [supabase, keyId]);

  // Load all VTTs and Source Highlights for the entire playlist
  useEffect(() => {
    if (highlights.length === 0) return;

    const sourceIds = Array.from(new Set(highlights.map((h) => h.source_id)));
    const profileIds = Array.from(new Set(highlights.map((h) => h.profile_id)));

    // Fetch VTTs
    sourceIds.forEach((sid) => {
      if (vttMap[sid]) return; // Already loaded

      const highlight = highlights.find((h) => h.source_id === sid);
      if (!highlight) return;

      const vttUrl = supabase.storage
        .from("sources")
        .getPublicUrl(`${highlight.profile_id}/${sid}/words.vtt`)
        .data.publicUrl;

      fetch(vttUrl)
        .then((res) => res.text())
        .then((text) => {
          const parsed = parseVTT(text);
          setVttMap((prev) => ({ ...prev, [sid]: parsed }));
        })
        .catch((err) => console.error(`Failed to load VTT for ${sid}`, err));
    });

    // Fetch Source Highlights (for strikethroughs)
    const fetchAllSourceHighlights = async () => {
      const { data } = await supabase
        .from("highlights")
        .select("*")
        .in("source_id", sourceIds);

      const mapped: Record<string, Highlight[]> = {};
      data?.forEach((h: any) => {
        if (!mapped[h.source_id]) mapped[h.source_id] = [];
        mapped[h.source_id].push(h);
      });
      setSourceHighlightsMap(mapped);
    };

    fetchAllSourceHighlights();
  }, [highlights, supabase]);

  // Initial seek for current highlight
  useEffect(() => {
    if (currentHighlight) {
      setSeekTo(currentHighlight.start_time);
      setTimeout(() => setSeekTo(undefined), 10);
    }
  }, [currentIndex]); // Only on clip change

  const strikethroughs = useMemo(() => {
    if (!currentHighlight) return [];
    const sourceId = currentHighlight.source_id;
    const sourceHighlights = sourceHighlightsMap[sourceId] || [];
    return sourceHighlights
      .filter((h) => h.is_strikethrough)
      .flatMap((h) => [h.start_time, h.end_time]);
  }, [sourceHighlightsMap, currentHighlight]);

  const playlistCues = useMemo(() => {
    return highlights.map((h, i) => {
      const sourceCues = vttMap[h.source_id] || [];
      return sourceCues
        .filter(
          (cue) => cue.startTime >= h.start_time && cue.endTime <= h.end_time,
        )
        .map((cue) => ({ ...cue, highlightIndex: i }));
    });
  }, [highlights, vttMap]);

  const flattenedCues = useMemo(() => {
    return playlistCues.flat();
  }, [playlistCues]);

  const currentCues = useMemo(() => {
    return playlistCues[currentIndex] || [];
  }, [playlistCues, currentIndex]);

  const currentCueIndex = useMemo(() => {
    return currentCues.findIndex(
      (c) => effectiveBlueTime >= c.startTime && effectiveBlueTime < c.endTime,
    );
  }, [currentCues, effectiveBlueTime]);

  // Handle Relative Mode Playback Skipping
  useEffect(() => {
    if (!isRelativeMode || !isPlaying) return;

    for (let i = 0; i < strikethroughs.length; i += 2) {
      const start = strikethroughs[i];
      const end = strikethroughs[i + 1];
      if (currentTime >= start && currentTime < end) {
        setSeekTo(end);
        setTimeout(() => setSeekTo(undefined), 10);
        break;
      }
    }
  }, [currentTime, isRelativeMode, isPlaying, strikethroughs]);

  const allStrikethroughs = useMemo(() => {
    const map: Record<number, number[]> = {};
    highlights.forEach((h, i) => {
      const sourceHighlights = sourceHighlightsMap[h.source_id] || [];
      map[i] = sourceHighlights
        .filter((sh) => sh.is_strikethrough)
        .flatMap((sh) => [sh.start_time, sh.end_time]);
    });
    return map;
  }, [highlights, sourceHighlightsMap]);

  const handleAction = useCallback(
    async (
      startTime: number,
      endTime: number,
      actionMode: "strikethrough" | "clean",
      targetSourceId?: string,
    ) => {
      const { blueIndex, highlights, isLocked, currentIndex } =
        stateRef.current;
      const effectiveIdx = isLocked ? currentIndex : blueIndex;
      const activeHighlight = highlights[effectiveIdx];
      const sourceId = targetSourceId || activeHighlight?.source_id;
      if (!sourceId) return;

      const start = Math.min(startTime, endTime);
      const end = Math.max(startTime, endTime);

      if (start >= end) return;

      if (actionMode === "strikethrough") {
        const newEntry: any = {
          source_id: sourceId,
          start_time: start,
          end_time: end,
          is_strikethrough: true,
          latitude: location?.lat,
          longitude: location?.lng,
        };
        const { error } = await supabase.from("highlights").insert(newEntry);

        if (error) {
          toast.error("Failed to save strikethrough");
        } else {
          // Re-fetch all source highlights to update local map
          const { data } = await supabase
            .from("highlights")
            .select("*")
            .in(
              "source_id",
              Array.from(
                new Set(highlights.map((h: Highlight) => h.source_id)),
              ),
            );

          const mapped: Record<string, Highlight[]> = {};
          data?.forEach((h: any) => {
            if (!mapped[h.source_id]) mapped[h.source_id] = [];
            mapped[h.source_id].push(h);
          });
          setSourceHighlightsMap(mapped);
          toast.success("Strikethrough updated");
        }
      } else if (actionMode === "clean") {
        const sourceHighlights = sourceHighlightsMap[sourceId] || [];
        const intersecting = sourceHighlights.filter(
          (h) => h.start_time < end && h.end_time > start && h.is_strikethrough,
        );

        if (intersecting.length === 0) return;

        const toDelete: string[] = [];
        const toUpdate: { id: string; start_time: number; end_time: number }[] =
          [];
        const toInsert: any[] = [];

        for (const h of intersecting) {
          const hStart = h.start_time;
          const hEnd = h.end_time;

          if (hStart >= start && hEnd <= end) {
            toDelete.push(h.id!);
          } else if (hStart < start && hEnd > end) {
            toUpdate.push({ id: h.id!, start_time: hStart, end_time: start });
            toInsert.push({
              source_id: sourceId,
              start_time: end,
              end_time: hEnd,
              is_strikethrough: true,
            });
          } else if (hStart < start && hEnd <= end) {
            toUpdate.push({ id: h.id!, start_time: hStart, end_time: start });
          } else if (hStart >= start && hEnd > end) {
            toUpdate.push({ id: h.id!, start_time: end, end_time: hEnd });
          }
        }

        if (toDelete.length > 0) {
          await supabase.from("highlights").delete().in("id", toDelete);
        }
        for (const upd of toUpdate) {
          await supabase
            .from("highlights")
            .update({ start_time: upd.start_time, end_time: upd.end_time })
            .eq("id", upd.id);
        }
        if (toInsert.length > 0) {
          await supabase.from("highlights").insert(toInsert);
        }

        const { data } = await supabase
          .from("highlights")
          .select("*")
          .in(
            "source_id",
            Array.from(new Set(highlights.map((h: Highlight) => h.source_id))),
          );

        const mapped: Record<string, Highlight[]> = {};
        data?.forEach((h: any) => {
          if (!mapped[h.source_id]) mapped[h.source_id] = [];
          mapped[h.source_id].push(h);
        });
        setSourceHighlightsMap(mapped);
        toast.info("Strikethroughs removed");
      }
    },
    [supabase, currentHighlight, location, sourceHighlightsMap, highlights],
  );

  const handleMove = useCallback(
    async (dir: -1 | 1) => {
      setHighlights((prevHighlights) => {
        const currentIdx = prevHighlights.findIndex(
          (h) => h.id === stateRef.current.movingHighlightId,
        );
        if (currentIdx === -1) return prevHighlights;

        const targetIdx = currentIdx + dir;
        if (targetIdx < 0 || targetIdx >= prevHighlights.length)
          return prevHighlights;

        const newHighlights = [...prevHighlights];
        const item = newHighlights.splice(currentIdx, 1)[0];
        newHighlights.splice(targetIdx, 0, item);

        // Update index in sync
        setCurrentIndex(targetIdx);

        // Save order to DB (optimistic update continues)
        const updates = newHighlights.map((h, i) => {
          if (h.assignment_id) {
            return supabase
              .from("higherkeys")
              .update({ order_index: i })
              .eq("id", h.assignment_id);
          }
          return null;
        });
        Promise.all(updates.filter(Boolean)).catch((err) => {
          console.error("Failed to save order:", err);
          toast.error("Failed to save new order");
        });

        return newHighlights;
      });
    },
    [supabase],
  );

  const handleDelete = useCallback(async () => {
    if (!currentHighlight || !currentHighlight.assignment_id) {
      toast.error("Cannot delete: Assignment ID not found");
      return;
    }

    if (
      !confirm(
        `Remove "${currentHighlight.alias || "this clip"}" from this playlist?`,
      )
    ) {
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("higherkeys")
        .delete()
        .eq("id", currentHighlight.assignment_id);

      if (error) throw error;

      toast.success("Removed from playlist");

      // Update local state: remove the item and adjust current index if needed
      const newHighlights = highlights.filter(
        (h) => h.id !== currentHighlight.id,
      );
      setHighlights(newHighlights);

      if (newHighlights.length === 0) {
        // Handled by the empty state return
      } else if (currentIndex >= newHighlights.length) {
        setCurrentIndex(newHighlights.length - 1);
      }
    } catch (err) {
      console.error("Error deleting:", err);
      toast.error("Failed to remove from playlist");
    } finally {
      setIsSaving(false);
    }
  }, [currentHighlight, highlights, currentIndex, supabase]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const {
        highlights,
        currentIndex,
        isPlaying,
        isRelativeMode,
        currentTime,
        blueCursorTime,
        isLocked,
        effectiveBlueTime,
        currentCues,
        currentCueIndex,
        strikethroughSelectionStart,
        cleanSelectionStart,
        isStrikethroughMode,
        isCleanMode,
        showLegend,
        showTranscript,
        currentHighlight,
        playlistCues,
        movingHighlightId,
        isHigherKeysModalOpen,
        showExitConfirmation,
        exitConfirmationFocus,
      } = stateRef.current;

      // Higher Keys Modal toggle
      if (e.key === "Tab") {
        e.preventDefault();
        setIsHigherKeysModalOpen((prev) => !prev);
        return;
      }

      // Exit confirmation logic
      if (showExitConfirmation) {
        if (e.key === "Escape") {
          e.preventDefault();
          setShowExitConfirmation(false);
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          if (exitConfirmationFocus === "exit") {
            router.push("/dashboard");
          } else {
            setShowExitConfirmation(false);
          }
          return;
        }
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          setExitConfirmationFocus("cancel");
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          setExitConfirmationFocus("exit");
        }
        return;
      }

      // Ignore other keys if modal is open
      if (isHigherKeysModalOpen) return;

      const isInput =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement;
      if (isInput) return;

      if (e.key === "Shift") {
        if (e.repeat) return;
        e.preventDefault();
        const { movingHighlightId, currentHighlight } = stateRef.current;
        if (movingHighlightId) {
          setMovingHighlightId(null);
          toast.success("Move Mode: Saved");
        } else {
          setMovingHighlightId(currentHighlight?.id || null);
          toast.info("Move Mode: Active");
        }
        return;
      }

      if (showLegend) {
        if (e.key === "Escape" || e.key === "l" || e.key === "L") {
          e.preventDefault();
          setShowLegend(false);
        }
        return;
      }

      if (taggingHighlightIds.length > 0 || aliasingHighlightIds.length > 0) {
        if (e.key === "Escape") {
          e.preventDefault();
          setTaggingHighlightIds([]);
          setAliasingHighlightIds([]);
        }
        return;
      }

      const moveCursor = (delta: number) => {
        if (playlistCues.length === 0) return;

        const currentEffectiveBlueIndex = isLocked ? currentIndex : blueIndex;
        const currentBlueCues = playlistCues[currentEffectiveBlueIndex] || [];

        // Find current cue index for blue cursor relative to its own clip
        const currentBlueCueIdx = currentBlueCues.findIndex(
          (c: VTTCue) =>
            effectiveBlueTime >= c.startTime && effectiveBlueTime < c.endTime,
        );

        let newIdx = (currentBlueCueIdx === -1 ? 0 : currentBlueCueIdx) + delta;

        if (newIdx < 0) {
          if (currentEffectiveBlueIndex > 0) {
            const prevIndex = currentEffectiveBlueIndex - 1;
            const prevCues = playlistCues[prevIndex];
            if (prevCues?.length > 0) {
              setBlueIndex(prevIndex);
              const targetIdx = Math.max(0, prevCues.length + newIdx);
              setBlueCursorTime(prevCues[targetIdx].startTime);
              setIsLocked(false);
            }
          } else {
            setBlueCursorTime(currentBlueCues[0]?.startTime || 0);
            setBlueIndex(0);
            setIsLocked(false);
          }
        } else if (newIdx >= currentBlueCues.length) {
          if (currentEffectiveBlueIndex < highlights.length - 1) {
            const nextIndex = currentEffectiveBlueIndex + 1;
            const nextCues = playlistCues[nextIndex];
            if (nextCues?.length > 0) {
              setBlueIndex(nextIndex);
              const targetIdx = Math.min(
                nextCues.length - 1,
                newIdx - currentBlueCues.length,
              );
              setBlueCursorTime(nextCues[targetIdx].startTime);
              setIsLocked(false);
            }
          } else {
            setBlueCursorTime(
              currentBlueCues[currentBlueCues.length - 1]?.startTime || 0,
            );
            setIsLocked(false);
          }
        } else {
          const nextTime = currentBlueCues[newIdx].startTime;
          setIsLocked(false);
          setBlueCursorTime(nextTime);
          setBlueIndex(currentEffectiveBlueIndex);
        }
      };

      const moveCursorVertical = (direction: "up" | "down") => {
        moveCursor(direction === "up" ? -15 : 15);
      };

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          if (movingHighlightId) {
            handleMove(-1);
          } else {
            moveCursor(-1);
          }
          break;
        case "ArrowRight":
          e.preventDefault();
          if (movingHighlightId) {
            handleMove(1);
          } else {
            moveCursor(1);
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          if (movingHighlightId) {
            handleMove(-1);
          } else {
            moveCursorVertical("up");
          }
          break;
        case "ArrowDown":
          e.preventDefault();
          if (movingHighlightId) {
            handleMove(1);
          } else {
            moveCursorVertical("down");
          }
          break;
        case ",":
        case "<":
          e.preventDefault();
          setCurrentIndex((prev) => Math.max(0, prev - 1));
          setIsPlaying(true);
          break;
        case ".":
        case ">":
          e.preventDefault();
          setCurrentIndex((prev) => Math.min(highlights.length - 1, prev + 1));
          setIsPlaying(true);
          break;
        case "[":
          e.preventDefault();
          setPlaybackRate((prev) => Math.max(0.25, prev - 0.25));
          break;
        case "]":
          e.preventDefault();
          setPlaybackRate((prev) => Math.min(4, prev + 0.25));
          break;
        case "\\":
          e.preventDefault();
          setPlaybackRate(1.0);
          break;
        case "s":
        case "S":
          e.preventDefault();
          setPlaybackRate((prev) => (prev >= 3 ? 1 : prev + 0.5));
          break;
        case "Enter":
          e.preventDefault();
          setCurrentIndex(effectiveBlueIndex);
          setSeekTo(effectiveBlueTime);
          setTimeout(() => setSeekTo(undefined), 10);
          setIsPlaying(true);
          break;
        case " ":
          e.preventDefault();
          setIsPlaying(!isPlaying);
          break;
        case "q":
        case "Q":
          setCurrentIndex(effectiveBlueIndex);
          setSeekTo(effectiveBlueTime);
          setTimeout(() => setSeekTo(undefined), 10);
          break;
        case "e":
        case "E":
          setIsLocked(true);
          setBlueCursorTime(currentTime);
          setBlueIndex(currentIndex);
          break;
        case "m":
        case "M":
          setIsRelativeMode(!isRelativeMode);
          break;
        case "a":
        case "A":
          e.preventDefault();
          if (currentHighlight) setAliasingHighlightIds([currentHighlight.id]);
          break;
        case "k":
        case "K":
          e.preventDefault();
          if (currentHighlight) setTaggingHighlightIds([currentHighlight.id]);
          break;
        case "t":
        case "T":
          setShowTranscript(!showTranscript);
          break;
        case "2":
          e.preventDefault();
          if (isStrikethroughMode) {
            if (strikethroughSelectionStart !== null) {
              handleAction(
                strikethroughSelectionStart,
                effectiveBlueTime,
                "strikethrough",
              );
              setStrikethroughSelectionStart(null);
            }
            setIsStrikethroughMode(false);
          } else {
            setStrikethroughSelectionStart(effectiveBlueTime);
            setIsStrikethroughMode(true);
            setIsCleanMode(false);
            setCleanSelectionStart(null);
          }
          break;
        case "3":
          e.preventDefault();
          if (isCleanMode) {
            if (cleanSelectionStart !== null) {
              handleAction(cleanSelectionStart, effectiveBlueTime, "clean");
              setCleanSelectionStart(null);
            }
            setIsCleanMode(false);
          } else {
            setCleanSelectionStart(effectiveBlueTime);
            setIsCleanMode(true);
            setIsStrikethroughMode(false);
            setStrikethroughSelectionStart(null);
          }
          break;
        case "Delete":
        case "Backspace":
          e.preventDefault();
          handleDelete();
          break;
        case "l":
        case "L":
          setShowLegend(!showLegend);
          break;
        case "Escape":
          if (showLegend) {
            setShowLegend(false);
          } else if (isStrikethroughMode || isCleanMode) {
            setIsStrikethroughMode(false);
            setIsCleanMode(false);
            setStrikethroughSelectionStart(null);
            setCleanSelectionStart(null);
          } else {
            setShowExitConfirmation(true);
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleMove, handleAction, handleDelete]);

  const hlsUrl = useMemo(() => {
    if (!currentHighlight) return "";
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/sources/${currentHighlight.profile_id}/${currentHighlight.source_id}/hls/playlist.m3u8`;
  }, [currentHighlight]);

  const handleEnded = () => {
    if (currentIndex < highlights.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
    if (currentHighlight && time >= currentHighlight.end_time) {
      handleEnded();
    }
  };

  if (highlights.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-white">
        <p className="text-xl font-bold">No highlights found for this key.</p>
        <Link href="/dashboard" className="text-primary hover:underline">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-black text-white">
      {/* Main Area: Playlist Player */}
      <div className="flex-1 relative flex flex-col transition-all duration-300">
        {/* Top Header */}
        <div className="absolute top-0 left-0 right-0 p-8 flex items-center justify-between z-50 bg-linear-to-b from-black/80 via-black/40 to-transparent">
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="p-3 hover:bg-white/10 rounded-full transition-all text-white/50 hover:text-white"
            >
              <ArrowLeft className="size-6" />
            </Link>

            {/* Breadcrumbs */}
            <div className="flex items-center gap-2">
              {breadcrumbs.map((b, i) => (
                <React.Fragment key={b.id}>
                  {i > 0 && <span className="text-white/20 text-xs">/</span>}
                  <Link
                    href={`/playlist/${b.id}`}
                    className={cn(
                      "text-xs font-black uppercase tracking-[.3em] transition-colors",
                      i === breadcrumbs.length - 1
                        ? "text-primary"
                        : "text-white/40 hover:text-white",
                    )}
                  >
                    {b.name}
                  </Link>
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Playback Rate Indicator */}
            <div className="flex flex-col items-end">
              <span className="text-[8px] font-black text-primary/40 uppercase tracking-widest leading-none mb-1">
                Speed
              </span>
              <span className="text-sm font-black text-primary font-mono leading-none">
                {playbackRate.toFixed(2)}x
              </span>
            </div>
            <button
              onClick={() => setShowLegend(!showLegend)}
              className="p-3 hover:bg-white/10 rounded-full transition-all text-white/50 hover:text-white"
            >
              <Keyboard className="size-6" />
            </button>
          </div>
        </div>

        {/* Main Video Area */}
        <div className="relative flex-1 flex flex-col min-h-0 bg-neutral-950">
          <div className="absolute inset-x-0 top-0 bottom-0 overflow-hidden">
            {hlsUrl && (
              <VideoPlayer
                src={hlsUrl}
                playing={isPlaying}
                seekTo={seekTo}
                playbackRate={playbackRate}
                onTimeUpdate={handleTimeUpdate}
                onPlayPause={setIsPlaying}
              />
            )}
          </div>

          {showTranscript && (
            <div className="absolute inset-0 z-20 overflow-y-auto custom-scrollbar bg-black/70 p-20 pb-40 select-text">
              <div className="max-w-4xl mx-auto">
                <TranscriptOverlay
                  cues={flattenedCues}
                  currentTime={currentTime}
                  blueCursorTime={effectiveBlueTime}
                  highlights={[]} // Not needed in playlist view
                  strikethroughs={allStrikethroughs}
                  isLocked={isLocked}
                  isVisible={true}
                  isRelativeMode={isRelativeMode}
                  isPlaylistView={true}
                  activeHighlightIndex={currentIndex}
                  activeBlueIndex={blueIndex}
                  className="static p-0 overflow-visible bg-transparent z-10"
                  onWordClick={(time, hIdx) => {
                    if (hIdx !== undefined && hIdx !== currentIndex) {
                      setCurrentIndex(hIdx);
                      setBlueIndex(hIdx);
                    }
                    setSeekTo(time);
                    setTimeout(() => setSeekTo(undefined), 10);
                    setBlueCursorTime(time);
                    setIsLocked(false);
                    setIsPlaying(true);
                  }}
                  strikethroughSelectionRange={
                    isStrikethroughMode && strikethroughSelectionStart !== null
                      ? {
                          start: strikethroughSelectionStart,
                          end: effectiveBlueTime,
                        }
                      : null
                  }
                  cleanSelectionRange={
                    isCleanMode && cleanSelectionStart !== null
                      ? {
                          start: cleanSelectionStart,
                          end: effectiveBlueTime,
                        }
                      : null
                  }
                />
              </div>
            </div>
          )}

          {/* Interaction Layer */}
          <div
            className={cn(
              "absolute inset-0 z-10 cursor-pointer",
              showTranscript && "pointer-events-none",
            )}
            onClick={() => setIsPlaying(!isPlaying)}
          />

          {movingHighlightId && (
            <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[60] pointer-events-none">
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-6 px-10 py-4 rounded-2xl bg-black/80 border border-primary/20 backdrop-blur-3xl shadow-[0_0_80px_rgba(var(--primary-rgb),0.15)] ring-1 ring-primary/5">
                  <div className="flex flex-col items-center">
                    <div className="size-8 flex items-center justify-center rounded-lg bg-primary/10 border border-primary/20 mb-1">
                      <GripVertical className="size-4 text-primary animate-pulse" />
                    </div>
                    <span className="text-[7px] font-black text-primary/40 uppercase tracking-widest">
                      Moving
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-[.6em] text-primary">
                      Move Mode
                    </span>
                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest truncate max-w-48">
                      {currentHighlight?.alias || "Untitled Clip"}
                    </span>
                  </div>

                  <div className="w-px h-10 bg-white/5" />

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[8px] font-black text-primary">
                        ↑ ↓ ← →
                      </kbd>
                      <span className="text-[8px] font-bold uppercase tracking-widest text-white/20">
                        Reorder
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[8px] font-black text-primary">
                        SHIFT
                      </kbd>
                      <span className="text-[8px] font-bold uppercase tracking-widest text-white/20">
                        Save / Exit
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Playlist Progress Bar */}
        <div className="h-1 w-full bg-white/5 relative z-[60]">
          <div
            className="absolute inset-y-0 left-0 bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)] transition-all duration-300"
            style={{
              width: `${(elapsedPlaylistTime / totalPlaylistDuration) * 100}%`,
            }}
          />
          {/* Time indicator */}
          <div className="absolute -top-6 right-4 text-[10px] font-mono text-white/40">
            {Math.floor(elapsedPlaylistTime / 60)}:
            {String(Math.floor(elapsedPlaylistTime % 60)).padStart(2, "0")} /{" "}
            {Math.floor(totalPlaylistDuration / 60)}:
            {String(Math.floor(totalPlaylistDuration % 60)).padStart(2, "0")}
          </div>
        </div>

        {/* Playlist Strip */}
        <div
          className={cn(
            "bg-black border-t border-white/5 transition-all duration-500 ease-in-out shrink-0 z-50 h-32",
          )}
        >
          <div className="flex gap-4 p-4 h-full overflow-x-auto custom-scrollbar">
            {highlights.map((h, i) => (
              <button
                key={h.id}
                onClick={() => {
                  if (!movingHighlightId) {
                    setCurrentIndex(i);
                    setIsPlaying(true);
                  }
                }}
                className={cn(
                  "group relative min-w-48 h-full rounded-lg border text-left p-3 transition-all shrink-0",
                  i === currentIndex
                    ? movingHighlightId === h.id
                      ? "bg-primary/20 border-primary border-dashed animate-pulse shadow-[0_0_30px_rgba(var(--primary-rgb),0.3)] scale-105"
                      : "bg-primary/5 border-primary shadow-[0_0_30px_rgba(var(--primary-rgb),0.15)]"
                    : "bg-white/5 border-white/5 hover:bg-white/10",
                  movingHighlightId &&
                    movingHighlightId !== h.id &&
                    "opacity-50",
                )}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    {movingHighlightId === h.id && (
                      <GripVertical className="size-3 text-primary animate-pulse" />
                    )}
                    <span
                      className={cn(
                        "text-[9px] font-black uppercase tracking-tighter",
                        i === currentIndex ? "text-primary" : "text-white/20",
                      )}
                    >
                      Clip {i + 1}
                    </span>
                  </div>
                  <span className="text-[8px] text-white/10 font-mono tracking-tighter">
                    {Math.floor(h.start_time / 60)}:
                    {String(Math.floor(h.start_time % 60)).padStart(2, "0")}
                  </span>
                </div>
                <p
                  className={cn(
                    "text-[11px] font-bold truncate leading-none",
                    i === currentIndex ? "text-primary" : "text-white/60",
                  )}
                >
                  {h.alias || `Untitled Highlight`}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Global Controls Bar */}
        <div className="h-24 bg-black/95 backdrop-blur-3xl border-t border-white/5 flex items-center justify-between px-12 z-50">
          <div className="flex items-center gap-8">
            {isSaving ? (
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary animate-pulse">
                <div className="size-2 rounded-full bg-primary animate-bounce" />
                Saving Order...
              </div>
            ) : (
              <>
                <button
                  onClick={() =>
                    setCurrentIndex((prev) => Math.max(0, prev - 1))
                  }
                  disabled={currentIndex === 0 || !!movingHighlightId}
                  className="text-white/20 hover:text-white disabled:opacity-5 transition-colors"
                  title="Previous Clip (ArrowLeft)"
                >
                  <SkipBack className="size-6 fill-current" />
                </button>
                <button
                  onClick={() =>
                    setCurrentIndex((prev) =>
                      Math.min(highlights.length - 1, prev + 1),
                    )
                  }
                  disabled={
                    currentIndex === highlights.length - 1 ||
                    !!movingHighlightId
                  }
                  className="text-white/20 hover:text-white disabled:opacity-5 transition-colors"
                  title="Next Clip (ArrowRight)"
                >
                  <SkipForward className="size-6 fill-current" />
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-12">
            <button
              onClick={() => setShowLegend(true)}
              className="flex flex-col items-center gap-1 group"
            >
              <Keyboard className="size-4 text-white/20 group-hover:text-primary transition-colors" />
              <span className="text-[7px] font-black uppercase tracking-widest text-white/10 group-hover:text-white/40">
                Shortcuts (L)
              </span>
            </button>
          </div>
        </div>

        {/* Keyboard Legend Modal */}
        {showLegend && (
          <div className="fixed inset-0 z-100 flex items-center justify-center p-6">
            <div
              className="absolute inset-0 bg-black/80 backdrop-blur-xl"
              onClick={() => setShowLegend(false)}
            />
            <div className="relative w-full max-w-xl bg-neutral-900 rounded-2xl border border-white/5 shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-white/5 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Keyboard className="size-5 text-primary" />
                  <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white">
                    Keyboard Shortcuts
                  </h2>
                </div>
                <button
                  onClick={() => setShowLegend(false)}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors"
                >
                  <X className="size-4 text-white/40" />
                </button>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  {[
                    { keys: ["Space"], label: "Play / Pause" },
                    { keys: ["Enter"], label: "Play Selected" },
                    { keys: ["←", "→"], label: "Scrub Cursor" },
                    { keys: ["↑", "↓"], label: "Jump Cursor" },
                    { keys: [",", "."], label: "Prev / Next Clip" },
                    { keys: ["Shift"], label: "Toggle Move Mode" },
                    { keys: ["Q", "E"], label: "Sync Video / Cursor" },
                    { keys: ["[", "]"], label: "Speed Down / Up" },
                    { keys: ["\\"], label: "Reset Speed" },
                    { keys: ["S"], label: "Cycle Speed" },
                    { keys: ["A"], label: "Rename Clip Alias" },
                    { keys: ["K"], label: "Tagger Mode" },
                    { keys: ["T"], label: "Toggle Transcript" },
                    { keys: ["2"], label: "Strikethrough Mode" },
                    { keys: ["3"], label: "Clean Strikethroughs" },
                    { keys: ["M"], label: "Relative Mode" },
                    { keys: ["Delete"], label: "Remove Clip" },
                    { keys: ["L"], label: "Toggle Legend" },
                    { keys: ["Tab"], label: "Higher Keys Tree" },
                    { keys: ["Esc"], label: "Exit / Cancel" },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between group"
                    >
                      <span className="text-[9px] font-bold text-white/40 group-hover:text-white/70 transition-colors uppercase tracking-widest leading-tight pr-2">
                        {item.label}
                      </span>
                      <div className="flex gap-1 shrink-0">
                        {item.keys.map((k) => (
                          <kbd
                            key={k}
                            className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[8px] font-black text-primary min-w-6 text-center"
                          >
                            {k}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-white/5 border-t border-white/5 text-center">
                <span className="text-[8px] font-black uppercase tracking-[.4em] text-white/20">
                  Higher Keys • Player v1.0
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Taggers */}
        <HighlightAliaser
          open={aliasingHighlightIds.length > 0}
          onOpenChange={(open) => !open && setAliasingHighlightIds([])}
          highlightIds={aliasingHighlightIds}
          onSuccess={() => {
            refreshHighlights();
          }}
        />

        <HigherKeyEditor
          user={user}
          profile={profile}
          onRefresh={refreshHighlights}
          mode="modal"
          open={isHigherKeysModalOpen}
          onOpenChange={setIsHigherKeysModalOpen}
          isFocused={isHigherKeysModalOpen}
          taggingIds={taggingHighlightIds}
          onTaggingComplete={() => {
            setTaggingHighlightIds([]);
            setIsHigherKeysModalOpen(false);
          }}
        />

        {/* Exit Confirmation Dialog */}
        <AlertDialog
          open={showExitConfirmation}
          onOpenChange={setShowExitConfirmation}
        >
          <AlertDialogContent className="bg-background/95 backdrop-blur-md border border-white/10 shadow-2xl p-0 overflow-hidden sm:max-w-md">
            <AlertDialogHeader className="p-6 text-left sm:text-left">
              <AlertDialogTitle className="text-xl font-bold uppercase tracking-widest text-primary">
                Return to Dashboard?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground mt-2">
                Are you sure you want to leave the playlist and return to the
                dashboard?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="p-6 bg-white/5 border-t border-white/5 m-0 sm:justify-end gap-3 rounded-none">
              <AlertDialogCancel
                className={cn(
                  "bg-transparent border-white/10 hover:bg-white/5 text-foreground uppercase tracking-widest text-[10px] h-9 px-4",
                  exitConfirmationFocus === "cancel" &&
                    "ring-2 ring-primary ring-offset-2 bg-muted transition-all",
                )}
                onClick={() => setShowExitConfirmation(false)}
              >
                Stay
              </AlertDialogCancel>
              <AlertDialogAction
                className={cn(
                  "bg-primary text-black font-bold uppercase tracking-widest text-[10px] h-9 px-4 border-0",
                  exitConfirmationFocus === "exit" &&
                    "ring-2 ring-primary ring-offset-2 bg-primary/90 transition-all scale-105",
                )}
                onClick={() => router.push("/dashboard")}
              >
                Exit to Dashboard
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
