"use client";

import { useEffect, useState } from "react";
import { DownloadModal } from "./dashboard/download-modal";
import { UploadModal } from "./dashboard/upload-modal";
import { createClient } from "@/lib/supabase/client";

export function GlobalShortcuts() {
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!user) return;

      // Don't trigger if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      if (e.key.toLowerCase() === "d") {
        e.preventDefault();
        setIsDownloadOpen(true);
      }

      if (e.key.toLowerCase() === "u") {
        e.preventDefault();
        setIsUploadOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [user]);

  if (!user) return null;

  return (
    <>
      <DownloadModal open={isDownloadOpen} onOpenChange={setIsDownloadOpen} />
      <UploadModal open={isUploadOpen} onOpenChange={setIsUploadOpen} />
    </>
  );
}
