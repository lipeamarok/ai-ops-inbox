import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-server";
import { resolveUserId, parseTagsFromDb, isValidUUID } from "@/lib/user-utils";
import { Task, TaskStep } from "@/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ============================================
// GET /api/tasks/[id]?identifier=... - Buscar task específica
// ============================================

export async function GET(req: Request, context: RouteContext) {
  try {
    const { id: taskId } = await context.params;
    const url = new URL(req.url);
    const identifier = url.searchParams.get("identifier");

    if (!identifier) {
      return NextResponse.json(
        { error: "identifier query parameter is required" },
        { status: 400 }
      );
    }

    if (!isValidUUID(taskId)) {
      return NextResponse.json(
        { error: "Invalid task ID format" },
        { status: 400 }
      );
    }

    // Resolver user_id
    const user = await resolveUserId(identifier);

    // Buscar task
    const { data: taskData, error: taskError } = await supabaseAdmin
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .eq("user_id", user.id)
      .single();

    if (taskError || !taskData) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    // Buscar steps
    const { data: stepsData } = await supabaseAdmin
      .from("task_steps")
      .select("*")
      .eq("task_id", taskId)
      .order("step_order", { ascending: true });

    // Formatar task
    const task: Task = {
      ...taskData,
      tags: parseTagsFromDb(taskData.tags),
      steps: (stepsData || []) as TaskStep[],
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

// ============================================
// PUT /api/tasks/[id] - Atualizar task (request_raw)
// ============================================

const UpdateTaskSchema = z.object({
  identifier: z.string().min(1, "identifier is required"),
  request_raw: z.string().min(1, "request_raw is required"),
});

export async function PUT(req: Request, context: RouteContext) {
  try {
    const { id: taskId } = await context.params;
    const json = await req.json().catch(() => null);
    const parsed = UpdateTaskSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (!isValidUUID(taskId)) {
      return NextResponse.json(
        { error: "Invalid task ID format" },
        { status: 400 }
      );
    }

    const { identifier, request_raw } = parsed.data;
    const user = await resolveUserId(identifier);

    // Atualizar task
    const { data: taskData, error } = await supabaseAdmin
      .from("tasks")
      .update({
        request_raw,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error || !taskData) {
      return NextResponse.json(
        { error: "Task not found or update failed" },
        { status: 404 }
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

// ============================================
// DELETE /api/tasks/[id]?identifier=... - Deletar task
// ============================================

export async function DELETE(req: Request, context: RouteContext) {
  try {
    const { id: taskId } = await context.params;
    const url = new URL(req.url);
    const identifier = url.searchParams.get("identifier");

    // Também aceitar identifier no body
    let resolvedIdentifier = identifier;
    if (!resolvedIdentifier) {
      const json = await req.json().catch(() => null);
      resolvedIdentifier = json?.identifier;
    }

    if (!resolvedIdentifier) {
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

    const user = await resolveUserId(resolvedIdentifier);

    // Deletar task (steps são deletados por CASCADE)
    const { error } = await supabaseAdmin
      .from("tasks")
      .delete()
      .eq("id", taskId)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to delete task", details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: String(err) },
      { status: 500 }
    );
  }
}
