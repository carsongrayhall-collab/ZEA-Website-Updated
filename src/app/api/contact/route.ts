import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { sendContactEmail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { contactRequestSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const payload = contactRequestSchema.parse(await request.json());
    const headerStore = await headers();
    const ip =
      headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headerStore.get("x-real-ip") ??
      "unknown";
    const limiter = rateLimit(`contact:${ip}`, 4, 60_000);

    if (!limiter.success) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a minute and try again." },
        { status: 429 }
      );
    }

    const metadata = [
      `IP: ${ip}`,
      `User-Agent: ${headerStore.get("user-agent") ?? "unknown"}`
    ].join("\n");

    await sendContactEmail({
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      message: payload.message,
      company: payload.company,
      metadata
    });

    return NextResponse.json({
      message: "Thanks, your message has been sent successfully."
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "We could not send your message. Please try again shortly."
      },
      { status: 400 }
    );
  }
}
