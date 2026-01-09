import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveUserId } from "@/lib/user-utils";

// Schema de validação para mensagem do chat
const ChatSchema = z.object({
  identifier: z.string().min(1, "identifier is required"),
  message: z.string().min(1, "message is required"),
});

// POST /api/chat - Enviar mensagem para n8n chatbot
export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => null);
    const parsed = ChatSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Resolver usuário
    const user = await resolveUserId(parsed.data.identifier);

    const n8nUrl = process.env.N8N_CHAT_WEBHOOK_URL;

    if (!n8nUrl) {
      console.warn("N8N_CHAT_WEBHOOK_URL not configured");
      return NextResponse.json(
        {
          reply: "Chat bot is not configured yet. Please set up the n8n workflow.",
          error: "N8N_CHAT_WEBHOOK_URL not set"
        },
        { status: 200 }
      );
    }

    // Chamar webhook do n8n
    const resp = await fetch(n8nUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: user.id,
        identifier: user.identifier,
        message: parsed.data.message,
        app_base_url: process.env.APP_BASE_URL || "https://ai-ops-inbox.vercel.app",
      }),
    });

    if (!resp.ok) {
      console.error("n8n webhook error:", resp.status, resp.statusText);
      return NextResponse.json(
        { reply: "Sorry, I couldn't process your request. Please try again." },
        { status: 200 }
      );
    }

    const data = await resp.json().catch(() => ({}));

    return NextResponse.json({
      reply: data.reply ?? data.message ?? "Command processed successfully.",
      raw: data
    });
  } catch (err) {
    console.error("Chat API error:", err);
    return NextResponse.json(
      { reply: "Sorry, something went wrong. Please try again." },
      { status: 200 }
    );
  }
}
