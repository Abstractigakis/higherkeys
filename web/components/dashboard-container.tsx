"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { User } from "@supabase/supabase-js";
import { Tables } from "@/types/supabase";
import { HighlightAliaser } from "./highlighter/highlight-aliaser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Tags, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { HigherKeyEditor } from "./higherkeys/higher-key-editor";
import { SourceItem } from "./dashboard/source-item";
import { HighlightItem } from "./dashboard/highlight-item";
import { KeyboardLegend } from "./dashboard/keyboard-legend";
import { DownloadModal } from "./dashboard/download-modal";
import { useDashboardData } from "./dashboard/hooks/use-dashboard-data";
import { useDashboardShortcuts } from "./dashboard/hooks/use-dashboard-shortcuts";
import { useDashboardActions } from "./dashboard/hooks/use-dashboard-actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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

type HighlightWithHigherKeys = Tables<"highlights"> & {
  alias?: string | null;
  higherkeys: (Tables<"higherkeys"> & {
    path?: string | any;
    parent?: {
      source_id: string | null;
      highlight_id: string | null;
      name: string;
    } | null;
  })[];
};

type SourceWithHighlights = Tables<"sources"> & {
  highlights: HighlightWithHigherKeys[];
  thumbnail_url?: string | null;
  status: string;
};

type DashboardContainerProps = {
  initialSources: SourceWithHighlights[];
  initialKeys: Tables<"higherkeys">[];
  user: User;
  profile: Tables<"profiles">;
};

export function DashboardContainer({
  initialSources,
  initialKeys,
  user,
  profile,
}: DashboardContainerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  // State Management
  const [sourceSearchQuery, setSourceSearchQuery] = useState("");
  const [selectedKeyId, setSelectedKeyId] = useState<string>("all");
  const [activeSourceIndex, setActiveSourceIndex] = useState(0);
  const [activeHighlightIndex, setActiveHighlightIndex] = useState(-1);
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [isKeyFilterModalOpen, setIsKeyFilterModalOpen] = useState(false);
  const [isSourceSearchModalOpen, setIsSourceSearchModalOpen] = useState(false);
  const [isHigherKeysModalOpen, setIsHigherKeysModalOpen] = useState(false);
  const [isKeyManagerModalOpen, setIsKeyManagerModalOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [taggingHighlightIds, setTaggingHighlightIds] = useState<string[]>([]);
  const [aliasingHighlightIds, setAliasingHighlightIds] = useState<string[]>(
    [],
  );

  useEffect(() => {
    if (taggingHighlightIds.length > 0) {
      setIsHigherKeysModalOpen(true);
    }
  }, [taggingHighlightIds.length]);

  const [sourceToDelete, setSourceToDelete] =
    useState<SourceWithHighlights | null>(null);
  const [highlightToDelete, setHighlightToDelete] =
    useState<Tables<"highlights"> | null>(null);
  const [deleteConfirmationFocus, setDeleteConfirmationFocus] = useState<
    "cancel" | "delete"
  >("cancel");

  // Custom Hooks
  const {
    filteredSources,
    allHigherKeys,
    isSearchLoading,
    refreshSources,
    sources,
  } = useDashboardData(
    supabase,
    user,
    initialSources,
    initialKeys,
    sourceSearchQuery,
    selectedKeyId,
  );

  const { handleDeleteSource, handleDeleteHighlight } = useDashboardActions(
    supabase,
    sources,
    allHigherKeys,
    selectedKeyId,
  );

  const clearAllFilters = useCallback(() => {
    setSourceSearchQuery("");
    setSelectedKeyId("all");
  }, []);

  const isModalsOpen =
    isHigherKeysModalOpen ||
    taggingHighlightIds.length > 0 ||
    aliasingHighlightIds.length > 0 ||
    isKeyFilterModalOpen ||
    isSourceSearchModalOpen ||
    isKeyManagerModalOpen ||
    isDownloadModalOpen ||
    !!sourceToDelete || 
    !!highlightToDelete;

  const safeSourceIndex = Math.min(
    activeSourceIndex,
    Math.max(0, filteredSources.length - 1),
  );

  useDashboardShortcuts({
    filteredSources,
    allHigherKeys,
    safeSourceIndex,
    activeHighlightIndex,
    setActiveSourceIndex,
    setActiveHighlightIndex,
    setIsLegendOpen,
    setIsKeyFilterModalOpen,
    setIsSourceSearchModalOpen,
    setTaggingHighlightIds,
    setAliasingHighlightIds,
    setIsKeyManagerModalOpen,
    setIsHigherKeysModalOpen,
    setIsDownloadModalOpen,
    sourceToDelete,
    setSourceToDelete,
    highlightToDelete,
    setHighlightToDelete,
    deleteConfirmationFocus,
    setDeleteConfirmationFocus,
    handleDeleteSource,
    clearAllFilters,
    isModalsOpen,
    isFocused: true,
    onTab: () => setIsHigherKeysModalOpen((prev) => !prev),
  });

  // Refs & Layout Effects
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sourceId = searchParams.get("sourceId");
    if (sourceId) {
      const index = filteredSources.findIndex((s) => s.id === sourceId);
      if (index !== -1) {
        const timeoutId = setTimeout(() => setActiveSourceIndex(index), 0);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [searchParams, filteredSources]);

  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center",
      });
    }
  }, [safeSourceIndex, activeHighlightIndex]);

  const selectedKeyName = useMemo(() => {
    if (selectedKeyId === "all") return null;
    return allHigherKeys.find((k) => k.id === selectedKeyId)?.name;
  }, [selectedKeyId, allHigherKeys]);
  


  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Main Column: Sources List */}
      <div className="flex-1 flex flex-col gap-6 p-4 sm:p-8 overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between px-1 pb-2">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
            Sources
          </h2>
          {(sourceSearchQuery || selectedKeyId !== "all") && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-300">
              <div className="flex items-center -space-x-px">
                {sourceSearchQuery && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 border border-primary/20 first:rounded-l-md last:rounded-r-md">
                    <span className="text-[9px] font-black uppercase tracking-widest text-primary/40">
                      SRC:
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-primary/80">
                      {sourceSearchQuery}
                    </span>
                    <button
                      onClick={() => setSourceSearchQuery("")}
                      className="p-0.5 hover:bg-primary/20 rounded ml-0.5"
                    >
                      <X className="size-2.5 text-primary" />
                    </button>
                  </div>
                )}
                {selectedKeyId !== "all" && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/20 border border-primary/30 first:rounded-l-md last:rounded-r-md">
                    <Tags className="size-2.5 text-primary/70" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-primary">
                      {selectedKeyName}
                    </span>
                    <button
                      onClick={() => setSelectedKeyId("all")}
                      className="p-0.5 hover:bg-primary/30 rounded ml-0.5"
                    >
                      <X className="size-2.5 text-primary" />
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={clearAllFilters}
                className="px-2 py-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
              >
                Clear All
              </button>
            </div>
          )}
        </div>

        {/* Main Neural Grid */}
        <div 
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 pb-20" 
          ref={scrollContainerRef}
        >
          {filteredSources.map((source, sIndex) => (
            <div
              key={source.id}
              className={cn(
                "animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-backwards",
              )}
              style={{ animationDelay: `${sIndex * 50}ms` }}
            >
              <SourceItem
                source={source}
                isActive={sIndex === safeSourceIndex}
                onClick={() => {
                  setActiveSourceIndex(sIndex);
                  // Navigation is handled inside SourceItem now via Link, 
                  // but we keep state up to date for keyboard nav if needed
                }}
                activeItemRef={
                  sIndex === safeSourceIndex ? activeItemRef : { current: null }
                }
              />
            </div>
          ))}
        </div>
      </div>

      {/* Modals & Dialogs */}
      <HigherKeyEditor
        user={user}
        profile={profile}
        onRefresh={refreshSources}
        mode="modal"
        open={isHigherKeysModalOpen}
        onOpenChange={setIsHigherKeysModalOpen}
        sources={sources}
        isFocused={isHigherKeysModalOpen}
        taggingIds={taggingHighlightIds}
        onTaggingComplete={() => {
          setTaggingHighlightIds([]);
          setIsHigherKeysModalOpen(false);
        }}
      />

      <HighlightAliaser
        open={aliasingHighlightIds.length > 0}
        onOpenChange={(open) => !open && setAliasingHighlightIds([])}
        highlightIds={aliasingHighlightIds}
        onSuccess={router.refresh}
      />
      <KeyboardLegend
        isOpen={isLegendOpen}
        onOpenChange={setIsLegendOpen}
        hasDeleteTarget={!!sourceToDelete || !!highlightToDelete}
      />
      <DownloadModal open={isDownloadModalOpen} onOpenChange={setIsDownloadModalOpen} />

      {/* Search Modal */}
      <Dialog
        open={isSourceSearchModalOpen}
        onOpenChange={setIsSourceSearchModalOpen}
      >
        <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-md border border-white/10 shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2 border-b border-white/5">
            <DialogTitle className="text-xl font-bold uppercase tracking-widest text-primary flex items-center gap-2">
              <Search
                className={cn("size-5", isSearchLoading && "animate-pulse")}
              />{" "}
              Search Sources
            </DialogTitle>
          </DialogHeader>
          <div className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/50" />
              <Input
                autoFocus
                placeholder="Type to filter sources..."
                value={sourceSearchQuery}
                onChange={(e) => {
                  setSourceSearchQuery(e.target.value);
                  setActiveSourceIndex(0);
                }}
                className="pl-10 bg-white/5 border-white/10 h-11"
              />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              {(sourceSearchQuery || selectedKeyId !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-[10px] uppercase font-bold tracking-widest text-primary"
                >
                  Reset All
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSourceSearchModalOpen(false)}
                className="text-[10px] uppercase font-bold tracking-widest opacity-50"
              >
                Close (ESC)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialogs */}
      <AlertDialog
        open={!!sourceToDelete}
        onOpenChange={(open) => !open && setSourceToDelete(null)}
      >
        <AlertDialogContent className="bg-background/95 backdrop-blur-md border border-white/10 shadow-2xl p-0 overflow-hidden sm:max-w-md">
          <AlertDialogHeader className="p-6">
            <AlertDialogTitle>Delete Source</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{sourceToDelete?.title}
              &quot;? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="p-6 bg-white/5 border-t border-white/5 sm:justify-end gap-3 rounded-none">
            <AlertDialogCancel
              className={cn(
                "bg-transparent border-white/10",
                deleteConfirmationFocus === "cancel" && "ring-2 ring-primary",
              )}
              onClick={() => setSourceToDelete(null)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className={cn(
                "bg-destructive",
                deleteConfirmationFocus === "delete" &&
                  "ring-2 ring-destructive",
              )}
              onClick={() =>
                sourceToDelete && handleDeleteSource(sourceToDelete.id)
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!highlightToDelete}
        onOpenChange={(open) => !open && setHighlightToDelete(null)}
      >
        <AlertDialogContent className="bg-background/95 backdrop-blur-md border border-white/10 shadow-2xl p-0 overflow-hidden sm:max-w-md">
          <AlertDialogHeader className="p-6">
            <AlertDialogTitle>
              {selectedKeyId !== "all" ? "Untag Highlight" : "Delete Highlight"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedKeyId !== "all"
                ? `Remove from filter "${selectedKeyName}"?`
                : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="p-6 bg-white/5 border-t border-white/5 sm:justify-end gap-3 rounded-none">
            <AlertDialogCancel
              className={cn(
                "bg-transparent border-white/10",
                deleteConfirmationFocus === "cancel" && "ring-2 ring-primary",
              )}
              onClick={() => setHighlightToDelete(null)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className={cn(
                "bg-destructive",
                deleteConfirmationFocus === "delete" &&
                  "ring-2 ring-destructive",
              )}
              onClick={() =>
                highlightToDelete && handleDeleteHighlight(highlightToDelete.id)
              }
            >
              {selectedKeyId !== "all" ? "Remove" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Key Filter Modal */}
      <Dialog
        open={isKeyFilterModalOpen}
        onOpenChange={setIsKeyFilterModalOpen}
      >
        <DialogContent className="max-w-2xl bg-card/95 backdrop-blur-xl border-white/10 p-0 overflow-hidden shadow-2xl">
          <Command className="bg-transparent border-none">
            <div className="p-6 border-b border-white/5 bg-background/50">
              <DialogTitle className="text-lg font-bold flex items-center gap-2 mb-4">
                <Tags className="size-5 text-primary" /> Higher Key Search
              </DialogTitle>
              <CommandInput
                placeholder="Search Higher Keys..."
                className="text-lg h-12"
              />
            </div>
            <CommandList className="p-2 max-h-100">
              <CommandEmpty className="py-12 text-center text-muted-foreground">
                No Higher Keys found.
              </CommandEmpty>
              <CommandGroup heading="Available Keys">
                <CommandItem
                  onSelect={() => {
                    setSelectedKeyId("all");
                    setIsKeyFilterModalOpen(false);
                  }}
                  className="flex items-center justify-between py-3 px-4 rounded-xl cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Tags className="size-4 text-muted-foreground" />
                    <span className="text-base font-medium">
                      All Higher Keys
                    </span>
                  </div>
                  {selectedKeyId === "all" && (
                    <Check className="size-4 text-primary" />
                  )}
                </CommandItem>
                {allHigherKeys.map((key) => (
                  <CommandItem
                    key={key.id}
                    onSelect={() => {
                      setSelectedKeyId(key.id);
                      setIsKeyFilterModalOpen(false);
                    }}
                    className="flex items-center justify-between py-3 px-4 rounded-xl cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-2 rounded-full border border-primary/50" />
                      <span className="text-base font-medium">{key.name}</span>
                    </div>
                    {selectedKeyId === key.id && (
                      <Check className="size-4 text-primary" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>

      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsLegendOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-full bg-background/80 backdrop-blur-md border border-white/10 text-muted-foreground hover:text-primary transition-all shadow-xl"
        >
          <kbd className="text-[10px] font-mono font-bold bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
            L
          </kbd>
          <span className="text-[10px] font-bold uppercase tracking-widest">
            L for Legend
          </span>
        </button>
      </div>
    </div>
  );
}
