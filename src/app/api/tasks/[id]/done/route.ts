import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { resolveUserId, parseTagsFromDb, isValidUUID } from "@/lib/user-utils";
import { Task } from "@/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PATCH /api/tasks/[id]/done - Marcar task como concluída (toggle)
export async function PATCH(req: Request, context: RouteContext) {
  try {
    const { id: taskId } = await context.params;
    const url = new URL(req.url);
    let identifier = url.searchParams.get("identifier");

    // Também aceitar identifier no body
    if (!identifier) {
      const json = await req.json().catch(() => null);
      identifier = json?.identifier;
    }

    if (!identifier) {
      return NextResponse.json(
        { error: "identifier is required (query param or body)" },
        { status: 400 }
      );
    }

    if (!isValidUUID(taskId)) {
      return NextResponse.json(
        { error: "Invalid task ID format" },
        { status: 400 }
      );
    }

    const user = await resolveUserId(identifier);

    // Primeiro, buscar o status atual
    const { data: currentTask, error: fetchError } = await supabaseAdmin
      .from("tasks")
      .select("status")
      .eq("id", taskId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !currentTask) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    // Toggle: se está done, volta para open; se está open, marca como done
    const newStatus = currentTask.status === "done" ? "open" : "done";

    const { data: taskData, error } = await supabaseAdmin
      .from("tasks")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error || !taskData) {
      return NextResponse.json(
        { error: "Failed to update task status", details: error },
        { status: 500 }
      );
    }

    const task: Task = {
      ...taskData,
      tags: parseTagsFromDb(taskData.tags),
    };

    return NextResponse.json({ task }, { status: 200 });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: String(err) },
      { status: 500 }
    );
  }
}
