"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { VideoPlayer } from "./video-player";
import { TranscriptOverlay } from "./transcript-overlay";
import { ChatThread } from "../chat/ChatThread";
import { VTTCue, parseVTT } from "@/lib/vtt-parser";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  cn,
  calculateRelativeDuration,
  formatDuration,
  mergeIntervals,
} from "@/lib/utils";
import { useLocation } from "../location-guard";
import { Tables } from "@/types/supabase";
import { HigherKeyEditor } from "../higherkeys/higher-key-editor";
import { HighlightAliaser } from "./highlight-aliaser";
import { Tag01Icon, Search01Icon, Message01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "next/navigation";
import { useDashboardShortcuts } from "../dashboard/hooks/use-dashboard-shortcuts";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Highlight {
  id?: string;
  source_id: string;
  alias?: string | null;
  start_time: number;
  end_time: number;
  relativeDuration?: number;
  is_strikethrough?: boolean;
  higherkeys?: {
    id: string;
    name: string;
    path?: string | any;
    color: string | null;
    parent?: {
      name: string;
    } | null;
  }[];
}

interface HighlighterContainerProps {
  source: {
    id: string;
    profile_id: string;
  };
  initialHighlights: Highlight[];
  vttUrl: string;
  hlsUrl: string;
  user: any;
  profile: Tables<"profiles">;
  initialTime?: number;
  backTab?: string | null;
  sourceId?: string | null;
  highlightId?: string | null;
  submissionId?: string | null;
}

const mergeStrikethroughs = (intervals: number[]) => {
  if (intervals.length === 0) return [];
  const pairs: [number, number][] = [];
  for (let i = 0; i < intervals.length; i += 2) {
    if (intervals[i] !== undefined && intervals[i + 1] !== undefined) {
      pairs.push([intervals[i], intervals[i + 1]]);
    }
  }
  return (mergeIntervals(pairs) as [number, number][]).flat();
};

export const HighlighterContainer = ({
  source,
  initialHighlights,
  vttUrl,
  hlsUrl,
  user,
  profile,
  initialTime = 0,
  backTab,
  sourceId,
  highlightId,
  submissionId,
}: HighlighterContainerProps) => {
  const [cues, setCues] = useState<VTTCue[]>([]);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [blueCursorTime, setBlueCursorTime] = useState(initialTime);
  const [rootKeyId, setRootKeyId] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const fetchRoot = async () => {
      const { data } = await supabase
        .from("higherkeys")
        .select("id")
        .eq("profile_id", user.id)
        .is("parent_id", null)
        .eq("name", profile.username!)
        .maybeSingle();
      if (data) setRootKeyId(data.id);
    };
    if (user?.id) fetchRoot();
  }, [supabase, user?.id, profile.username]);

  const [isLocked, setIsLocked] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [showTranscript, setShowTranscript] = useState(true);
  const [isHighlightMode, setIsHighlightMode] = useState(false);
  const [isStrikethroughMode, setIsStrikethroughMode] = useState(false);
  const [isCleanMode, setIsCleanMode] = useState(false);
  const [isClearHighlightMode, setIsClearHighlightMode] = useState(false);
  const [highlightSelectionStart, setHighlightSelectionStart] = useState<
    number | null
  >(null);

  const [showChat, setShowChat] = useState(false);

  // Higher Keys Tagger State
  const [taggingHighlightIds, setTaggingHighlightIds] = useState<string[]>([]);
  const [isHigherKeysModalOpen, setIsHigherKeysModalOpen] = useState(false);

  useEffect(() => {
    if (taggingHighlightIds.length > 0) {
      setIsHigherKeysModalOpen(true);
    }
  }, [taggingHighlightIds.length]);

  const [aliasingHighlightIds, setAliasingHighlightIds] = useState<string[]>(
    [],
  );
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [exitConfirmationFocus, setExitConfirmationFocus] = useState<
    "cancel" | "exit"
  >("cancel");
  const [highlightToDelete, setHighlightToDelete] = useState<Highlight | null>(
    null,
  );

  const [undoStack, setUndoStack] = useState<
    { description: string; undo: () => Promise<void> }[]
  >([]);

  const pushToUndo = useCallback(
    (description: string, undo: () => Promise<void>) => {
      setUndoStack((prev) => [...prev, { description, undo }]);
    },
    [],
  );

  const handleUndo = useCallback(async () => {
    if (undoStack.length === 0) {
      toast.info("Nothing to undo");
      return;
    }

    const lastAction = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));

    try {
      await lastAction.undo();
      toast.success(`Undone: ${lastAction.description}`);
    } catch (err: any) {
      toast.error(`Undo failed: ${err.message}`);
    }
  }, [undoStack]);

  const [deleteConfirmationFocus, setDeleteConfirmationFocus] = useState<
    "cancel" | "delete"
  >("cancel");

  const [strikethroughSelectionStart, setStrikethroughSelectionStart] =
    useState<number | null>(null);
  const [cleanSelectionStart, setCleanSelectionStart] = useState<number | null>(
    null,
  );
  const [clearHighlightSelectionStart, setClearHighlightSelectionStart] =
    useState<number | null>(null);
  const [highlights, setHighlights] = useState<Highlight[]>(initialHighlights);
  const [seekTo, setSeekTo] = useState<number | undefined>(initialTime);

  const strikethroughs = useMemo(() => {
    const intervals = highlights
      .filter((h) => h.is_strikethrough)
      .flatMap((h) => [h.start_time, h.end_time]);
    return mergeStrikethroughs(intervals);
  }, [highlights]);

  const highlightListItems = useMemo(() => {
    return highlights
      .filter((h) => !h.is_strikethrough)
      .sort((a, b) => {
        if (a.start_time !== b.start_time) return a.start_time - b.start_time;
        return (a.id || "").localeCompare(b.id || "");
      })
      .map((h) => {
        const relativeDuration = calculateRelativeDuration(
          h.start_time,
          h.end_time,
          highlights.filter((s) => s.is_strikethrough),
        );
        const absoluteDuration = h.end_time - h.start_time;

        return {
          ...h,
          absoluteDuration,
          relativeDuration,
          strikeCount: highlights.filter(
            (s) =>
              s.is_strikethrough &&
              s.start_time < h.end_time &&
              s.end_time > h.start_time,
          ).length,
        };
      });
  }, [highlights]);

  const [showLegend, setShowLegend] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchResultIndex, setCurrentSearchResultIndex] = useState(-1);
  const [showHighlightsList, setShowHighlightsList] = useState(false);
  const [focusedHighlightIndex, setFocusedHighlightIndex] = useState(0);
  const highlightRefs = useRef<(HTMLDivElement | null)[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isRelativeMode, setIsRelativeMode] = useState(false);
  const [editorRefreshKey, setEditorRefreshKey] = useState(0);

  const router = useRouter();

  const { location } = useLocation();

  const refreshHighlights = useCallback(async () => {
    const { data } = await supabase
      .from("highlights")
      .select(
        "*, higherkeys(*, parent:higherkeys(source_id, highlight_id, name))",
      )
      .eq("source_id", source.id);
    if (data) {
      const mapped = (data || []).map((h) => ({
        ...h,
        higherkeys: (h.higherkeys || []).map((hk: any) => ({
          ...hk,
          parent: Array.isArray(hk.parent) ? hk.parent[0] : hk.parent,
        })),
      }));
      setHighlights(mapped as any);
      setEditorRefreshKey((prev) => prev + 1);
    }
  }, [supabase, source.id]);

  const stateRef = useRef<any>({});

  const effectiveBlueTime = isLocked ? currentTime : blueCursorTime;

  const activeFocusHighlights = useMemo(() => {
    return highlights.filter(
      (h) =>
        !h.is_strikethrough &&
        effectiveBlueTime >= h.start_time &&
        effectiveBlueTime <= h.end_time,
    );
  }, [highlights, effectiveBlueTime]);

  useEffect(() => {
    if (showHighlightsList && highlightRefs.current[focusedHighlightIndex]) {
      highlightRefs.current[focusedHighlightIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [focusedHighlightIndex, showHighlightsList]);

  useEffect(() => {
    if (!searchQuery) {
      setSearchResults([]);
      setCurrentSearchResultIndex(-1);
      return;
    }

    const results: number[] = [];
    cues.forEach((cue: any, index: number) => {
      if (cue.text.toLowerCase().includes(searchQuery.toLowerCase())) {
        results.push(index);
      }
    });

    setSearchResults(results);
    if (results.length > 0) {
      setCurrentSearchResultIndex(0);
      const targetTime = cues[results[0]].startTime;
      setIsLocked(false);
      setBlueCursorTime(targetTime);
    } else {
      setCurrentSearchResultIndex(-1);
    }
  }, [searchQuery, cues]);

  useEffect(() => {
    if (showSearch) {
      setTimeout(() => searchInputRef.current?.focus(), 10);
    }
  }, [showSearch]);

  const [currentCueIndex, setCurrentCueIndex] = useState(-1);

  useEffect(() => {
    const idx = cues.findIndex(
      (c) => effectiveBlueTime >= c.startTime && effectiveBlueTime < c.endTime,
    );
    setCurrentCueIndex(idx);
  }, [cues, effectiveBlueTime]);

  // Helper: Get total duration of the video
  const totalDuration = cues.length > 0 ? cues[cues.length - 1].endTime : 0;

  // Helper: Convert absolute time to relative time by subtracting preceding strikethroughs
  const toRelativeTime = useCallback(
    (absTime: number) => {
      let subtracted = 0;
      for (let i = 0; i < strikethroughs.length; i += 2) {
        const start = strikethroughs[i];
        const end = strikethroughs[i + 1];
        if (absTime > end) {
          subtracted += end - start;
        } else if (absTime > start) {
          subtracted += absTime - start;
        }
      }
      return absTime - subtracted;
    },
    [strikethroughs],
  );

  // Helper: Get total relative duration
  const relativeDuration = useMemo(
    () => toRelativeTime(totalDuration),
    [toRelativeTime, totalDuration],
  );

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

  // Load VTT
  useEffect(() => {
    fetch(vttUrl)
      .then((res) => res.text())
      .then((text) => {
        const parsed = parseVTT(text);
        setCues(parsed);
      })
      .catch((err) => console.error("Failed to load VTT", err));
  }, [vttUrl]);

  const [isDeletingHighlight, setIsDeletingHighlight] = useState(false);
  const handleDeleteHighlight = useCallback(
    async (id: string) => {
      if (isDeletingHighlight) return;
      setIsDeletingHighlight(true);

      const toDelete = highlights.find((h) => h.id === id);
      const { error } = await supabase.from("highlights").delete().eq("id", id);

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Highlight deleted");

        if (toDelete) {
          pushToUndo(
            `Delete ${
              toDelete.is_strikethrough ? "strikethrough" : "highlight"
            }`,
            async () => {
              const { higherkeys, ...rest } = toDelete;
              await supabase.from("highlights").insert(rest);
              await refreshHighlights();
            },
          );
        }

        setHighlights((prev) => prev.filter((h) => h.id !== id));
        router.refresh();
      }
      setIsDeletingHighlight(false);
    },
    [
      supabase,
      isDeletingHighlight,
      router,
      highlights,
      pushToUndo,
      refreshHighlights,
    ],
  );

  const handleStrikeLongPauses = useCallback(async () => {
    const { cues, highlights, isRelativeMode } = stateRef.current;

    if (isRelativeMode) {
      toast.error("Strikethrough editing is disabled in Relative Mode");
      return;
    }

    if (!cues || cues.length === 0) return;

    const pauses: { start: number; end: number }[] = [];
    let currentPause: { start: number; end: number; count: number } | null =
      null;

    for (let i = 0; i < cues.length; i++) {
      const cue = cues[i];
      const isBlank = cue.text.trim() === "" || cue.text === "BLANK";

      if (isBlank) {
        // Count how many "blanks" this cue represents.
        // We count each space as a blank, or at least 1 if it's an empty cue or "BLANK"
        const spaces = (cue.text.match(/ /g) || []).length;
        const countToAdd = Math.max(1, spaces);

        if (!currentPause) {
          currentPause = {
            start: cue.startTime,
            end: cue.endTime,
            count: countToAdd,
          };
        } else {
          currentPause.end = cue.endTime;
          currentPause.count += countToAdd;
        }
      } else {
        if (currentPause && currentPause.count >= 3) {
          pauses.push({ start: currentPause.start, end: currentPause.end });
        }
        currentPause = null;
      }
    }
    if (currentPause && currentPause.count >= 3) {
      pauses.push({ start: currentPause.start, end: currentPause.end });
    }

    if (pauses.length === 0) {
      toast.info("No long pauses found (3+ blanks)");
      return;
    }

    const { data: existing } = await supabase
      .from("highlights")
      .select("start_time, end_time")
      .eq("source_id", source.id)
      .eq("is_strikethrough", true);

    const filteredPauses = pauses.filter((p) => {
      return !existing?.some(
        (e) =>
          (p.start >= e.start_time && p.start < e.end_time) ||
          (p.end > e.start_time && p.end <= e.end_time) ||
          (p.start <= e.start_time && p.end >= e.end_time),
      );
    });

    if (filteredPauses.length === 0) {
      toast.info("All long pauses are already struck through");
      return;
    }

    const newStrikes = filteredPauses.map((p) => ({
      source_id: source.id,
      start_time: p.start,
      end_time: p.end,
      is_strikethrough: true,
      latitude: location?.lat,
      longitude: location?.lng,
    }));

    const { data: inserted, error } = await supabase
      .from("highlights")
      .insert(newStrikes)
      .select();

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Struck through ${filteredPauses.length} long pauses`);
      await refreshHighlights();

      if (inserted && inserted.length > 0) {
        pushToUndo("Strike Long Pauses", async () => {
          await supabase
            .from("highlights")
            .delete()
            .in(
              "id",
              inserted.map((h: any) => h.id),
            );
          await refreshHighlights();
        });
      }
    }
  }, [supabase, source.id, location, refreshHighlights, pushToUndo]);

  const handleAction = useCallback(
    async (
      startTime: number,
      endTime: number,
      actionMode: "highlight" | "strikethrough" | "clean" | "clear_highlight",
    ) => {
      const start = Math.min(startTime, endTime);
      const end = Math.max(startTime, endTime);

      if (start >= end) return;

      if (actionMode === "highlight" || actionMode === "strikethrough") {
        // PERMITTED BEHAVIOR: Always insert as a single continuous interval.
        // We do NOT split or merge records here; the UI handles relative duration
        // logic by subtracting overlapping strikethroughs at runtime.
        const isStrike = actionMode === "strikethrough";
        const newEntry: any = {
          source_id: source.id,
          start_time: start,
          end_time: end,
          is_strikethrough: isStrike,
          latitude: location?.lat,
          longitude: location?.lng,
        };
        const { data: inserted, error } = await supabase
          .from("highlights")
          .insert(newEntry)
          .select()
          .single();

        if (error) {
          toast.error(
            `Failed to save ${isStrike ? "strikethrough" : "highlight"}`,
          );
        } else {
          await refreshHighlights();
          toast.success(isStrike ? "Strikethrough updated" : "Highlight saved");
          if (inserted) {
            pushToUndo(
              `Create ${isStrike ? "strikethrough" : "highlight"}`,
              async () => {
                await supabase
                  .from("highlights")
                  .delete()
                  .eq("id", inserted.id);
                await refreshHighlights();
              },
            );
          }
        }
      } else if (actionMode === "clean" || actionMode === "clear_highlight") {
        const isStrikeAction = actionMode === "clean";
        // Find entries of the correct type that intersect the selection
        const intersecting = highlights.filter(
          (h) =>
            h.start_time < end &&
            h.end_time > start &&
            (isStrikeAction ? h.is_strikethrough : !h.is_strikethrough),
        );

        if (intersecting.length === 0) return;

        // Snapshot original items for undo
        const snapshot = intersecting.map((h) => ({ ...h }));

        // Trimming/splitting logic
        const toDelete: string[] = [];
        const toUpdate: { id: string; start_time: number; end_time: number }[] =
          [];
        const toInsert: Highlight[] = [];

        for (const h of intersecting) {
          const hStart = h.start_time;
          const hEnd = h.end_time;

          if (hStart >= start && hEnd <= end) {
            toDelete.push(h.id!);
          } else if (hStart < start && hEnd > end) {
            toUpdate.push({ id: h.id!, start_time: hStart, end_time: start });
            toInsert.push({
              source_id: source.id,
              start_time: end,
              end_time: hEnd,
              is_strikethrough: isStrikeAction,
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

        let insertedIds: string[] = [];
        if (toInsert.length > 0) {
          const { data: inserted } = await supabase
            .from("highlights")
            .insert(toInsert)
            .select();
          if (inserted) insertedIds = inserted.map((i) => i.id);
        }

        await refreshHighlights();
        toast.info(
          isStrikeAction ? "Strikethroughs removed" : "Highlights cleared",
        );

        pushToUndo(
          isStrikeAction ? "Clear Strikethrough" : "Clear Highlight",
          async () => {
            // 1. Delete anything that was inserted
            if (insertedIds.length > 0) {
              await supabase.from("highlights").delete().in("id", insertedIds);
            }
            // 2. Restore updated and deleted records from snapshot
            for (const item of snapshot) {
              const { higherkeys, ...rest } = item;
              await supabase.from("highlights").upsert(rest);
              // NOTE: Database triggers will naturally recreate the mirrors
              // but we might lose custom Context Key assignments if we don't restore them.
              // However, since we are usually "cleaning" context-less highlights or specific intervals,
              // it's safer to let the triggers handle the symmetry and user manually re-adds to folders.
            }
            await refreshHighlights();
          },
        );
      }
    },
    [
      source,
      highlights,
      supabase,
      location,
      refreshHighlights,
      pushToUndo,
      rootKeyId,
    ],
  );

  const handleExitToDashboard = useCallback(() => {
    setShowExitConfirmation(false);
    const targetUrl = backTab
      ? `/dashboard?tab=${backTab}${sourceId ? `&sourceId=${sourceId}` : ""}${
          highlightId ? `&highlightId=${highlightId}` : ""
        }`
      : "/dashboard";
    router.push(targetUrl);
  }, [router, backTab, sourceId, highlightId]);

  // Synchronize state with reference for access in stable listeners
  useEffect(() => {
    stateRef.current = {
      cues,
      currentCueIndex,
      isHighlightMode,
      isStrikethroughMode,
      isCleanMode,
      isClearHighlightMode,
      showLegend,
      showSearch,
      searchQuery,
      searchResults,
      currentSearchResultIndex,
      showHighlightsList,
      focusedHighlightIndex,
      highlightListItems,
      highlightSelectionStart,
      strikethroughSelectionStart,
      cleanSelectionStart,
      clearHighlightSelectionStart,
      effectiveBlueTime,
      currentTime,
      activeFocusHighlights,
      taggingHighlightIds,
      aliasingHighlightIds,
      highlightToDelete,
      showExitConfirmation,
      exitConfirmationFocus,
      deleteConfirmationFocus,
      playbackRate,
      highlights,
      isRelativeMode,
      isHigherKeysModalOpen,
      handleAction,
      handleDeleteHighlight,
      handleStrikeLongPauses,
      handleUndo,
      handleExitToDashboard,
    };
  }, [
    cues,
    currentCueIndex,
    isHighlightMode,
    isStrikethroughMode,
    isCleanMode,
    isClearHighlightMode,
    showLegend,
    showSearch,
    searchQuery,
    searchResults,
    currentSearchResultIndex,
    showHighlightsList,
    focusedHighlightIndex,
    highlightListItems,
    highlightSelectionStart,
    strikethroughSelectionStart,
    cleanSelectionStart,
    clearHighlightSelectionStart,
    effectiveBlueTime,
    currentTime,
    activeFocusHighlights,
    taggingHighlightIds,
    aliasingHighlightIds,
    highlightToDelete,
    showExitConfirmation,
    exitConfirmationFocus,
    deleteConfirmationFocus,
    playbackRate,
    highlights,
    isRelativeMode,
    isHigherKeysModalOpen,
    handleAction,
    handleDeleteHighlight,
    handleStrikeLongPauses,
    handleUndo,
    handleExitToDashboard,
  ]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const {
        cues,
        currentCueIndex,
        isHighlightMode,
        isStrikethroughMode,
        isCleanMode,
        isClearHighlightMode,
        highlightSelectionStart,
        strikethroughSelectionStart,
        cleanSelectionStart,
        clearHighlightSelectionStart,
        effectiveBlueTime,
        currentTime,
        showLegend,
        showHighlightsList,
        focusedHighlightIndex,
        highlightListItems,
        taggingHighlightIds,
        aliasingHighlightIds,
        highlightToDelete,
        showExitConfirmation,
        exitConfirmationFocus,
        deleteConfirmationFocus,
        highlights,
        isRelativeMode,
        isHigherKeysModalOpen,
        handleAction,
        handleDeleteHighlight,
        handleStrikeLongPauses,
        handleUndo,
        handleExitToDashboard,
      } = stateRef.current;

      const isSearchInput = e.target === searchInputRef.current;
      const isInput =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement;

      // Higher Keys Modal toggle
      if (e.key === "Tab" && !isInput) {
        e.preventDefault();
        setIsHigherKeysModalOpen((prev) => !prev);
        return;
      }

      // Ignore other keys if modal is open
      if (isHigherKeysModalOpen) {
        if (e.key === "Escape") {
          e.preventDefault();
          setIsHigherKeysModalOpen(false);
          setTaggingHighlightIds([]);
          setAliasingHighlightIds([]);
        }
        return;
      }

      // Input redirection - disable shortcuts when typing
      if (isInput) {
        if (isSearchInput) {
          // Allow only Search navigation keys to fall through
          if (
            e.key === "Escape" ||
            e.key === "Enter" ||
            (e.key.toLowerCase() === "f" && e.metaKey)
          ) {
            // Fall through to Search handlers
          } else {
            return;
          }
        } else {
          return;
        }
      }

      // Handle Legend
      if (e.key === "l" || e.key === "L") {
        e.preventDefault();
        setShowLegend((prev) => !prev);
        return;
      }

      if (showExitConfirmation) {
        if (e.key === "Escape") {
          e.preventDefault();
          setShowExitConfirmation(false);
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          if (exitConfirmationFocus === "exit") {
            handleExitToDashboard();
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

      // Handle highlight deletion modal
      if (highlightToDelete) {
        if (e.key === "Escape") {
          e.preventDefault();
          setHighlightToDelete(null);
          return;
        }
        switch (e.key.toLowerCase()) {
          case "arrowleft":
            e.preventDefault();
            setDeleteConfirmationFocus("cancel");
            break;
          case "arrowright":
            e.preventDefault();
            setDeleteConfirmationFocus("delete");
            break;
          case "enter":
            e.preventDefault();
            if (deleteConfirmationFocus === "delete") {
              handleDeleteHighlight(highlightToDelete.id!);
            }
            setHighlightToDelete(null);
            break;
        }
        return;
      }

      // Handle Legend (Overrides navigation)
      if (showLegend) {
        if (e.key === "Escape") {
          e.preventDefault();
          setShowLegend(false);
        }
        return;
      }

      // Handle Highlights List Navigation
      if (showHighlightsList) {
        if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
          e.preventDefault();
          setFocusedHighlightIndex((prev) => Math.max(0, prev - 1));
          return;
        }
        if (e.key === "ArrowDown" || e.key === "ArrowRight") {
          e.preventDefault();
          setFocusedHighlightIndex((prev) =>
            Math.min(highlightListItems.length - 1, prev + 1),
          );
          return;
        }
        if (e.key === " ") {
          e.preventDefault();
          const h = highlightListItems[focusedHighlightIndex];
          if (h) {
            setSeekTo(h.start_time);
            setTimeout(() => setSeekTo(undefined), 10);
            setBlueCursorTime(h.start_time);
            setIsLocked(false);
            setShowHighlightsList(false);
          }
          return;
        }
        if (e.key === "a" || e.key === "A") {
          e.preventDefault();
          const h = highlightListItems[focusedHighlightIndex];
          if (h && h.id) setAliasingHighlightIds([h.id]);
          return;
        }
        if (e.key === "k" || e.key === "K") {
          e.preventDefault();
          const h = highlightListItems[focusedHighlightIndex];
          if (h && h.id) setTaggingHighlightIds([h.id]);
          return;
        }
        if (e.key === "Delete" || e.key === "Backspace") {
          e.preventDefault();
          const h = highlightListItems[focusedHighlightIndex];
          if (h) {
            setHighlightToDelete(h);
            setDeleteConfirmationFocus("cancel");
          }
          return;
        }
        if (
          e.key === "Escape" ||
          e.key === "f" ||
          e.key === "F" ||
          e.key === "h" ||
          e.key === "H"
        ) {
          e.preventDefault();
          setShowHighlightsList(false);
          return;
        }
        return; // Block other keys while list is open
      }

      if (taggingHighlightIds.length > 0 || aliasingHighlightIds.length > 0) {
        if (e.key === "Escape") {
          e.preventDefault();
          setTaggingHighlightIds([]);
          setAliasingHighlightIds([]);
        }
        return;
      }

      // Handle Search Navigation
      if (showSearch) {
        if (e.key === "Escape") {
          e.preventDefault();
          setShowSearch(false);
          setSearchQuery("");
          setSearchResults([]);
          setCurrentSearchResultIndex(-1);
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          if (searchResults.length > 0) {
            const nextIdx = e.shiftKey
              ? (currentSearchResultIndex - 1 + searchResults.length) %
                searchResults.length
              : (currentSearchResultIndex + 1) % searchResults.length;
            setCurrentSearchResultIndex(nextIdx);
            const targetCueIdx = searchResults[nextIdx];
            const targetTime = cues[targetCueIdx]?.startTime;
            if (targetTime !== undefined) {
              setIsLocked(false);
              setBlueCursorTime(targetTime);
            }
          }
          return;
        }

        if (isSearchInput) return;
      }

      const moveCursor = (delta: number) => {
        if (!cues || cues.length === 0) return;

        const nextIdx = Math.max(
          0,
          Math.min(cues.length - 1, currentCueIndex + delta),
        );
        const nextTime = cues[nextIdx].startTime;

        setIsLocked(false);
        setBlueCursorTime(nextTime);
      };

      const moveCursorVertical = (direction: "up" | "down") => {
        const currentEl = document.querySelector(
          `[data-cue-index="${currentCueIndex}"]`,
        ) as HTMLElement;
        if (!currentEl) {
          moveCursor(direction === "up" ? -15 : 15);
          return;
        }

        const currentRect = currentEl.getBoundingClientRect();
        const currentCenter = currentRect.left + currentRect.width / 2;

        const allCues = Array.from(
          document.querySelectorAll("[data-cue-index]"),
        ) as HTMLElement[];

        let targetCueIndex = -1;
        let bestDistance = Infinity;

        if (direction === "down") {
          const nextLineElements = allCues.filter((el) => {
            const rect = el.getBoundingClientRect();
            return rect.top >= currentRect.bottom - 1;
          });

          if (nextLineElements.length > 0) {
            const minTop = Math.min(
              ...nextLineElements.map((el) => el.getBoundingClientRect().top),
            );
            const firstLineBelow = nextLineElements.filter(
              (el) => el.getBoundingClientRect().top <= minTop + 5,
            );

            firstLineBelow.forEach((el) => {
              const rect = el.getBoundingClientRect();
              const center = rect.left + rect.width / 2;
              const dist = Math.abs(center - currentCenter);
              if (dist < bestDistance) {
                bestDistance = dist;
                targetCueIndex = parseInt(
                  el.getAttribute("data-cue-index") || "-1",
                );
              }
            });
          }
        } else {
          const prevLineElements = allCues.filter((el) => {
            const rect = el.getBoundingClientRect();
            return rect.bottom <= currentRect.top + 1;
          });

          if (prevLineElements.length > 0) {
            const maxBottom = Math.max(
              ...prevLineElements.map(
                (el) => el.getBoundingClientRect().bottom,
              ),
            );
            const firstLineAbove = prevLineElements.filter(
              (el) => el.getBoundingClientRect().bottom >= maxBottom - 5,
            );

            firstLineAbove.forEach((el) => {
              const rect = el.getBoundingClientRect();
              const center = rect.left + rect.width / 2;
              const dist = Math.abs(center - currentCenter);
              if (dist < bestDistance) {
                bestDistance = dist;
                targetCueIndex = parseInt(
                  el.getAttribute("data-cue-index") || "-1",
                );
              }
            });
          }
        }

        if (targetCueIndex !== -1) {
          const nextTime = cues[targetCueIndex]?.startTime;
          if (nextTime !== undefined) {
            setIsLocked(false);
            setBlueCursorTime(nextTime);
          }
        } else {
          moveCursor(direction === "up" ? -15 : 15);
        }
      };

      const moveCursorLineStartEnd = (direction: "start" | "end") => {
        const currentEl = document.querySelector(
          `[data-cue-index="${currentCueIndex}"]`,
        ) as HTMLElement;
        if (!currentEl) return;

        const currentRect = currentEl.getBoundingClientRect();
        const allCues = Array.from(
          document.querySelectorAll("[data-cue-index]"),
        ) as HTMLElement[];

        const sameLineCues = allCues.filter((el) => {
          const rect = el.getBoundingClientRect();
          return Math.abs(rect.top - currentRect.top) < 5;
        });

        if (sameLineCues.length > 0) {
          let targetEl;
          if (direction === "start") {
            targetEl = sameLineCues.reduce((min, el) =>
              el.getBoundingClientRect().left < min.getBoundingClientRect().left
                ? el
                : min,
            );
          } else {
            targetEl = sameLineCues.reduce((max, el) =>
              el.getBoundingClientRect().right >
              max.getBoundingClientRect().right
                ? el
                : max,
            );
          }

          if (targetEl) {
            const targetIndex = parseInt(
              targetEl.getAttribute("data-cue-index") || "-1",
            );
            if (targetIndex !== -1) {
              const nextTime = cues[targetIndex]?.startTime;
              if (nextTime !== undefined) {
                setIsLocked(false);
                setBlueCursorTime(nextTime);
              }
            }
          }
        }
      };

      switch (e.key) {
        case "z":
        case "Z":
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            handleUndo();
          }
          break;
        case " ":
          e.preventDefault();
          setIsPlaying((prev) => !prev);
          break;
        case "m":
        case "M":
          e.preventDefault();
          setIsRelativeMode((prev) => !prev);
          break;
        case "f":
        case "F":
          if (e.metaKey) {
            e.preventDefault();
            setShowSearch(true);
            searchInputRef.current?.focus();
            return;
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          moveCursorVertical("up");
          break;
        case "ArrowDown":
          e.preventDefault();
          moveCursorVertical("down");
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (e.metaKey) {
            moveCursorLineStartEnd("start");
          } else {
            moveCursor(-1);
          }
          break;
        case "ArrowRight":
          e.preventDefault();
          if (e.metaKey) {
            moveCursorLineStartEnd("end");
          } else {
            moveCursor(1);
          }
          break;
        case "q":
        case "Q":
          setSeekTo(effectiveBlueTime);
          setTimeout(() => setSeekTo(undefined), 10);
          break;
        case "e":
        case "E":
          setIsLocked(true);
          setBlueCursorTime(currentTime);
          break;
        case "1":
          e.preventDefault();
          if (isHighlightMode) {
            if (highlightSelectionStart !== null) {
              const currentCue = cues[currentCueIndex];
              const finalStart = Math.min(
                highlightSelectionStart,
                currentCue?.startTime ?? effectiveBlueTime,
              );
              const finalEnd = Math.max(
                highlightSelectionStart,
                currentCue?.endTime ?? effectiveBlueTime,
              );
              handleAction(finalStart, finalEnd, "highlight");
              setHighlightSelectionStart(null);
            }
            setIsHighlightMode(false);
          } else {
            setHighlightSelectionStart(effectiveBlueTime);
            setIsHighlightMode(true);
            setIsClearHighlightMode(false);
            setClearHighlightSelectionStart(null);
          }
          break;
        case "2":
          e.preventDefault();
          if (isRelativeMode) {
            toast.error("Strikethrough editing is disabled in Relative Mode");
            break;
          }
          if (isStrikethroughMode) {
            if (strikethroughSelectionStart !== null) {
              const currentCue = cues[currentCueIndex];
              const finalStart = Math.min(
                strikethroughSelectionStart,
                currentCue?.startTime ?? effectiveBlueTime,
              );
              const finalEnd = Math.max(
                strikethroughSelectionStart,
                currentCue?.endTime ?? effectiveBlueTime,
              );
              handleAction(finalStart, finalEnd, "strikethrough");
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
          if (isClearHighlightMode) {
            if (clearHighlightSelectionStart !== null) {
              const currentCue = cues[currentCueIndex];
              const finalStart = Math.min(
                clearHighlightSelectionStart,
                currentCue?.startTime ?? effectiveBlueTime,
              );
              const finalEnd = Math.max(
                clearHighlightSelectionStart,
                currentCue?.endTime ?? effectiveBlueTime,
              );
              handleAction(finalStart, finalEnd, "clear_highlight");
              setClearHighlightSelectionStart(null);
            }
            setIsClearHighlightMode(false);
          } else {
            setClearHighlightSelectionStart(effectiveBlueTime);
            setIsClearHighlightMode(true);
            setIsHighlightMode(false);
            setHighlightSelectionStart(null);
          }
          break;
        case "4":
          e.preventDefault();
          if (isRelativeMode) {
            toast.error("Strikethrough editing is disabled in Relative Mode");
            break;
          }
          if (isCleanMode) {
            if (cleanSelectionStart !== null) {
              const currentCue = cues[currentCueIndex];
              const finalStart = Math.min(
                cleanSelectionStart,
                currentCue?.startTime ?? effectiveBlueTime,
              );
              const finalEnd = Math.max(
                cleanSelectionStart,
                currentCue?.endTime ?? effectiveBlueTime,
              );
              handleAction(finalStart, finalEnd, "clean");
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
        case "5":
          e.preventDefault();
          handleStrikeLongPauses();
          break;
        case "~":
        case "`":
          e.preventDefault();
          setIsHighlightMode(false);
          setIsStrikethroughMode(false);
          setIsCleanMode(false);
          setIsClearHighlightMode(false);
          setHighlightSelectionStart(null);
          setStrikethroughSelectionStart(null);
          setCleanSelectionStart(null);
          setClearHighlightSelectionStart(null);
          toast.info("Selection canceled");
          break;
        case "f":
        case "F":
        case "h":
        case "H":
          setShowHighlightsList((prev) => {
            if (!prev) setFocusedHighlightIndex(0);
            return !prev;
          });
          break;
        case "t":
        case "T":
          setShowTranscript((prev) => !prev);
          break;
        case "k":
        case "K":
          if (stateRef.current.activeFocusHighlights.length > 0) {
            setTaggingHighlightIds(
              stateRef.current.activeFocusHighlights
                .map((h: any) => h.id)
                .filter(Boolean),
            );
          } else {
            toast.info("Navigate into a highlight to tag it");
          }
          break;
        case "s":
        case "S":
          e.preventDefault();
          setPlaybackRate((prev) => {
            const speeds = [1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5, 2.75, 3.0];
            const currentIndex = speeds.findIndex(
              (s) => Math.abs(s - prev) < 0.01,
            );
            const next =
              currentIndex === -1 || currentIndex === speeds.length - 1
                ? speeds[0]
                : speeds[currentIndex + 1];
            return next;
          });
          break;
        case "[":
        case "<":
          e.preventDefault();
          setPlaybackRate((prev) => {
            const next = Math.max(0.25, prev - 0.25);
            return next;
          });
          break;
        case "]":
        case ">":
          e.preventDefault();
          setPlaybackRate((prev) => {
            const next = Math.min(4.0, prev + 0.25);
            return next;
          });
          break;
        case "\\":
          e.preventDefault();
          setPlaybackRate(1.0);
          break;
        case ".": {
          e.preventDefault();
          const items = (highlights as Highlight[])
            .filter((h) => !h.is_strikethrough)
            .sort((a, b) => {
              if (a.start_time !== b.start_time)
                return a.start_time - b.start_time;
              return (a.id || "").localeCompare(b.id || "");
            });
          const next = items.find(
            (h) => h.start_time > effectiveBlueTime + 0.1,
          );
          if (next) {
            setSeekTo(next.start_time);
            setTimeout(() => setSeekTo(undefined), 10);
            setBlueCursorTime(next.start_time);
            setIsLocked(false);
          }
          break;
        }
        case ",": {
          e.preventDefault();
          const items = (highlights as Highlight[])
            .filter((h) => !h.is_strikethrough)
            .sort((a, b) => {
              if (a.start_time !== b.start_time)
                return b.start_time - a.start_time;
              return (b.id || "").localeCompare(a.id || "");
            });
          const prev = items.find(
            (h) => h.start_time < effectiveBlueTime - 0.1,
          );
          if (prev) {
            setSeekTo(prev.start_time);
            setTimeout(() => setSeekTo(undefined), 10);
            setBlueCursorTime(prev.start_time);
            setIsLocked(false);
          }
          break;
        }
        case "a":
        case "A":
          if (stateRef.current.activeFocusHighlights.length > 0) {
            setAliasingHighlightIds(
              stateRef.current.activeFocusHighlights
                .map((h: any) => h.id)
                .filter(Boolean),
            );
          } else {
            toast.info("Navigate into a highlight to alias it");
          }
          break;
        case "Delete":
        case "Backspace":
          if (stateRef.current.activeFocusHighlights.length > 0) {
            const h = stateRef.current.activeFocusHighlights[0];
            if (h) {
              setHighlightToDelete(h);
              setDeleteConfirmationFocus("cancel");
            }
          } else {
            toast.info("Navigate into a highlight to delete it");
          }
          break;
        case "Escape":
          e.preventDefault();
          if (
            isHighlightMode ||
            isStrikethroughMode ||
            isCleanMode ||
            isClearHighlightMode
          ) {
            setIsHighlightMode(false);
            setIsStrikethroughMode(false);
            setIsCleanMode(false);
            setIsClearHighlightMode(false);
            setHighlightSelectionStart(null);
            setStrikethroughSelectionStart(null);
            setCleanSelectionStart(null);
            setClearHighlightSelectionStart(null);
            toast.info("Selection canceled");
          } else if (
            isHigherKeysModalOpen ||
            showLegend ||
            showSearch ||
            showHighlightsList ||
            highlightToDelete ||
            taggingHighlightIds.length > 0 ||
            aliasingHighlightIds.length > 0
          ) {
            // Close any open overlays/modals
            setIsHigherKeysModalOpen(false);
            setShowLegend(false);
            setShowSearch(false);
            setShowHighlightsList(false);
            setHighlightToDelete(null);
            setTaggingHighlightIds([]);
            setAliasingHighlightIds([]);
          } else if (
            !isHigherKeysModalOpen &&
            !showLegend &&
            !showSearch &&
            !showHighlightsList &&
            !highlightToDelete &&
            taggingHighlightIds.length === 0 &&
            aliasingHighlightIds.length === 0 &&
            !document.querySelector('[role="dialog"]')
          ) {
            setShowExitConfirmation(true);
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hrs > 0 ? `${hrs}:` : ""}${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-black text-white">
      {/* Main Area: Highlighter */}
      <div className="flex-1 relative flex flex-col transition-all duration-300">
        <div className="flex-1 flex flex-col min-h-0">
          <VideoPlayer
            src={hlsUrl}
            playing={isPlaying}
            onTimeUpdate={setCurrentTime}
            onPlayPause={setIsPlaying}
            seekTo={seekTo}
            playbackRate={playbackRate}
          />
          <TranscriptOverlay
            cues={cues}
            currentTime={currentTime}
            blueCursorTime={effectiveBlueTime}
            highlights={highlights}
            strikethroughs={strikethroughs}
            isLocked={isLocked}
            isVisible={showTranscript}
            isRelativeMode={isRelativeMode}
            highlightSelectionRange={
              isHighlightMode && highlightSelectionStart !== null
                ? {
                    start: highlightSelectionStart,
                    end: effectiveBlueTime,
                  }
                : null
            }
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
            clearHighlightSelectionRange={
              isClearHighlightMode && clearHighlightSelectionStart !== null
                ? {
                    start: clearHighlightSelectionStart,
                    end: effectiveBlueTime,
                  }
                : null
            }
            onWordClick={(time) => {
              setIsLocked(false);
              setBlueCursorTime(time);
            }}
          />

          {/* Yellow Progress Bar */}
          <div className="h-1 w-full bg-white/5 relative z-[60] shrink-0">
            <div
              className="absolute inset-y-0 left-0 bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)] transition-all duration-300"
              style={{
                width: `${(currentTime / Math.max(1, totalDuration)) * 100}%`,
              }}
            />
            <div className="absolute -top-6 right-4 text-[10px] font-mono text-white/40">
              {formatTime(currentTime)} / {formatTime(totalDuration)}
            </div>
          </div>

          {/* Time Display Chip (Bottom Right) */}
          <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-2 pointer-events-none">
            {/* Legend Button (Yellow L) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowLegend(true);
              }}
              className="bg-yellow-400 text-black font-black text-[10px] size-6 rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-xl mb-1"
              title="Show Legend (L)"
            >
              L
            </button>

            {/* Chat Toggle Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowChat(!showChat);
              }}
              className={cn(
                "size-8 rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-xl mb-1",
                 showChat ? "bg-primary text-primary-foreground" : "bg-white/10 text-white hover:bg-white/20"
              )}
              title="Toggle Chat"
            >
              <HugeiconsIcon icon={Message01Icon} size={16} />
            </button>

            {/* Active Highlight Info */}
            {activeFocusHighlights.length > 0 && (
              <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-3xl backdrop-blur-md flex flex-col gap-2 min-w-[200px] shadow-[0_0_30px_rgba(59,130,246,0.1)] pointer-events-auto">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em]">
                    {activeFocusHighlights.length === 1
                      ? activeFocusHighlights[0].alias || "Focused Clip"
                      : `Focused Clips (${activeFocusHighlights.length})`}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTaggingHighlightIds(
                          activeFocusHighlights
                            .map((h: any) => h.id)
                            .filter(Boolean),
                        );
                      }}
                      className="p-1.5 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 text-white/60 hover:text-white transition-all shadow-xl"
                      title="Tag Highlight (K)"
                    >
                      <HugeiconsIcon icon={Tag01Icon} size={14} />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-1">
                  {(() => {
                    const visibleKeys = (
                      activeFocusHighlights[0].higherkeys || []
                    ).filter((kh: any) => {
                      // Handle both object and array forms of parent metadata
                      const parent = Array.isArray(kh.parent)
                        ? kh.parent[0]
                        : kh.parent;

                      // Determine if the parent is a custom folder or a system/source mirror
                      // Source folders have source_id set. Custom folders have neither.
                      const isCustomFolder =
                        parent && !parent.source_id && !parent.highlight_id;

                      const pathStr =
                        typeof kh.path === "string" ? kh.path : "";
                      const pathParts = pathStr.split(".");

                      // If path length is 3 (root.folder.item), only show if it's a custom folder
                      if (pathParts.length === 3 && !isCustomFolder)
                        return false;

                      // Skip root-level (Inbox) mirrors (length 2)
                      return pathParts.length > 2;
                    });

                    if (visibleKeys.length === 0) {
                      return (
                        <span className="text-[10px] text-white/20 uppercase font-medium tracking-widest py-1">
                          No Higher Keys
                        </span>
                      );
                    }

                    return visibleKeys.map((kh: any) => (
                      <div
                        key={kh.id}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/5 border border-white/5"
                      >
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            backgroundColor: kh.color || "var(--primary)",
                          }}
                        />
                        <span className="text-[10px] text-white/80 font-bold uppercase truncate max-w-[80px]">
                          #{kh.path.split(".").slice(1, -1).join("/")}
                        </span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}

            <div className="bg-black/80 border border-white/10 p-4 rounded-3xl backdrop-blur-md flex flex-col gap-3 min-w-[200px] pointer-events-none">
              {/* Playhead (Yellow) */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest">
                      Playhead
                    </span>
                    <div
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        isPlaying ? "bg-green-500 animate-pulse" : "bg-red-500",
                      )}
                    />
                    <span className="text-[9px] text-white/40 uppercase font-black">
                      {isPlaying ? "Live" : "Paused"}
                    </span>
                  </div>
                  <span className="text-[10px] text-white/40 font-mono">
                    -{formatTime(totalDuration - currentTime)}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span
                    className={cn(
                      "text-lg font-mono tracking-tighter",
                      !isRelativeMode ? "text-white" : "text-white/20",
                    )}
                  >
                    {formatTime(currentTime)}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-mono tracking-tighter",
                      isRelativeMode ? "text-white" : "text-white/20",
                    )}
                  >
                    rel {formatTime(toRelativeTime(currentTime))}
                  </span>
                </div>
              </div>

              <div className="h-px bg-white/5" />

              {/* Navigation (Blue) */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                    Navigator
                  </span>
                  <span className="text-[10px] text-white/40 font-mono">
                    -{formatTime(totalDuration - effectiveBlueTime)}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span
                    className={cn(
                      "text-lg font-mono tracking-tighter",
                      !isRelativeMode ? "text-white" : "text-white/20",
                    )}
                  >
                    {formatTime(effectiveBlueTime)}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-mono tracking-tighter",
                      isRelativeMode ? "text-white" : "text-white/20",
                    )}
                  >
                    rel {formatTime(toRelativeTime(effectiveBlueTime))}
                  </span>
                </div>
              </div>

              <div className="h-px bg-white/5" />

              {/* Speed & Total Durations */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                    Speed
                  </span>
                  <span className="text-[10px] font-mono text-white/90 font-bold">
                    {playbackRate.toFixed(2)}x
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest">
                  <span
                    className={
                      !isRelativeMode ? "text-white/60" : "text-white/20"
                    }
                  >
                    Abs {formatTime(totalDuration)}
                  </span>
                  <span
                    className={
                      isRelativeMode ? "text-white/60" : "text-white/20"
                    }
                  >
                    Rel {formatTime(relativeDuration)}
                  </span>
                </div>
              </div>
            </div>

        {showChat && (
            <div className="absolute top-4 right-20 z-[70] w-80 animate-in slide-in-from-right-4 fade-in duration-200">
                <ChatThread 
                    submissionId={submissionId || null} 
                    className="bg-black/90 border-white/10 backdrop-blur-md shadow-2xl" 
                />
            </div>
        )}
          </div>
        </div>

        {/* Legend Modal */}
        {showSearch && (
          <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[110] w-full max-w-md px-4">
            <div className="bg-zinc-950 border border-white/10 p-2 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md">
              <div className="pl-3 text-white/40">
                <HugeiconsIcon icon={Search01Icon} size={18} />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Find in transcript..."
                className="bg-transparent border-none outline-none text-white text-sm w-full py-1.5 focus:ring-0"
              />
              {searchResults.length > 0 && (
                <div className="flex items-center gap-3 pr-2 shrink-0">
                  <span className="text-[10px] text-white/40 font-mono uppercase tracking-widest">
                    {currentSearchResultIndex + 1} / {searchResults.length}
                  </span>
                  <div className="h-4 w-px bg-white/10" />
                  <div className="flex items-center gap-1">
                    <kbd className="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-[10px] text-white/60 font-mono">
                      ⏎
                    </kbd>
                    <kbd className="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-[10px] text-white/60 font-mono">
                      ⇧⏎
                    </kbd>
                  </div>
                </div>
              )}
              {searchQuery && searchResults.length === 0 && (
                <div className="pr-4 shrink-0">
                  <span className="text-[10px] text-red-400 font-bold uppercase tracking-widest">
                    No results
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {showLegend && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md px-4"
            onClick={() => setShowLegend(false)}
          >
            <div
              className="bg-zinc-950 border border-white/10 p-6 rounded-3xl max-w-2xl w-full shadow-2xl space-y-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white/90 tracking-tight">
                  Shortcuts
                </h2>
                <button
                  onClick={() => setShowLegend(false)}
                  className="text-white/40 hover:text-white transition-colors p-1"
                >
                  <div className="w-5 h-5 flex items-center justify-center text-xl">
                    ×
                  </div>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                {[
                  ["Space", "Play / Pause"],
                  ["⌘ + Z", "Undo"],
                  ["M", "Toggle Mode (Abs/Rel)"],
                  ["Arrows", "Navigate"],
                  ["⌘ + ←/→", "Jump Start/End"],
                  ["⌘ + F", "Find"],
                  ["Q", "Video → Cursor"],
                  ["E", "Cursor → Video"],
                  ["S", "Cycle Speed"],
                  ["1", "Highlight"],
                  ["2", "Strikethrough"],
                  ["3", "Clear Highlight"],
                  ["4", "Clear Strike"],
                  ["5", "Strike Pauses"],
                  ["~ / Esc", "Cancel Selection"],
                  ["< / >", "Playback Speed"],
                  ["Tab", "Switch Column"],
                  ["[", "Minimize Left"],
                  ["\\", "Reset Speed (1x)"],
                  [", / .", "Scene Skip"],
                  ["T", "Toggle Text"],
                  ["I", "Profile Menu"],
                  ["L", "Legend"],
                  ["F / H", "Highlights List"],
                  ["K", "Tag Highlight"],
                  ["D / K", "Done Tagging"],
                  ["A", "Alias Highlight"],
                  ["Delete", "Delete Highlight"],
                  ["Esc", "Back to Dashboard"],
                ].map(([key, desc]) => (
                  <div
                    key={key}
                    className="flex justify-between items-center group"
                  >
                    <span className="text-xs font-medium text-white/60 group-hover:text-white/80 transition-colors">
                      {desc}
                    </span>
                    <div className="flex items-center gap-1">
                      <kbd className="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded flex items-center justify-center min-w-[2.5rem] text-[10px] text-white/90 font-mono shadow-inner">
                        {key}
                      </kbd>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-5 border-t border-white/10">
                <div className="bg-white/[0.03] rounded-2xl p-4 space-y-3 border border-white/5">
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.1em]">
                    Mode Logic
                  </p>
                  <div className="space-y-2 text-[11px]">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                      <span className="text-white/60">
                        <span className="text-white font-medium">
                          Highlight
                        </span>{" "}
                        (1) /{" "}
                        <span className="text-white font-medium">Clear</span>{" "}
                        (3)
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                      <span className="text-white/60">
                        <span className="text-white font-medium">Strike</span>{" "}
                        (2, 5) /{" "}
                        <span className="text-white font-medium">Clear</span>{" "}
                        (4)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Highlights List Modal */}
        {showHighlightsList && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md px-4"
            onClick={() => setShowHighlightsList(false)}
          >
            <div
              className="bg-zinc-950 border border-white/10 p-6 rounded-3xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[80vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-baseline gap-3">
                  <h2 className="text-xl font-bold text-white/90 tracking-tight">
                    Highlights
                  </h2>
                  <span className="text-xs text-white/40 font-medium uppercase tracking-widest">
                    {highlightListItems.length} CLIPS
                  </span>
                </div>
                <button
                  onClick={() => setShowHighlightsList(false)}
                  className="text-white/40 hover:text-white transition-colors p-1"
                >
                  <div className="w-5 h-5 flex items-center justify-center text-xl">
                    ×
                  </div>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {highlightListItems.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-white/20 text-sm font-medium italic">
                      No highlights recorded yet.
                    </p>
                    <p className="text-white/10 text-[10px] uppercase tracking-widest mt-2">
                      Press{" "}
                      <kbd className="bg-white/5 px-1 rounded mx-1">1</kbd> to
                      start tagging.
                    </p>
                  </div>
                ) : (
                  highlightListItems.map((h, idx) => (
                    <div
                      key={h.id || idx}
                      ref={(el) => {
                        highlightRefs.current[idx] = el;
                      }}
                      onMouseEnter={() => setFocusedHighlightIndex(idx)}
                      onClick={() => {
                        setSeekTo(h.start_time);
                        setTimeout(() => setSeekTo(undefined), 10);
                        setBlueCursorTime(h.start_time);
                        setIsLocked(false);
                        setShowHighlightsList(false);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between p-4 rounded-2xl border transition-all group text-left cursor-pointer",
                        focusedHighlightIndex === idx
                          ? "bg-white/10 border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.05)]"
                          : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10",
                      )}
                      draggable
                      onDragStart={(e) => {
                        if (h.id) {
                          e.dataTransfer.setData("highlightId", h.id);
                        }
                      }}
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-white/90 font-bold tracking-tight">
                            {h.alias || "Untitled Clip"}
                          </span>
                          <div className="w-1 h-1 rounded-full bg-white/20" />
                          <span className="text-white/40 font-mono text-[10px]">
                            {formatTime(h.start_time)} -{" "}
                            {formatTime(h.end_time)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-[10px] text-white/40 uppercase font-medium tracking-widest">
                            {isRelativeMode
                              ? "Relative Duration"
                              : "Full Duration"}
                          </div>
                          {h.higherkeys && h.higherkeys.length > 0 && (
                            <div className="flex items-center gap-1">
                              <div className="w-1 h-1 rounded-full bg-white/10" />
                              {h.higherkeys
                                .filter((kh: any) => {
                                  // Handle both object and array forms of parent metadata
                                  const parent = Array.isArray(kh.parent)
                                    ? kh.parent[0]
                                    : kh.parent;

                                  // Skip implicit Shadow Keys
                                  const matchesSource =
                                    parent?.source_id === h.source_id ||
                                    parent?.source_id === (h as any).sourceId;

                                  const isShadowKey =
                                    matchesSource && !parent?.highlight_id;

                                  return !isShadowKey;
                                })
                                .map((kh: any) => (
                                  <div
                                    key={kh.id}
                                    className="w-1.5 h-1.5 rounded-full"
                                    style={{
                                      backgroundColor:
                                        kh.color || "var(--primary)",
                                    }}
                                    title={kh.name}
                                  />
                                ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (h.id) setAliasingHighlightIds([h.id]);
                            }}
                            className="p-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-white/40 hover:text-white transition-all"
                            title="Alias Highlight (A)"
                          >
                            <span className="text-[10px] font-bold px-0.5">
                              A
                            </span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (h.id) setTaggingHighlightIds([h.id]);
                            }}
                            className="p-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-white/40 hover:text-white transition-all"
                            title="Tag Highlight (K)"
                          >
                            <HugeiconsIcon icon={Tag01Icon} size={16} />
                          </button>
                        </div>

                        {h.strikeCount > 0 && (
                          <div className="bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full flex items-center gap-1.5">
                            <div className="w-1 h-1 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                            <span className="text-[10px] font-bold text-red-500/80 font-mono">
                              {h.strikeCount}
                            </span>
                          </div>
                        )}
                        <div className="flex flex-col items-end">
                          <span className="text-xl font-mono text-white/90 group-hover:text-green-400 transition-colors">
                            {formatTime(
                              isRelativeMode
                                ? h.relativeDuration
                                : h.absoluteDuration,
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-6 text-[10px] font-medium text-white/30 uppercase tracking-[0.2em]">
                <div className="flex items-center gap-2">
                  <kbd className="bg-white/5 border border-white/10 px-1 rounded text-white/60">
                    ↑/↓
                  </kbd>
                  <span>Navigate</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="bg-white/5 border border-white/10 px-1 rounded text-white/60">
                    Space
                  </kbd>
                  <span>Select & Seek</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="bg-white/5 border border-white/10 px-1 rounded text-white/60">
                    A
                  </kbd>
                  <span>Alias</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="bg-white/5 border border-white/10 px-1 rounded text-white/60">
                    K
                  </kbd>
                  <span>Tag</span>
                </div>
                <div className="flex items-center gap-2">
                  <kbd className="bg-white/5 border border-white/10 px-1 rounded text-white/60">
                    D
                  </kbd>
                  <span>Delete</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <HighlightAliaser
          open={aliasingHighlightIds.length > 0}
          onOpenChange={(open) => !open && setAliasingHighlightIds([])}
          highlightIds={aliasingHighlightIds}
          onSuccess={refreshHighlights}
        />

        <AlertDialog
          open={!!highlightToDelete}
          onOpenChange={(open) => !open && setHighlightToDelete(null)}
        >
          <AlertDialogContent className="bg-background/95 backdrop-blur-md border border-white/10 shadow-2xl p-0 overflow-hidden sm:max-w-md">
            <AlertDialogHeader className="p-6 text-left sm:text-left">
              <AlertDialogTitle className="text-xl font-bold uppercase tracking-widest text-primary">
                Delete Highlight
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground mt-2">
                Are you sure you want to delete this highlight? This action
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="p-6 bg-white/5 border-t border-white/5 m-0 sm:justify-end gap-3 rounded-none">
              <AlertDialogCancel
                className={cn(
                  "bg-transparent border-white/10 hover:bg-white/5 text-foreground uppercase tracking-widest text-[10px] h-9 px-4",
                  deleteConfirmationFocus === "cancel" &&
                    "ring-2 ring-primary ring-offset-2 bg-muted transition-all",
                )}
                onClick={() => setHighlightToDelete(null)}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (highlightToDelete && highlightToDelete.id) {
                    handleDeleteHighlight(highlightToDelete.id);
                    setHighlightToDelete(null);
                  }
                }}
                className={cn(
                  "bg-destructive text-white uppercase tracking-widest text-[10px] h-9 px-4 border-0",
                  deleteConfirmationFocus === "delete" &&
                    "ring-2 ring-destructive ring-offset-2 bg-destructive/90 transition-all scale-105",
                )}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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
                Are you sure you want to leave the highlighter and return to the
                dashboard? Any unsaved edits will be lost.
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
                onClick={handleExitToDashboard}
              >
                Exit to Dashboard
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <HigherKeyEditor
          user={user}
          profile={profile}
          onRefresh={refreshHighlights}
          mode="modal"
          open={isHigherKeysModalOpen}
          onOpenChange={setIsHigherKeysModalOpen}
          isFocused={isHigherKeysModalOpen}
          refreshKey={editorRefreshKey}
          taggingIds={taggingHighlightIds}
          onTaggingComplete={() => {
            setTaggingHighlightIds([]);
            setIsHigherKeysModalOpen(false);
          }}
        />
      </div>
    </div>
  );
};
