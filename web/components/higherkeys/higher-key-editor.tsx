"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  FolderIcon,
  ChevronRightIcon,
  Loader2Icon,
  ArrowLeftIcon,
  VideoIcon,
  PlayIcon,
  Keyboard,
  X,
  CheckIcon,
  PlusIcon,
} from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  cn,
  getVideoThumbnailUrl,
  calculateRelativeDuration,
  formatDuration,
} from "@/lib/utils";
import { useLocation } from "@/components/location-guard";
import { HigherKey } from "@/types/higher-keys";
import { Tables } from "@/types/supabase";
import Image from "next/image";
import { useRouter } from "next/navigation";

type HighlightWithHigherKeys = Tables<"highlights"> & {
  relativeDuration?: number;
};

type SourceWithHighlights = Tables<"sources"> & {
  highlights: HighlightWithHigherKeys[];
  thumbnail_url?: string | null;
  status: string;
};

interface HigherKeyEditorProps {
  user: User;
  profile: Tables<"profiles">;
  onRefresh?: () => Promise<void>;

  // Selection/Tagging
  onSelect?: (node: HigherKey) => void;
  assignedIds?: string[];

  // Data
  sources?: SourceWithHighlights[];

  // Layout mode
  mode?: "inline" | "modal";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: string;
  isFocused?: boolean;
  refreshKey?: number;

  // Inline Tagging Mode
  taggingIds?: string[];
  onTaggingComplete?: () => void;
}

const EMPTY_ARRAY: any[] = [];

export function HigherKeyEditor({
  user,
  profile,
  onRefresh,
  onSelect,
  assignedIds: propAssignedIds = EMPTY_ARRAY,
  sources: propSources,
  mode = "inline",
  open,
  onOpenChange,
  title = "Higher Keys",
  isFocused = true,
  refreshKey,
  taggingIds = EMPTY_ARRAY,
  onTaggingComplete,
}: HigherKeyEditorProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { location } = useLocation();

  const [allKeys, setAllKeys] = useState<HigherKey[]>([]);
  const [internalSources, setInternalSources] = useState<
    SourceWithHighlights[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);
  const [hasInitializedRoot, setHasInitializedRoot] = useState(false);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Move mode states
  const [movingNodeId, setMovingNodeId] = useState<string | null>(null);
  const [movingHighlightId, setMovingHighlightId] = useState<string | null>(
    null,
  );
  const [movingFromKeyId, setMovingFromKeyId] = useState<string | null>(null);
  const [isCopying, setIsCopying] = useState(false);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Action states
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [actionValue, setActionValue] = useState("");
  const [nodeToDelete, setNodeToDelete] = useState<HigherKey | null>(null);
  const [highlightToRemove, setHighlightToRemove] = useState<HigherKey | null>(
    null,
  );
  const [showLegend, setShowLegend] = useState(false);

  // Local tagging state replaced by prop
  const [localAssignedIds, setLocalAssignedIds] = useState<string[]>([]);

  // Optimistic UI state
  const [optimisticKeys, setOptimisticKeys] = useState<HigherKey[] | null>(
    null,
  );

  const sources = propSources || internalSources;

  useEffect(() => {
    const fetchAssigned = async () => {
      if (taggingIds.length === 0) {
        setLocalAssignedIds((prev) => (prev.length === 0 ? prev : EMPTY_ARRAY));
        return;
      }

      const { data, error } = await supabase
        .from("higherkeys")
        .select("parent_id")
        .in("highlight_id", taggingIds);

      if (!error && data) {
        const uniqueIds = Array.from(
          new Set(data.map((a: any) => a.parent_id).filter(Boolean)),
        ) as string[];

        setLocalAssignedIds((prev) => {
          if (
            prev.length === uniqueIds.length &&
            uniqueIds.every((id) => prev.includes(id))
          ) {
            return prev;
          }
          return uniqueIds;
        });
      }
    };
    fetchAssigned();
  }, [taggingIds, supabase]);

  const fetchAllKeys = useCallback(
    async (silent: boolean = false) => {
      if (!silent) setLoading(true);
      const { data: keysData, error: keysError } = await supabase
        .from("higherkeys")
        .select("*")
        .order("order_index", { ascending: true });

      if (keysError) {
        toast.error(keysError.message);
      } else if (keysData) {
        setAllKeys(keysData as HigherKey[]);
      }

      if (!propSources && (mode === "inline" || open)) {
        const { data: sData, error: sError } = await supabase
          .from("sources")
          .select("*, highlights(*)")
          .eq("profile_id", user.id)
          .order("created_at", { ascending: false });

        if (sError) console.error(sError);
        else if (sData) setInternalSources(sData as SourceWithHighlights[]);
      }

      setLoading(false);
    },
    [supabase, propSources, user.id, mode, open, refreshKey],
  );

  const handleToggleTag = useCallback(
    async (key: HigherKey) => {
      if (isSourceKey(key.id) || isShadowKey(key.id)) {
        toast.error(
          "Deterministic media mirrors cannot be used as manual tagging targets",
        );
        return;
      }
      const idsToTag = taggingIds;
      if (idsToTag.length === 0) return;

      const isCurrentlyAssigned = localAssignedIds.includes(key.id);

      try {
        if (isCurrentlyAssigned) {
          const { error } = await supabase
            .from("higherkeys")
            .delete()
            .in("highlight_id", idsToTag)
            .eq("parent_id", key.id);

          if (error) throw error;
          setLocalAssignedIds((prev) => prev.filter((id) => id !== key.id));
          toast.success(`Removed tag: ${key.name}`);
        } else {
          // Fetch highlights to get source_ids
          const { data: hls, error: fetchError } = await supabase
            .from("highlights")
            .select("id, source_id, alias")
            .in("id", idsToTag);

          if (fetchError) throw fetchError;

          const inserts = hls.map((hl) => ({
            highlight_id: hl.id,
            parent_id: key.id,
            profile_id: user.id,
            source_id: hl.source_id,
            name: hl.alias || "Highlight",
            latitude: location?.lat,
            longitude: location?.lng,
          }));

          const { error } = await supabase.from("higherkeys").insert(inserts);
          if (error) throw error;

          setLocalAssignedIds((prev) => [...prev, key.id]);
          toast.success(`Added tag: ${key.name}`);
        }
        if (onRefresh) await onRefresh();
        else fetchAllKeys(true);
      } catch (err: any) {
        toast.error(err.message);
      }
    },
    [
      taggingIds,
      localAssignedIds,
      supabase,
      user.id,
      location,
      onRefresh,
      fetchAllKeys,
    ],
  );

  useEffect(() => {
    if (mode === "inline" || (mode === "modal" && open)) {
      fetchAllKeys(allKeys.length > 0);
    }
  }, [fetchAllKeys, mode, open]);

  // Handle root initialization
  useEffect(() => {
    if (
      !loading &&
      allKeys.length > 0 &&
      !hasInitializedRoot &&
      currentParentId === null &&
      profile?.username
    ) {
      const rootKey = allKeys.find(
        (k) => !k.parent_id && k.name === profile.username,
      );
      if (rootKey) {
        setCurrentParentId(rootKey.id);
        setHasInitializedRoot(true);
      }
    }
  }, [
    loading,
    allKeys,
    profile?.username,
    hasInitializedRoot,
    currentParentId,
  ]);

  const taggedHighlightsMap = useMemo(() => {
    const map = new Map<
      string,
      { keyId: string; parentId: string | null; orderIndex: number }[]
    >();
    allKeys.forEach((k) => {
      if (k.highlight_id) {
        if (!map.has(k.highlight_id)) map.set(k.highlight_id, []);
        map.get(k.highlight_id)!.push({
          keyId: k.id,
          parentId: k.parent_id,
          orderIndex: k.order_index || 0,
        });
      }
    });
    return map;
  }, [allKeys]);

  const isSourceKey = useCallback(
    (keyId: string) => {
      const key = allKeys.find((k) => k.id === keyId);
      return !!(key && key.source_id && !key.highlight_id);
    },
    [allKeys],
  );

  const isShadowKey = useCallback(
    (keyId: string) => {
      const key = allKeys.find((k) => k.id === keyId);
      if (!key || !key.parent_id) return false;
      const parent = allKeys.find((p) => p.id === key.parent_id);
      return !!(parent && parent.source_id && !parent.highlight_id);
    },
    [allKeys],
  );

  // Derived data
  const currentViewKeysNodes = useMemo(() => {
    const keys = optimisticKeys || allKeys;
    return keys
      .filter((k) => k.parent_id === currentParentId)
      .sort((a, b) => {
        const diff = (a.order_index || 0) - (b.order_index || 0);
        if (diff !== 0) return diff;
        return a.id.localeCompare(b.id);
      });
  }, [allKeys, optimisticKeys, currentParentId]);

  const keyStats = useMemo(() => {
    const stats = new Map<
      string,
      { childKeys: number; totalHighlights: number; directHighlights: number }
    >();
    const keyMap = new Map(allKeys.map((k) => [k.id, k]));
    allKeys.forEach((k) =>
      stats.set(k.id, {
        childKeys: 0,
        totalHighlights: 0,
        directHighlights: 0,
      }),
    );
    allKeys.forEach((k) => {
      if (k.parent_id && stats.has(k.parent_id))
        stats.get(k.parent_id)!.childKeys++;
    });

    // Highlights are now also nodes in allKeys
    allKeys.forEach((k) => {
      if (k.highlight_id) {
        // Direct parent count
        if (k.parent_id) {
          const directStat = stats.get(k.parent_id);
          if (directStat) directStat.directHighlights++;

          let curr = keyMap.get(k.parent_id);
          while (curr) {
            const stat = stats.get(curr.id);
            if (stat) stat.totalHighlights++;
            curr = curr.parent_id ? keyMap.get(curr.parent_id) : undefined;
          }
        }
      }
    });

    return stats;
  }, [allKeys]);

  const navigableItems = useMemo(() => {
    const items: (
      | { type: "node"; id: string; node: HigherKey }
      | {
          type: "highlight";
          id: string;
          highlight: HighlightWithHigherKeys;
          source: SourceWithHighlights;
          treeKeyId: string;
          node: HigherKey;
        }
      | { type: "gap"; index: number; id: string }
    )[] = [];

    const mId = movingNodeId || movingHighlightId;

    if (mId) {
      let siblingIdx = 0;
      currentViewKeysNodes.forEach((node, i) => {
        if (node.id === mId) {
          if (node.highlight_id) {
            const source = sources.find((s) => s.id === node.source_id);
            const highlight = source?.highlights.find(
              (h) => h.id === node.highlight_id,
            );
            if (source && highlight) {
              items.push({
                type: "highlight",
                id: node.id,
                highlight: {
                  ...highlight,
                  relativeDuration: calculateRelativeDuration(
                    highlight.start_time,
                    highlight.end_time,
                    source.highlights.filter((sh) => sh.is_strikethrough),
                  ),
                },
                source,
                treeKeyId: node.id,
                node,
              });
            }
          } else {
            items.push({ type: "node", id: node.id, node });
          }
        } else {
          const isAboveMoving = i > 0 && currentViewKeysNodes[i - 1].id === mId;
          if (!isAboveMoving) {
            items.push({
              type: "gap",
              index: siblingIdx,
              id: siblingIdx.toString(),
            });
          }
          if (node.highlight_id) {
            const source = sources.find((s) => s.id === node.source_id);
            const highlight = source?.highlights.find(
              (h) => h.id === node.highlight_id,
            );
            if (source && highlight) {
              items.push({
                type: "highlight",
                id: node.id,
                highlight: {
                  ...highlight,
                  relativeDuration: calculateRelativeDuration(
                    highlight.start_time,
                    highlight.end_time,
                    source.highlights.filter((sh) => sh.is_strikethrough),
                  ),
                },
                source,
                treeKeyId: node.id,
                node,
              });
            }
          } else {
            items.push({ type: "node", id: node.id, node });
          }
          siblingIdx++;
        }
      });
      const lastKey = currentViewKeysNodes[currentViewKeysNodes.length - 1];
      if (lastKey && lastKey.id !== mId) {
        items.push({
          type: "gap",
          index: siblingIdx,
          id: siblingIdx.toString(),
        });
      }
    } else {
      let siblingIdx = 0;
      currentViewKeysNodes.forEach((node) => {
        if (node.highlight_id) {
          const source = sources.find((s) => s.id === node.source_id);
          const highlight = source?.highlights.find(
            (h) => h.id === node.highlight_id,
          );
          if (source && highlight) {
            items.push({
              type: "highlight",
              id: node.id,
              highlight: {
                ...highlight,
                relativeDuration: calculateRelativeDuration(
                  highlight.start_time,
                  highlight.end_time,
                  source.highlights.filter((sh) => sh.is_strikethrough),
                ),
              },
              source,
              treeKeyId: node.id,
              node,
            });
          }
        } else {
          items.push({ type: "node", id: node.id, node });
        }
        siblingIdx++;
      });
    }
    return items;
  }, [currentViewKeysNodes, movingNodeId, movingHighlightId, sources]);

  const breadcrumbs = useMemo(() => {
    if (!currentParentId) return [];
    const trail: HigherKey[] = [];
    let curr = allKeys.find((k) => k.id === currentParentId);
    while (curr) {
      trail.unshift(curr);
      curr = allKeys.find((k) => k.id === curr?.parent_id);
    }
    return trail;
  }, [allKeys, currentParentId]);

  const handleDrillDown = useCallback(() => {
    if (!focusedId?.startsWith("node:")) return;
    const id = focusedId.split(":")[1];
    const node = allKeys.find((k) => k.id === id);
    if (node) {
      if (movingNodeId === node.id) {
        toast.error("Cannot enter a folder while moving it");
        return;
      }
      setCurrentParentId(node.id);
      setFocusedId(null);
    }
  }, [focusedId, allKeys, movingNodeId]);

  const handleGoUp = useCallback(() => {
    if (!currentParentId) return;
    const current = allKeys.find((k) => k.id === currentParentId);

    // Don't go above the profile root
    if (current && !current.parent_id && current.name === profile?.username)
      return;

    setCurrentParentId(current?.parent_id || null);
    setFocusedId(`node:${current?.id || ""}`);
  }, [currentParentId, allKeys, profile?.username]);

  const copyFolder = useCallback(
    async (
      sourceKeyId: string,
      targetParentId: string | null,
      orderIndex?: number,
    ) => {
      const internalCopy = async (
        sId: string,
        tPId: string | null,
        oIdx?: number,
      ) => {
        const sourceKey = allKeys.find((k) => k.id === sId);
        if (!sourceKey) return;
        const { data: newKey, error: keyError } = await supabase
          .from("higherkeys")
          .insert({
            name: `${sourceKey.name} (Copy)`,
            parent_id: tPId,
            profile_id: user.id,
            order_index: oIdx ?? (sourceKey.order_index || 0),
            latitude: location?.lat,
            longitude: location?.lng,
          })
          .select()
          .single();
        if (keyError) throw keyError;
        const highlightsToCopy = allKeys.filter(
          (k) => k.parent_id === sId && k.highlight_id,
        );
        if (highlightsToCopy.length > 0) {
          await supabase.from("higherkeys").insert(
            highlightsToCopy.map((item) => ({
              name: item.name,
              highlight_id: item.highlight_id,
              source_id: item.source_id,
              parent_id: (newKey as HigherKey).id,
              profile_id: user.id,
              order_index: item.order_index,
              latitude: location?.lat,
              longitude: location?.lng,
            })),
          );
        }
        const children = allKeys.filter((k) => k.parent_id === sId);
        for (const child of children)
          await internalCopy(child.id, (newKey as HigherKey).id);
      };
      await internalCopy(sourceKeyId, targetParentId, orderIndex);
    },
    [allKeys, sources, supabase, user.id, location],
  );

  const handleCreate = useCallback(async () => {
    if (!actionValue.trim()) {
      setIsCreating(false);
      return;
    }
    if (currentParentId && isSourceKey(currentParentId)) {
      toast.error(
        "Source folders are deterministic and cannot have manual subfolders",
      );
      setIsCreating(false);
      setActionValue("");
      return;
    }
    try {
      const { data, error } = await supabase
        .from("higherkeys")
        .insert({
          name: actionValue.trim(),
          parent_id: currentParentId,
          profile_id: user.id,
          latitude: location?.lat,
          longitude: location?.lng,
        })
        .select()
        .single();
      if (error) throw error;
      setAllKeys((prev) => [...prev, data as HigherKey]);
      setFocusedId(`node:${data.id}`);
      setIsCreating(false);
      setActionValue("");
    } catch (_e) {
      console.error(_e);
      toast.error("Creation failed");
    }
  }, [actionValue, currentParentId, supabase, location, user]);

  const handleRename = useCallback(async () => {
    if (!renamingId || !actionValue.trim()) {
      setRenamingId(null);
      return;
    }
    try {
      const isInternalNode = focusedId?.startsWith("node:");
      const isInternalHighlightNode = focusedId?.startsWith("highlight:");

      if (isInternalNode) {
        const node = allKeys.find((k) => k.id === renamingId);
        const newName = actionValue.trim();

        const { error } = await supabase
          .from("higherkeys")
          .update({ name: newName })
          .eq("id", renamingId);
        if (error) throw error;

        // If this node represents a highlight (e.g. shadow key), sync the alias
        if (node?.highlight_id) {
          await supabase
            .from("highlights")
            .update({ alias: newName })
            .eq("id", node.highlight_id);
        }

        setAllKeys((prev) =>
          prev.map((k) => (k.id === renamingId ? { ...k, name: newName } : k)),
        );
      } else if (isInternalHighlightNode) {
        const node = allKeys.find((k) => k.id === renamingId);
        const highlightId = node?.highlight_id || renamingId;
        const newName = actionValue.trim();

        const { error } = await supabase
          .from("highlights")
          .update({ alias: newName })
          .eq("id", highlightId);
        if (error) throw error;

        // Sync all higherkeys that point to this highlight
        await supabase
          .from("higherkeys")
          .update({ name: newName })
          .eq("highlight_id", highlightId);

        if (onRefresh) await onRefresh();
        else fetchAllKeys(true);
      } else {
        const newName = actionValue.trim();
        const { error } = await supabase
          .from("highlights")
          .update({ alias: newName })
          .eq("id", renamingId);
        if (error) throw error;

        // Sync all higherkeys that point to this highlight
        await supabase
          .from("higherkeys")
          .update({ name: newName })
          .eq("highlight_id", renamingId);

        if (onRefresh) await onRefresh();
        else fetchAllKeys(true);
      }
      setRenamingId(null);
      setActionValue("");
    } catch (_e) {
      console.error(_e);
      toast.error("Rename failed");
    }
  }, [
    renamingId,
    actionValue,
    supabase,
    focusedId,
    onRefresh,
    fetchAllKeys,
    allKeys,
  ]);

  const handleDelete = useCallback(async () => {
    if (!nodeToDelete) return;
    try {
      const rootKey = allKeys.find(
        (k) => !k.parent_id && k.name === profile?.username,
      );

      // Recursive helper to find all descendants
      const getDescendantIds = (parentId: string): string[] => {
        const children = allKeys.filter((k) => k.parent_id === parentId);
        return [
          ...children.map((c) => c.id),
          ...children.flatMap((c) => getDescendantIds(c.id)),
        ];
      };

      const descendantIds = getDescendantIds(nodeToDelete.id);
      const affectedIds = [nodeToDelete.id, ...descendantIds];

      // Identify highlights that only exist within this branch
      const highlightsInBranch = allKeys.filter(
        (k) => k.highlight_id && affectedIds.includes(k.id),
      );

      for (const hl of highlightsInBranch) {
        const otherInstances = allKeys.filter(
          (k) =>
            k.highlight_id === hl.highlight_id && !affectedIds.includes(k.id),
        );
        if (
          otherInstances.length === 0 &&
          rootKey &&
          hl.parent_id !== rootKey.id
        ) {
          // Move to root to prevent deletion
          await supabase
            .from("higherkeys")
            .update({ parent_id: rootKey.id })
            .eq("id", hl.id);
        }
      }

      const { error } = await supabase
        .from("higherkeys")
        .delete()
        .eq("id", nodeToDelete.id);

      if (error) throw error;

      // Refresh to get consistent state
      if (onRefresh) await onRefresh();
      else fetchAllKeys(true);

      setNodeToDelete(null);
      setFocusedId(null);
      toast.success("Folder deleted");
    } catch (_e) {
      console.error(_e);
      toast.error("Delete failed");
    }
  }, [
    nodeToDelete,
    allKeys,
    profile?.username,
    supabase,
    onRefresh,
    fetchAllKeys,
  ]);

  const commitRemoveHighlight = useCallback(async () => {
    if (!highlightToRemove) return;
    try {
      // Find the root key
      const rootKey = allKeys.find(
        (k) => !k.parent_id && k.name === profile?.username,
      );

      // Check how many times this highlight is tagged
      const highlightId = highlightToRemove.highlight_id;
      const instances = allKeys.filter((k) => k.highlight_id === highlightId);

      if (instances.length <= 1) {
        // This is the last instance. Move to root instead of deleting.
        if (rootKey && highlightToRemove.parent_id !== rootKey.id) {
          const { error } = await supabase
            .from("higherkeys")
            .update({ parent_id: rootKey.id })
            .eq("id", highlightToRemove.id);

          if (error) throw error;
          toast.success("Moved to root");
          setAllKeys((prev) =>
            prev.map((k) =>
              k.id === highlightToRemove.id
                ? { ...k, parent_id: rootKey.id }
                : k,
            ),
          );
        } else {
          // Already in root or root not found - keep it here
          toast.info("Highlight preserved in root");
        }
      } else {
        // Multiple tags exist, safe to delete this specific assignment
        const { error } = await supabase
          .from("higherkeys")
          .delete()
          .eq("id", highlightToRemove.id);
        if (error) throw error;
        toast.success("Removed");
        setAllKeys((prev) => prev.filter((k) => k.id !== highlightToRemove.id));
      }

      if (onRefresh) await onRefresh();
    } catch (_e) {
      console.error(_e);
      toast.error("Action failed");
    } finally {
      setHighlightToRemove(null);
    }
  }, [highlightToRemove, allKeys, profile?.username, supabase, onRefresh]);

  const handleDeleteHighlight = useCallback(
    (hkId: string) => {
      const node = allKeys.find((k) => k.id === hkId);
      if (!node || !node.highlight_id) return;
      if (isShadowKey(node.id)) {
        toast.error(
          "Deterministic mirrors cannot be removed from their source",
        );
        return;
      }
      setHighlightToRemove(node);
    },
    [allKeys, isShadowKey],
  );

  const moveHighlight = useCallback(
    async (
      id: string, // could be highlight_id (from external) or higherkey_id (from internal)
      targetKeyId: string | null,
      orderIndex?: number,
      isInternalHk: boolean = false,
    ) => {
      try {
        if (!isInternalHk) {
          // This is a highlight_id from outside the tree
          const item = sources
            .flatMap((s) => s.highlights)
            .find((h) => h.id === id);
          if (!item) return;

          await supabase.from("higherkeys").insert({
            highlight_id: id,
            parent_id: targetKeyId,
            profile_id: user.id,
            source_id: item.source_id,
            name: item.alias || "Highlight",
            order_index: orderIndex ?? 0,
            latitude: location?.lat,
            longitude: location?.lng,
          });
        } else {
          // This is an existing higherkey_id from within the tree
          await supabase
            .from("higherkeys")
            .update({
              parent_id: targetKeyId,
              order_index: orderIndex ?? 0,
            })
            .eq("id", id);
        }
        if (onRefresh) await onRefresh();
        else fetchAllKeys(true);
      } catch (_e) {
        console.error(_e);
        toast.error("Move failed");
      } finally {
        setMovingHighlightId(null);
      }
    },
    [supabase, onRefresh, fetchAllKeys, sources, user.id, location],
  );

  const commitMove = useCallback(
    async (
      dragId?: string,
      dropTargetId?: string,
      isExternalDrag: boolean = false,
    ) => {
      // dragId could be a highlightId from external, or a higherkeyId from internal
      const mNodeId = dragId || movingNodeId;
      const mHId = dragId || movingHighlightId;

      if (!mNodeId && !mHId) return;

      let type = "node",
        value = currentParentId || "";

      if (dropTargetId) {
        if (dropTargetId.startsWith("node:")) {
          type = "node";
          value = dropTargetId.substring(5);
        } else if (dropTargetId.startsWith("gap:")) {
          type = "gap";
          value = dropTargetId.substring(4);
        } else {
          // fallback or direct gap index
          type = isNaN(parseInt(dropTargetId)) ? "node" : "gap";
          value = dropTargetId;
        }
      } else if (focusedId) {
        const [fType, fValue] = focusedId.split(":");
        if (fType === "node" || fType === "gap") {
          type = fType;
          value = fValue;
        }
      }

      const targetParentId = type === "node" ? value : currentParentId;

      if (targetParentId && isSourceKey(targetParentId)) {
        toast.error("Source folders are deterministic and cannot be modified");
        return;
      }

      // Check if we are moving a folder or a simple highlight
      // Even if dragId is passed, we check allKeys to see what it is
      const nodeToMove = allKeys.find(
        (k) => k.id === (dragId || movingNodeId || movingHighlightId),
      );

      // Deterministic mirrors (Shadow Keys) cannot be moved out of their source
      if (nodeToMove && isShadowKey(nodeToMove.id)) {
        toast.error(
          "Deterministic mirrors cannot be moved out of their source",
        );
        return;
      }

      const isMovingHighlight =
        mHId && (!nodeToMove || nodeToMove.highlight_id);

      if (isMovingHighlight) {
        let targetOrderIdx = 0;
        const targetKeyId = type === "node" ? value : currentParentId;
        const isInternalMove = mHId === movingHighlightId || !isExternalDrag;
        const targetId = mHId!;

        if (type === "gap") {
          const gapIdx = parseInt(value);
          const siblings = navigableItems.filter(
            (it) => it.type !== "gap" && it.id !== targetId,
          );

          if (siblings.length === 0) {
            targetOrderIdx = 0;
          } else if (gapIdx === 0) {
            const first = siblings[0] as any;
            targetOrderIdx = (first.node?.order_index || 0) - 1000;
          } else if (gapIdx >= siblings.length) {
            const last = siblings[siblings.length - 1] as any;
            targetOrderIdx = (last.node?.order_index || 0) + 1000;
          } else {
            const prev = siblings[gapIdx - 1] as any;
            const next = siblings[gapIdx] as any;
            const prevIdx = prev.node?.order_index || 0;
            const nextIdx = next.node?.order_index || 0;
            targetOrderIdx = Math.round((prevIdx + nextIdx) / 2);
          }
        } else {
          // If dropping on a folder, put at the top
          const firstSibling = navigableItems.find(
            (it) => it.type !== "gap",
          ) as any;
          targetOrderIdx = (firstSibling?.node?.order_index || 0) - 1000;
        }

        // Optimistic update for highlight move (only if internal)
        if (isInternalMove) {
          setOptimisticKeys((prev) => {
            const base = prev || allKeys;
            return base.map((k) =>
              k.id === targetId
                ? {
                    ...k,
                    parent_id: targetKeyId,
                    order_index: targetOrderIdx,
                  }
                : k,
            );
          });
        }

        await moveHighlight(
          targetId,
          targetKeyId,
          targetOrderIdx,
          isInternalMove,
        );

        setOptimisticKeys(null);
        setMovingHighlightId(null);
        setFocusedId(`highlight:${targetId}`);
        return;
      }

      // Folder move logic
      const movingNodeIdToUse = dragId || movingNodeId;
      if (!movingNodeIdToUse) return;
      const movingNode = allKeys.find((k) => k.id === movingNodeIdToUse);
      if (!movingNode) return;

      try {
        if (isCopying) {
          if (type === "node") await copyFolder(movingNodeIdToUse, value);
          else
            await copyFolder(
              movingNodeIdToUse,
              currentParentId,
              parseInt(value),
            );
          fetchAllKeys(true);
          setMovingNodeId(null);
          setIsCopying(false);
          return;
        }

        const newParentId = type === "node" ? value : currentParentId;

        if (newParentId === movingNode.id) {
          setMovingNodeId(null);
          setIsCopying(false);
          return;
        }

        let newOrderIndex = 0;
        if (type === "gap") {
          const targetIdx = parseInt(value);
          const siblings = currentViewKeysNodes.filter(
            (k) => k.id !== movingNode.id,
          );

          if (siblings.length === 0) {
            newOrderIndex = 0;
          } else if (targetIdx === 0) {
            newOrderIndex = (siblings[0].order_index || 0) - 1000;
          } else if (targetIdx >= siblings.length) {
            newOrderIndex =
              (siblings[siblings.length - 1].order_index || 0) + 1000;
          } else {
            const prev = siblings[targetIdx - 1];
            const next = siblings[targetIdx];
            newOrderIndex = Math.round(
              ((prev.order_index || 0) + (next.order_index || 0)) / 2,
            );
          }
        } else {
          newOrderIndex = (currentViewKeysNodes[0]?.order_index || 0) - 1000;
        }

        if (newParentId) {
          const targetNode = allKeys.find((k) => k.id === newParentId);
          const movingNodePath = (movingNode.path as string) || "";
          const targetNodePath = (targetNode?.path as string) || "";

          if (targetNodePath.startsWith(movingNodePath + ".")) {
            toast.error("Cannot move a folder into its own subfolder");
            return;
          }
        }

        setOptimisticKeys((prev) => {
          const base = prev || allKeys;
          return base.map((k) =>
            k.id === movingNode.id
              ? {
                  ...k,
                  parent_id: newParentId || null,
                  order_index: newOrderIndex,
                }
              : k,
          );
        });

        const { error: moveError } = await supabase
          .from("higherkeys")
          .update({
            parent_id: newParentId || null,
            order_index: newOrderIndex,
          })
          .eq("id", movingNode.id);

        if (moveError) throw moveError;

        await fetchAllKeys(true);
        setOptimisticKeys(null);
        setMovingNodeId(null);
        setFocusedId(
          movingNode.highlight_id
            ? `highlight:${movingNode.id}`
            : `node:${movingNode.id}`,
        );
      } catch (_e) {
        console.error(_e);
        toast.error("Move failed");
      }
    },
    [
      movingNodeId,
      movingHighlightId,
      focusedId,
      currentParentId,
      allKeys,
      supabase,
      fetchAllKeys,
      moveHighlight,
      isCopying,
      copyFolder,
      navigableItems,
      currentViewKeysNodes,
    ],
  );

  // Auto-focus first item when focused column switches to here
  useEffect(() => {
    if (isFocused && navigableItems.length > 0) {
      const isValid = navigableItems.some(
        (it) => `${it.type}:${it.id}` === focusedId,
      );
      if (!isValid) {
        setFocusedId(`${navigableItems[0].type}:${navigableItems[0].id}`);
      }
    }
  }, [isFocused, navigableItems]);

  // Scroll focused item into view
  useEffect(() => {
    if (isFocused && focusedId && scrollRef.current) {
      const element = document.getElementById(`nav-item-${focusedId}`);
      if (element) {
        element.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [focusedId, isFocused]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isFocused) return;
      if (document.activeElement?.tagName === "INPUT") {
        if (e.key === "Escape") {
          e.stopImmediatePropagation();
          setRenamingId(null);
          setIsCreating(false);
        }
        if (e.key === "Enter") {
          if (renamingId) handleRename();
          else handleCreate();
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (movingNodeId || movingHighlightId || renamingId || isCreating) {
          setMovingNodeId(null);
          setMovingHighlightId(null);
          setRenamingId(null);
          setIsCreating(false);
          return;
        }
        if (showLegend) {
          setShowLegend(false);
          return;
        }
        onOpenChange?.(false);
        return;
      }
      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          setFocusedId((prev) => {
            const idx = navigableItems.findIndex(
              (it) => `${it.type}:${it.id}` === prev,
            );
            if (idx > 0)
              return `${navigableItems[idx - 1].type}:${
                navigableItems[idx - 1].id
              }`;
            // Wrap to bottom or handle invalid focus
            if (navigableItems.length > 0) {
              return `${navigableItems[navigableItems.length - 1].type}:${
                navigableItems[navigableItems.length - 1].id
              }`;
            }
            return prev;
          });
          break;
        case "ArrowDown":
          e.preventDefault();
          setFocusedId((prev) => {
            const idx = navigableItems.findIndex(
              (it) => `${it.type}:${it.id}` === prev,
            );
            if (idx !== -1 && idx < navigableItems.length - 1)
              return `${navigableItems[idx + 1].type}:${
                navigableItems[idx + 1].id
              }`;
            // Wrap to top or handle invalid focus
            if (navigableItems.length > 0) {
              return `${navigableItems[0].type}:${navigableItems[0].id}`;
            }
            return prev;
          });
          break;
        case "ArrowRight":
          handleDrillDown();
          break;
        case "ArrowLeft":
          handleGoUp();
          break;
        case "a":
          if (!movingNodeId && !movingHighlightId && focusedId) {
            e.preventDefault();
            const id = focusedId.split(":")[1];

            if (focusedId.startsWith("node:")) {
              if (isSourceKey(id)) {
                toast.error("Source folders cannot be renamed here");
                return;
              }
              setRenamingId(id);
            } else if (focusedId.startsWith("highlight:")) {
              const match = navigableItems.find((it) => it.id === id);
              if (match?.type === "highlight") {
                setRenamingId(id);
              }
            }

            const match = navigableItems.find((it) => it.id === id);
            setActionValue(
              focusedId.startsWith("node:")
                ? allKeys.find((k) => k.id === id)?.name || ""
                : match?.type === "highlight"
                  ? match.highlight.alias || ""
                  : "",
            );
          }
          break;
        case "n":
          if (!renamingId && !isCreating) {
            if (currentParentId && isSourceKey(currentParentId)) {
              toast.error(
                "Manual folders cannot be created inside source folders",
              );
              break;
            }
            setIsCreating(true);
            setActionValue("");
          }
          break;
        case "l":
          setShowLegend((prev) => !prev);
          break;
        case "Backspace":
        case "Delete":
          if (focusedId?.startsWith("highlight:")) {
            e.preventDefault();
            handleDeleteHighlight(focusedId.split(":")[1]);
          } else if (focusedId?.startsWith("node:")) {
            e.preventDefault();
            const nodeId = focusedId.split(":")[1];
            const nodeToDel = allKeys.find((k) => k.id === nodeId);
            if (
              nodeToDel &&
              !nodeToDel.parent_id &&
              nodeToDel.name === profile?.username
            ) {
              toast.error("The profile folder cannot be deleted");
              return;
            }
            if (isSourceKey(nodeId) || isShadowKey(nodeId)) {
              toast.error("Deterministic media keys cannot be deleted");
              return;
            }
            setNodeToDelete(nodeToDel || null);
          }
          break;
        case "v":
        case " ":
          if (taggingIds.length > 0) {
            e.preventDefault();
            if (focusedId?.startsWith("node:")) {
              const node = allKeys.find(
                (k) => k.id === focusedId.split(":")[1],
              );
              if (node) handleToggleTag(node);
            }
          }
          break;
        case "Enter":
          if (movingNodeId || movingHighlightId) commitMove();
          else if (focusedId?.startsWith("node:")) {
            const node = allKeys.find((k) => k.id === focusedId.split(":")[1]);
            if (!node) break;
            if (taggingIds.length > 0) handleToggleTag(node);
            else if (onSelect) onSelect(node);
            else handleDrillDown();
          } else if (focusedId?.startsWith("highlight:")) {
            const h = navigableItems.find(
              (it) =>
                it.type === "highlight" && it.id === focusedId.split(":")[1],
            );
            if (h && h.type === "highlight")
              router.push(
                `/source/${h.source.id}?t=${h.highlight.start_time}&backTab=higher-keys`,
              );
          }
          break;
        case "Control":
          if (movingNodeId || movingHighlightId) {
            commitMove();
          } else if (focusedId?.startsWith("node:")) {
            const nodeId = focusedId.split(":")[1];
            if (isShadowKey(nodeId)) {
              toast.error(
                "Deterministic mirrors cannot be moved out of their source",
              );
              return;
            }
            setMovingNodeId(nodeId);
            setIsCopying(true);
          } else if (focusedId?.startsWith("highlight:")) {
            const focusedKeyId = focusedId.split(":")[1];
            if (isShadowKey(focusedKeyId)) {
              toast.error(
                "Deterministic mirrors cannot be moved out of their source",
              );
              return;
            }
            setMovingHighlightId(focusedKeyId);
            setMovingFromKeyId(currentParentId);
            setIsCopying(true);
          }
          break;
        case "Shift":
          if (movingNodeId || movingHighlightId) {
            commitMove();
          } else if (focusedId?.startsWith("node:")) {
            const nodeId = focusedId.split(":")[1];
            if (isShadowKey(nodeId)) {
              toast.error(
                "Deterministic mirrors cannot be moved out of their source",
              );
              return;
            }
            setMovingNodeId(nodeId);
            setIsCopying(false);
          } else if (focusedId?.startsWith("highlight:")) {
            const focusedKeyId = focusedId.split(":")[1];
            if (isShadowKey(focusedKeyId)) {
              toast.error(
                "Deterministic mirrors cannot be moved out of their source",
              );
              return;
            }
            setMovingHighlightId(focusedKeyId);
            setMovingFromKeyId(currentParentId);
            setIsCopying(false);
          }
          break;
        case "p":
          e.preventDefault();
          if (focusedId?.startsWith("node:")) {
            router.push(`/playlist/${focusedId.split(":")[1]}`);
          } else if (currentParentId) {
            router.push(`/playlist/${currentParentId}`);
          } else {
            router.push("/playlist/unlabeled");
          }
          break;
        case "d":
        case "k":
          if (taggingIds.length > 0) {
            e.preventDefault();
            onTaggingComplete?.();
          }
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    navigableItems,
    focusedId,
    handleDrillDown,
    handleGoUp,
    isCreating,
    renamingId,
    allKeys,
    movingNodeId,
    movingHighlightId,
    commitMove,
    onSelect,
    currentParentId,
    onOpenChange,
    showLegend,
    router,
    handleDeleteHighlight,
    handleRename,
    handleCreate,
    isCopying,
    isFocused,
    profile,
  ]);

  const uiContent = (
    <div
      className={cn(
        "flex flex-col h-full overflow-hidden min-h-100",
        mode === "modal" ? "bg-background" : "",
      )}
    >
      <div className="flex items-center gap-2 py-4 border-b px-4">
        <button
          onClick={handleGoUp}
          className="p-1 hover:bg-white/10 rounded-md transition-colors"
        >
          <ArrowLeftIcon className="size-4" />
        </button>
        <div className="flex items-center text-sm font-medium overflow-x-auto whitespace-nowrap scrollbar-hide flex-1">
          <button
            onClick={() => {
              const rootKey = allKeys.find(
                (k) => !k.parent_id && k.name === profile?.username,
              );
              setCurrentParentId(rootKey?.id || null);
            }}
            className={cn(
              "hover:text-primary transition-colors font-bold",
              !currentParentId ||
                (allKeys.find((k) => k.id === currentParentId)?.parent_id ===
                  null &&
                  allKeys.find((k) => k.id === currentParentId)?.name ===
                    profile?.username)
                ? "text-primary"
                : "text-muted-foreground",
            )}
          >
            {profile?.username || "Root"}
          </button>
          {breadcrumbs
            .filter((c) => c.parent_id !== null || c.name !== profile?.username)
            .map((crumb) => (
              <div key={crumb.id} className="flex items-center">
                <ChevronRightIcon className="size-3 mx-1 text-muted-foreground/40" />
                <button
                  onClick={() => setCurrentParentId(crumb.id)}
                  className={cn(
                    "hover:text-primary transition-colors",
                    currentParentId === crumb.id
                      ? "text-primary"
                      : "text-muted-foreground",
                  )}
                >
                  {crumb.name}
                </button>
              </div>
            ))}
        </div>
      </div>

      {taggingIds.length > 0 && (
        <div className="bg-primary/10 border-b border-primary/20 px-6 py-2.5 flex items-center justify-between animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2">
            <div className="size-5 rounded-full bg-primary/20 flex items-center justify-center">
              <PlusIcon className="size-3 text-primary" />
            </div>
            <span className="text-xs font-bold text-primary tracking-tight uppercase">
              Tagging {taggingIds.length} Highlight
              {taggingIds.length > 1 ? "s" : ""}
            </span>
          </div>
          <button
            onClick={() => onTaggingComplete?.()}
            className="text-xs font-bold hover:bg-primary/20 bg-primary/10 text-primary px-3 py-1 rounded-full transition-all"
          >
            Done
          </button>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 gap-2 max-w-4xl mx-auto">
          {loading ? (
            <div className="py-20 flex flex-col items-center gap-4">
              <Loader2Icon className="size-8 animate-spin text-primary/40" />
              <p className="text-sm text-muted-foreground italic">
                Fetching...
              </p>
            </div>
          ) : (
            <>
              {isCreating && (
                <div
                  id="nav-item-creating"
                  className="flex items-center gap-3 p-3 bg-primary/10 border border-primary/30 rounded-xl animate-in zoom-in-95 duration-200"
                >
                  <FolderIcon className="size-5 text-primary" />
                  <Input
                    autoFocus
                    value={actionValue}
                    onChange={(e) => setActionValue(e.target.value)}
                    onBlur={() => !actionValue.trim() && setIsCreating(false)}
                    placeholder="Folder name..."
                    className="flex-1 bg-transparent border-none focus-visible:ring-0 p-0 text-sm font-bold"
                  />
                </div>
              )}

              {navigableItems.map((item) => {
                if (item.type === "gap") {
                  const isFocused = focusedId === `gap:${item.id}`;
                  const isDragOver = dragOverId === item.id;
                  return (
                    <div
                      key={`gap:${item.id}`}
                      id={`nav-item-gap:${item.id}`}
                      className={cn(
                        "h-1.5 rounded-full transition-all mx-8 relative",
                        isFocused || isDragOver
                          ? "bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)] my-1"
                          : "bg-transparent",
                      )}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverId(item.id);
                      }}
                      onDragLeave={() => setDragOverId(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOverId(null);
                        const treeKeyId = e.dataTransfer.getData("treeKeyId");
                        const highlightId =
                          e.dataTransfer.getData("highlightId");
                        if (treeKeyId) commitMove(treeKeyId, `gap:${item.id}`);
                        else if (highlightId)
                          commitMove(highlightId, `gap:${item.id}`, true);
                      }}
                    >
                      {(isFocused || isDragOver) && (
                        <div className="absolute left-1/2 -top-4 -translate-x-1/2 bg-primary text-black text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter">
                          Drop Here
                        </div>
                      )}
                    </div>
                  );
                }

                if (item.type === "node") {
                  const node = item.node,
                    isFocused = focusedId === `node:${node.id}`,
                    isMoving = movingNodeId === node.id,
                    isRenaming = renamingId === node.id,
                    isAssigned =
                      propAssignedIds.includes(node.id) ||
                      localAssignedIds.includes(node.id),
                    stats = keyStats.get(node.id),
                    isSource = isSourceKey(node.id),
                    isShadow = isShadowKey(node.id),
                    isDeterministic = isSource || isShadow;
                  return (
                    <div
                      key={node.id}
                      id={`nav-item-node:${node.id}`}
                      className={cn(
                        "group relative flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer",
                        isFocused || dragOverId === node.id
                          ? "bg-primary/10 border-primary ring-1 ring-primary"
                          : "bg-white/2 border-white/2 hover:bg-white/5",
                        isMoving &&
                          "opacity-100 border-primary ring-2 ring-primary bg-primary/20 scale-102 z-10 animate-pulse shadow-lg",
                        isAssigned && "ring-1 ring-primary bg-primary/5",
                        isDeterministic && "border-blue-500/30",
                      )}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (node.id === movingNodeId) return;
                        if (isSource) return; // Cannot drop into source key folders
                        setDragOverId(node.id);
                      }}
                      onDragLeave={() => setDragOverId(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (isSource) {
                          toast.error(
                            "Source folders are deterministic and cannot be modified",
                          );
                          return;
                        }
                        setDragOverId(null);
                        const treeKeyId = e.dataTransfer.getData("treeKeyId");
                        const highlightId =
                          e.dataTransfer.getData("highlightId");
                        if (treeKeyId) {
                          commitMove(treeKeyId, `node:${node.id}`);
                        } else if (highlightId) {
                          commitMove(highlightId, `node:${node.id}`, true);
                        }
                      }}
                      onClick={() => {
                        setFocusedId(`node:${node.id}`);
                        if (taggingIds.length > 0) {
                          if (isSource) {
                            toast.error(
                              "Source folders cannot be used as manual tagging targets",
                            );
                            return;
                          }
                          handleToggleTag(node);
                        } else if (movingHighlightId) {
                          if (isSource) {
                            toast.error(
                              "Source folders cannot be used as move targets",
                            );
                            return;
                          }
                          commitMove(undefined, `node:${node.id}`);
                        } else if (movingNodeId && movingNodeId !== node.id) {
                          if (isSource) {
                            toast.error(
                              "Source folders cannot be used as move targets",
                            );
                            return;
                          }
                          commitMove(undefined, `node:${node.id}`);
                        } else if (onSelect) onSelect(node);
                      }}
                      onDoubleClick={handleDrillDown}
                    >
                      <div className="relative">
                        <FolderIcon
                          className={cn(
                            "size-5 shrink-0",
                            isFocused || isMoving || isAssigned
                              ? "text-primary"
                              : isDeterministic
                                ? "text-blue-400"
                                : "text-muted-foreground",
                          )}
                        />
                        {isAssigned && (
                          <div className="absolute -top-1 -right-1 bg-primary text-black rounded-full p-0.5 shadow-lg border border-background">
                            <CheckIcon className="size-2 font-black" />
                          </div>
                        )}
                      </div>
                      {(onSelect || taggingIds.length > 0) && (
                        <div
                          className={cn(
                            "size-4 rounded border transition-all flex items-center justify-center shrink-0",
                            isAssigned
                              ? "bg-primary border-primary text-black"
                              : "border-white/20 group-hover:border-white/40",
                          )}
                        >
                          {isAssigned && (
                            <CheckIcon className="size-3 font-black" />
                          )}
                        </div>
                      )}
                      {isRenaming ? (
                        <Input
                          autoFocus
                          value={actionValue}
                          onChange={(e) => setActionValue(e.target.value)}
                          onFocus={(e) => e.target.select()}
                          onBlur={handleRename}
                          className="flex-1 bg-transparent border-none focus-visible:ring-0 p-0 text-sm font-bold h-auto"
                        />
                      ) : (
                        <div className="flex-1 flex items-center justify-between min-w-0">
                          <span
                            className={cn(
                              "truncate text-sm font-bold",
                              isMoving && "italic text-primary",
                            )}
                          >
                            {node.name}
                            {isMoving &&
                              (isCopying ? " (Copying...)" : " (Moving...)")}
                          </span>
                          <div className="flex items-center gap-3 ml-4 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                            {stats && stats.childKeys > 0 && (
                              <div className="flex items-center gap-1 text-[10px] font-bold">
                                <FolderIcon className="size-3" />
                                {stats.childKeys}
                              </div>
                            )}
                            {stats && stats.totalHighlights > 0 && (
                              <div className="flex items-center gap-1 text-[10px] text-primary font-black">
                                <VideoIcon className="size-3" />
                                <span>{stats.directHighlights}</span>
                                {stats.totalHighlights >
                                  stats.directHighlights && (
                                  <span className="opacity-40 ml-0.5">
                                    / {stats.totalHighlights}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }

                if (item.type === "highlight") {
                  const { highlight, source, treeKeyId } = item,
                    isFocused = focusedId === `highlight:${treeKeyId}`,
                    isMoving = movingHighlightId === treeKeyId,
                    isRenaming = renamingId === treeKeyId,
                    isDraggable = !isShadowKey(treeKeyId),
                    isDeterministic =
                      isSourceKey(treeKeyId) || isShadowKey(treeKeyId);
                  return (
                    <div
                      key={treeKeyId}
                      id={`nav-item-highlight:${treeKeyId}`}
                      className={cn(
                        "group flex items-center gap-4 p-3 rounded-xl border transition-all cursor-pointer",
                        isFocused
                          ? "bg-primary/10 border-primary ring-1 ring-primary"
                          : "bg-white/2 border-white/2 hover:bg-white/5",
                        isMoving &&
                          "opacity-100 border-primary ring-1 ring-primary bg-primary/20 scale-102 z-10 animate-pulse shadow-lg",
                        isDeterministic && "border-blue-500/30",
                      )}
                      draggable={isDraggable}
                      onDragStart={(e) => {
                        if (!isDraggable) {
                          e.preventDefault();
                          return;
                        }
                        e.dataTransfer.setData("treeKeyId", treeKeyId);
                      }}
                      onClick={() => {
                        setFocusedId(`highlight:${treeKeyId}`);
                        if (
                          movingHighlightId &&
                          movingHighlightId !== treeKeyId
                        )
                          commitMove(undefined, `node:${currentParentId}`);
                        else if (movingNodeId)
                          commitMove(undefined, `node:${currentParentId}`);
                      }}
                    >
                      <div className="size-10 relative rounded-lg overflow-hidden bg-muted shrink-0">
                        <Image
                          src={getVideoThumbnailUrl(user.id, source.id)}
                          alt={source.title}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <VideoIcon className="size-4 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        {isRenaming ? (
                          <Input
                            autoFocus
                            value={actionValue}
                            onChange={(e) => setActionValue(e.target.value)}
                            onFocus={(e) => e.target.select()}
                            onBlur={handleRename}
                            className="h-7 text-xs bg-background border-primary"
                          />
                        ) : (
                          <p className="text-sm font-bold truncate">
                            {highlight.alias ||
                              (item.node.name !== "Highlight"
                                ? item.node.name
                                : null) ||
                              `Highlight at ${Math.round(
                                highlight.start_time,
                              )}s`}
                            {" • "}
                            <span className="text-primary font-black">
                              {formatDuration(highlight.relativeDuration || 0)}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  );
                }
                return null;
              })}
            </>
          )}
        </div>
      </div>

      <div className="p-3 flex justify-between items-center px-6 border-t bg-white/5">
        <div className="flex gap-4">
          {movingNodeId && (
            <div className="text-[10px] text-primary animate-pulse uppercase font-black">
              Moving: {allKeys.find((k) => k.id === movingNodeId)?.name}
            </div>
          )}
          {movingHighlightId && (
            <div className="text-[10px] text-primary animate-pulse uppercase font-black">
              Moving Highlight
            </div>
          )}
        </div>
        <button
          onClick={() => setShowLegend(true)}
          className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 hover:text-primary transition-colors"
        >
          Shortcuts (L)
        </button>
      </div>

      <AlertDialog
        open={!!nodeToDelete}
        onOpenChange={() => setNodeToDelete(null)}
      >
        <AlertDialogContent className="bg-background/95 backdrop-blur-md border border-white/10 shadow-2xl p-0 overflow-hidden sm:max-w-md">
          <AlertDialogHeader className="p-6 text-left sm:text-left">
            <AlertDialogTitle className="text-xl font-bold uppercase tracking-widest text-primary">
              Delete Higher Key?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground mt-2">
              This will remove the folder &quot;{nodeToDelete?.name}&quot; and
              all nested subfolders. Highlights tagged with this key will remain
              in your library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="p-6 bg-white/5 border-t border-white/5 m-0 sm:justify-end gap-3 rounded-none">
            <AlertDialogCancel
              className="bg-transparent border-white/10 hover:bg-white/5 text-foreground uppercase tracking-widest text-[10px] h-9 px-4"
              onClick={() => setNodeToDelete(null)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white uppercase tracking-widest text-[10px] h-9 px-4 border-0"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!highlightToRemove}
        onOpenChange={() => setHighlightToRemove(null)}
      >
        <AlertDialogContent className="bg-background/95 backdrop-blur-md border border-white/10 shadow-2xl p-0 overflow-hidden sm:max-w-md">
          <AlertDialogHeader className="p-6 text-left sm:text-left">
            <AlertDialogTitle className="text-xl font-bold uppercase tracking-widest text-primary">
              Remove Highlight?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground mt-2">
              This will untag &quot;
              {highlightToRemove?.name ||
                allKeys.find((k) => k.id === highlightToRemove?.id)?.name}
              &quot; from this folder. The highlight itself will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="p-6 bg-white/5 border-t border-white/5 m-0 sm:justify-end gap-3 rounded-none">
            <AlertDialogCancel
              className="bg-transparent border-white/10 hover:bg-white/5 text-foreground uppercase tracking-widest text-[10px] h-9 px-4"
              onClick={() => setHighlightToRemove(null)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white uppercase tracking-widest text-[10px] h-9 px-4 border-0"
              onClick={commitRemoveHighlight}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showLegend && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-6">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            onClick={() => setShowLegend(false)}
          />
          <div className="relative w-full max-w-md bg-neutral-900 rounded-2xl border border-white/5 shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Keyboard className="size-5 text-primary" />
                <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white">
                  Shortcuts
                </h2>
              </div>
              <button onClick={() => setShowLegend(false)}>
                <X className="size-4 text-white/40 hover:text-white" />
              </button>
            </div>
            <div className="p-6 space-y-3">
              {[
                { keys: ["↑", "↓"], label: "Navigate" },
                { keys: ["→"], label: "Drill Down" },
                { keys: ["←"], label: "Up / Back" },
                {
                  keys: ["Enter"],
                  label:
                    taggingIds.length > 0
                      ? "Toggle Tag"
                      : onSelect
                        ? "Select Key"
                        : "Play / Enter",
                },
                ...(taggingIds.length > 0
                  ? [
                      { keys: ["V", "Space"], label: "Toggle Tag" },
                      { keys: ["D", "K"], label: "Done Tagging" },
                    ]
                  : [
                      { keys: ["P"], label: "Breakout Playlist" },
                      { keys: ["Shift"], label: "Move Mode" },
                      { keys: ["Ctrl"], label: "Copy Mode" },
                      { keys: ["N"], label: "New Folder" },
                      { keys: ["A"], label: "Rename" },
                      { keys: ["K"], label: "Tag Highlights" },
                    ]),
                { keys: ["I"], label: "Profile Menu" },
                { keys: ["L"], label: "Shortcuts" },
                { keys: ["Esc"], label: "Cancel / Close" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                    {item.label}
                  </span>
                  <div className="flex gap-1">
                    {item.keys.map((k) => (
                      <kbd
                        key={k}
                        className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] font-black text-primary min-w-8 text-center"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (mode === "modal") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[calc(100vw-2rem)] w-[calc(100vw-2rem)] h-[calc(100vh-2rem)] p-0 overflow-hidden flex flex-col border border-white/10 rounded-2xl bg-background shadow-2xl">
          <DialogHeader className="p-4 border-b border-white/5">
            <DialogTitle className="flex justify-between items-center w-full text-primary uppercase tracking-widest text-xs font-black">
              <span>{title}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">{uiContent}</div>
        </DialogContent>
      </Dialog>
    );
  }
  return uiContent;
}
