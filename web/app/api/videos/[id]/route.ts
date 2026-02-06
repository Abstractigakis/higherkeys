import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Get video details to get profile_id
    const { data: video, error: videoError } = await supabase
      .from("sources")
      .select("profile_id")
      .eq("id", id)
      .maybeSingle();

    if (videoError || !video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    const videoData = video as { profile_id: string };

    if (videoData.profile_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Delete from Storage
    // We need to list all files in the folder and delete them
    const storagePath = `${videoData.profile_id}/${id}`;

    // List all files in the folder recursively
    const { data: files, error: listError } = await supabase.storage
      .from("sources")
      .list(storagePath, {
        limit: 1000,
        offset: 0,
        sortBy: { column: "name", order: "asc" },
      });

    if (listError) {
      console.error("Error listing files for deletion:", listError);
    }

    if (files && files.length > 0) {
      // Filter out folders (they don't have an id) and map to full paths
      const filesToDelete = files
        .filter((f) => f.id !== null)
        .map((f) => `${storagePath}/${f.name}`);

      // Check for hls subdirectory
      const { data: hlsFiles } = await supabase.storage
        .from("videos")
        .list(`${storagePath}/hls`);

      if (hlsFiles && hlsFiles.length > 0) {
        filesToDelete.push(
          ...hlsFiles
            .filter((f) => f.id !== null)
            .map((f) => `${storagePath}/hls/${f.name}`),
        );
      }

      if (filesToDelete.length > 0) {
        const { error: deleteStorageError } = await supabase.storage
          .from("videos")
          .remove(filesToDelete);

        if (deleteStorageError) {
          console.error(
            "Error deleting files from storage:",
            deleteStorageError,
          );
        }
      }
    }

    // 3. Delete from Database
    // Mats and segments will be deleted automatically due to ON DELETE CASCADE
    const { error: deleteDbError } = await supabase
      .from("sources")
      .delete()
      .eq("id", id);

    if (deleteDbError) {
      return NextResponse.json(
        { error: deleteDbError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Video deletion error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
