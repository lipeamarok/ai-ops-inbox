import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveUserId } from "@/lib/user-utils";

const ResolveUserSchema = z.object({
  identifier: z.string().min(1, "identifier is required"),
});

/**
 * POST /api/resolve-user
 * Resolve um identifier para um user_id.
 * Cria o usuário se não existir.
 */
export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => null);
    const parsed = ResolveUserSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { identifier } = parsed.data;
    const user = await resolveUserId(identifier);

    return NextResponse.json({ user }, { status: 200 });
  } catch (err) {
    console.error("Error resolving user:", err);
    return NextResponse.json(
      { error: "Failed to resolve user", details: String(err) },
      { status: 500 }
    );
  }
}
