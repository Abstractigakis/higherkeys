"use client";

import { useState, useEffect } from "react";
import { ProfileModal } from "./dashboard/profile-modal";
import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/types/supabase";

export function GlobalProfile() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Tables<"profiles"> | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function getSession() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();
        if (profile) setProfile(profile);
      }
    }
    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        // Refresh profile
        supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data) setProfile(data);
          });
      } else {
        setUser(null);
        setProfile(null);
        setIsOpen(false);
      }
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
        (e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          (e.target as HTMLElement).isContentEditable) &&
        e.key !== "Escape"
      ) {
        return;
      }

      if (e.key.toLowerCase() === "i") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [user]);

  if (!user || !profile) return null;

  return (
    <ProfileModal
      open={isOpen}
      onOpenChange={setIsOpen}
      user={user}
      profile={profile}
    />
  );
}
