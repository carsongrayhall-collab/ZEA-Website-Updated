import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { messageToHtml, type MessagerRecipient } from "@/lib/messager";

export const runtime = "nodejs";

interface SendPayload {
  pin?: string;
  fromEmail?: string;
  replyTo?: string;
  unsubscribeUrl?: string;
  recipients?: MessagerRecipient[];
}

function verifyPin(pin: string | undefined) {
  const expected = process.env.MESSAGER_TERMINAL_PIN;
  if (!expected) {
    throw new Error("MESSAGER_TERMINAL_PIN is not configured in Vercel.");
  }
  if (!pin || pin !== expected) {
    throw new Error("Invalid terminal PIN.");
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as SendPayload;
    verifyPin(payload.pin);

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: "RESEND_API_KEY is not configured in Vercel." }, { status: 500 });
    }

    const recipients = (payload.recipients ?? []).filter(
      (recipient) => recipient.email && recipient.subject && recipient.message
    );

    if (!recipients.length) {
      return NextResponse.json({ error: "No valid recipients selected." }, { status: 400 });
    }

    if (recipients.length > 25) {
      return NextResponse.json({ error: "Send 25 recipients or fewer per batch." }, { status: 400 });
    }

    const from = payload.fromEmail || process.env.MESSAGER_FROM_EMAIL || "ZEA Brokers <contact@zeabroker.com>";
    const replyTo = payload.replyTo || process.env.MESSAGER_REPLY_TO || "contact@zeabroker.com";
    const unsubscribeUrl = payload.unsubscribeUrl || "https://www.zeabroker.com/unsubscribe";
    const resend = new Resend(process.env.RESEND_API_KEY);
    const headerStore = await headers();
    const ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

    const results = [];
    for (const [index, recipient] of recipients.entries()) {
      const result = await resend.emails.send({
        from,
        to: recipient.email,
        replyTo,
        subject: recipient.subject,
        html: messageToHtml(recipient.message),
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          "X-Entity-Ref-ID": `zea-terminal/${Date.now()}/${index}`,
          "X-ZEA-Terminal-IP": ip
        }
      });

      results.push({
        email: recipient.email,
        subject: recipient.subject,
        ok: !result.error,
        id: result.data?.id ?? null,
        error: result.error?.message ?? null
      });
    }

    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not send messages." },
      { status: 400 }
    );
  }
}
