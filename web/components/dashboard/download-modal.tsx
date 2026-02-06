"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Youtube, Loader2, Plus, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useLocation } from "@/components/location-guard";

interface DownloadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DownloadModal({ open, onOpenChange }: DownloadModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();
  const { location } = useLocation();

  const handleYoutubeUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeUrl) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/videos/upload/url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: youtubeUrl,
          lat: location?.lat,
          lng: location?.lng,
        }),
      });

      if (!response.ok) {
        if (response.status === 503) {
          setErrorMessage(
            "The media server is currently offline. Please try again later.",
          );
          setShowErrorModal(true);
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add YouTube video");
      }

      toast.success("YouTube video added! Processing will start soon.");
      setYoutubeUrl("");
      onOpenChange(false);
      router.refresh();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to add YouTube video");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-md border-white/10 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Youtube className="size-5 text-red-500" />
            Add Video from URL
          </DialogTitle>
          <DialogDescription>
            Enter a YouTube URL to download and process it.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleYoutubeUpload} className="space-y-4 pt-4">
          <div className="relative">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="https://www.youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              disabled={isLoading}
              className="pl-10"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !youtubeUrl}>
              {isLoading ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : (
                <Plus className="size-4 mr-2" />
              )}
              Add Video
            </Button>
          </div>
        </form>
      </DialogContent>

      <AlertDialog open={showErrorModal} onOpenChange={setShowErrorModal}>
        <AlertDialogContent className="p-0 overflow-hidden sm:max-w-md bg-background/95 backdrop-blur-md border-white/10 shadow-2xl">
          <AlertDialogHeader className="p-6 text-left">
            <AlertDialogTitle>Media Server Offline</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {errorMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="p-6 bg-white/5 border-t">
            <AlertDialogAction
              onClick={() => setShowErrorModal(false)}
              className="h-9 text-[10px] uppercase font-bold tracking-widest"
            >
              Understand
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
