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
import { Upload, Loader2, FileVideo } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useLocation } from "@/components/location-guard";
import { cn } from "@/lib/utils";

interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UploadModal({ open, onOpenChange }: UploadModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();
  const { location } = useLocation();

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsLoading(true);
    try {
      const headers: Record<string, string> = {
        "X-File-Name": encodeURIComponent(selectedFile.name),
        "Content-Type": selectedFile.type || "application/octet-stream",
      };

      if (location) {
        headers["X-Lat"] = location.lat.toString();
        headers["X-Lng"] = location.lng.toString();
      }

      const response = await fetch("/api/videos/upload/file", {
        method: "POST",
        headers,
        body: selectedFile,
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
        throw new Error(errorData.error || "Failed to upload video");
      }

      toast.success("Video uploaded! Processing will start soon.");
      setSelectedFile(null);
      onOpenChange(false);
      router.refresh();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to upload video");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-md border-white/10 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="size-5 text-primary" />
            Upload Video File
          </DialogTitle>
          <DialogDescription>
            Select a video file from your computer to upload and process.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleFileUpload} className="space-y-4 pt-4">
          <div className="flex items-center justify-center w-full">
            <label
              className={cn(
                "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                selectedFile
                  ? "border-primary/50 bg-primary/5"
                  : "border-white/10 hover:border-white/20 hover:bg-white/5",
              )}
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {selectedFile ? (
                  <>
                    <FileVideo className="size-8 text-primary mb-2" />
                    <p className="text-sm font-medium text-foreground text-center px-4 truncate max-w-xs">
                      {selectedFile.name}
                    </p>
                  </>
                ) : (
                  <>
                    <Upload className="size-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Click or drag to select video
                    </p>
                  </>
                )}
              </div>
              <Input
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                disabled={isLoading}
              />
            </label>
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
            <Button type="submit" disabled={isLoading || !selectedFile}>
              {isLoading ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : (
                <Upload className="size-4 mr-2" />
              )}
              Upload
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
