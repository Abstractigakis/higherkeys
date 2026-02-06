"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { signOut } from "@/app/auth/actions";
import ProfileForm from "@/components/profile-form";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";
import {
  Logout03Icon,
  UserCircleIcon,
  HighlighterIcon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@/lib/utils";

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
  profile: any;
  initialIndex?: number;
}

export function ProfileModal({
  open,
  onOpenChange,
  user,
  profile,
  initialIndex = 0,
}: ProfileModalProps) {
  const router = useRouter();
  const supabase = createClient();
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    profile?.avatar_url || null
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const logoutFormRef = useRef<HTMLFormElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (profile?.avatar_url) {
      setAvatarUrl(profile.avatar_url);
    }
  }, [profile?.avatar_url]);

  async function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("You must select an image to upload.");
      }

      const file = event.target.files[0];
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}-${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (updateError) {
        throw updateError;
      }

      setAvatarUrl(publicUrl);
      router.refresh();
      toast.success("Avatar updated successfully!");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error uploading avatar!";
      toast.error(message);
    } finally {
      setUploading(false);
    }
  }

  const menuItems = useMemo(
    () => [
      {
        id: "avatar",
        label: "Update Avatar",
        icon: UserCircleIcon,
        action: () => fileInputRef.current?.click(),
      },
      {
        id: "username",
        label: "Name / Alias",
        icon: HighlighterIcon,
        action: () => nameInputRef.current?.focus(),
        value: profile?.username ? `@${profile.username}` : "Set Username",
      },
      {
        id: "logout",
        label: "Sign Out",
        icon: Logout03Icon,
        action: () => setIsLogoutConfirmOpen(true),
        danger: true,
      },
    ],
    [profile]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent | KeyboardEvent) => {
      if (isLogoutConfirmOpen) return;

      // If typing in the username input, don't use arrow keys for modal navigation
      if (
        e.target instanceof HTMLInputElement &&
        e.target.id === "username" &&
        e.key !== "Escape" &&
        e.key !== "Enter"
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case "arrowup":
          e.preventDefault();
          setActiveIndex((prev) =>
            prev > 0 ? prev - 1 : menuItems.length - 1
          );
          break;
        case "arrowdown":
          e.preventDefault();
          setActiveIndex((prev) =>
            prev < menuItems.length - 1 ? prev + 1 : 0
          );
          break;
        case "enter":
          if (
            e.target instanceof HTMLInputElement &&
            e.target.id === "username"
          ) {
            // Let the ProfileForm handle Enter for the input
            return;
          }
          e.preventDefault();
          menuItems[activeIndex].action();
          break;
        case "escape":
          // If we're focused on the input, just blur it first
          if (document.activeElement instanceof HTMLInputElement) {
            document.activeElement.blur();
          } else {
            onOpenChange(false);
          }
          break;
      }
    },
    [isLogoutConfirmOpen, activeIndex, menuItems, onOpenChange]
  );

  // Focus the active item when index changes
  useEffect(() => {
    if (open && itemRefs.current[activeIndex]) {
      itemRefs.current[activeIndex]?.focus();
    }
  }, [activeIndex, open]);

  useEffect(() => {
    if (open) {
      setActiveIndex(initialIndex);
    }
  }, [open, initialIndex]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          onKeyDown={handleKeyDown}
          className="sm:max-w-md bg-background/95 backdrop-blur-md border border-white/10 shadow-2xl p-0 overflow-hidden"
        >
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-xl font-medium text-muted-foreground/50 uppercase tracking-widest text-[10px]">
              Profile Settings
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col p-2 gap-1 mb-4">
            {menuItems.map((item, index) => (
              <div
                key={item.id}
                className={cn(
                  "group relative flex flex-col rounded-xl transition-all duration-200",
                  activeIndex === index
                    ? "bg-primary/10 shadow-sm"
                    : "hover:bg-white/5"
                )}
              >
                <button
                  ref={(el) => {
                    itemRefs.current[index] = el;
                  }}
                  onClick={() => item.action()}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={cn(
                    "flex items-center gap-4 w-full px-4 py-4 rounded-xl text-left outline-none transition-all",
                    activeIndex === index
                      ? "text-primary font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div
                    className={cn(
                      "size-9 flex items-center justify-center rounded-lg transition-colors border relative overflow-hidden shrink-0",
                      activeIndex === index
                        ? "bg-primary/20 border-primary/30 text-primary"
                        : "bg-muted border-transparent group-hover:bg-primary/10 group-hover:border-primary/20"
                    )}
                  >
                    {item.id === "avatar" && (avatarUrl || uploading) ? (
                      <>
                        {avatarUrl ? (
                          <Image
                            src={avatarUrl}
                            alt="Avatar"
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <HugeiconsIcon icon={item.icon} className="size-5" />
                        )}
                        {uploading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                            <HugeiconsIcon
                              icon={Loading03Icon}
                              className="size-4 animate-spin text-primary"
                            />
                          </div>
                        )}
                      </>
                    ) : (
                      <HugeiconsIcon icon={item.icon} className="size-5" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold uppercase tracking-tight">
                      {item.label}
                    </span>
                    {item.value && (
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {item.value}
                      </span>
                    )}
                  </div>

                  {activeIndex === index && (
                    <div className="ml-auto animate-in fade-in slide-in-from-right-2 duration-300">
                      <span className="text-[10px] font-mono opacity-50 bg-primary/20 px-2 py-0.5 rounded border border-primary/30 uppercase">
                        Enter to{" "}
                        {item.id === "username"
                          ? "Edit"
                          : item.id === "avatar"
                          ? uploading
                            ? "Wait..."
                            : "Upload"
                          : "Select"}
                      </span>
                    </div>
                  )}
                </button>

                {/* Injected Hidden Components for Actions */}
                {item.id === "avatar" && (
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={uploadAvatar}
                    disabled={uploading}
                  />
                )}
                {item.id === "username" && activeIndex === index && (
                  <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
                    <ProfileForm
                      inputRef={nameInputRef}
                      uid={user.id}
                      initialUsername={profile?.username || null}
                      hideButton
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="bg-black/20 p-4 border-t border-white/5 text-center">
            <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
              Logged in as {user.email}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={isLogoutConfirmOpen}
        onOpenChange={setIsLogoutConfirmOpen}
      >
        <AlertDialogContent className="bg-background/95 backdrop-blur-md border border-white/10 shadow-2xl p-0 overflow-hidden sm:max-w-md">
          <AlertDialogHeader className="p-6 text-left sm:text-left">
            <AlertDialogTitle className="text-xl font-bold uppercase tracking-widest text-primary">
              Sign Out
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground mt-2">
              Are you sure you want to sign out? You will need to log in again
              to access your dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="p-6 bg-white/5 border-t border-white/5 m-0 sm:justify-end gap-3 rounded-none">
            <AlertDialogCancel className="bg-transparent border-white/10 hover:bg-white/5 text-foreground uppercase tracking-widest text-[10px] h-9 px-4">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/80 text-white uppercase tracking-widest text-[10px] h-9 px-4 border-0"
              onClick={() => logoutFormRef.current?.requestSubmit()}
            >
              Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <form ref={logoutFormRef} action={signOut} className="hidden"></form>
    </>
  );
}
