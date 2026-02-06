"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface ProfileFormProps {
  uid: string;
  initialUsername: string | null;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  hideButton?: boolean;
}

export default function ProfileForm({
  uid,
  initialUsername,
  inputRef,
  hideButton = false,
}: ProfileFormProps) {
  const supabase = createClient();
  const router = useRouter();
  const [username, setUsername] = useState(initialUsername || "");
  const [loading, setLoading] = useState(false);

  async function updateProfile() {
    if (!username || username.length < 3) {
      toast.error("Username must be at least 3 characters long.");
      return;
    }

    try {
      setLoading(true);

      // Check if username is already taken
      const { data: existingUser, error: fetchError } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username.toLowerCase())
        .neq("id", uid)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        throw fetchError;
      }

      if (existingUser) {
        toast.error("Username is already taken.");
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          username: username.toLowerCase(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", uid);

      if (error) throw error;

      toast.success("Username updated successfully!");
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error updating username!";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full space-y-4">
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          ref={inputRef}
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ""))}
          placeholder="Enter username"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              updateProfile();
            }
          }}
        />
      </div>
      {!hideButton && (
        <Button className="w-full" onClick={updateProfile} disabled={loading}>
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      )}
    </div>
  );
}
