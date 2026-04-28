"use client";

import { useState, useTransition } from "react";
import { SectionTitle } from "@/components/SectionTitle";

export function ContactForm() {
  const [state, setState] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const submit = async (formData: FormData) => {
    setState("idle");
    setMessage("");

    startTransition(async () => {
      const payload = Object.fromEntries(formData.entries());
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = (await response.json()) as { message?: string; error?: string };

      if (!response.ok) {
        setState("error");
        setMessage(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      setState("success");
      setMessage(data.message ?? "Your message has been sent.");
    });
  };

  return (
    <section id="contact" className="space-y-6" aria-labelledby="contact-title">
      <SectionTitle id="contact-title" title="Request a Quote" />
      <form action={submit} className="grid gap-4 md:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-4">
          <label className="block text-sm text-text">
            <span className="mb-2 block">First Name</span>
            <input name="firstName" className="field-base" autoComplete="given-name" required />
          </label>
          <label className="block text-sm text-text">
            <span className="mb-2 block">Last Name</span>
            <input name="lastName" className="field-base" autoComplete="family-name" required />
          </label>
          <label className="block text-sm text-text">
            <span className="mb-2 block">Email</span>
            <input name="email" type="email" className="field-base" autoComplete="email" required />
          </label>
          <label className="hidden">
            Website
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
          <label className="block text-sm text-text">
            <span className="mb-2 block">Coverage Needed</span>
            <input
              name="company"
              className="field-base"
              placeholder="Annuity, employee benefits, life, business..."
              autoComplete="off"
            />
          </label>
        </div>
        <div className="space-y-4">
          <label className="block text-sm text-text">
            <span className="mb-2 block">Message</span>
            <textarea
              name="message"
              className="field-base min-h-[14rem] resize-y"
              placeholder="Tell us what you want to protect, your timeline, and any current coverage details you want reviewed transparently."
              required
            />
          </label>
          <button
            type="submit"
            disabled={isPending}
            className="border border-burgundy px-5 py-2 font-serif text-burgundy transition hover:bg-[rgba(110,31,27,0.06)] disabled:opacity-60"
          >
            {isPending ? "Sending..." : "Send Request"}
          </button>
          {state !== "idle" ? (
            <p className={`text-sm ${state === "success" ? "text-text" : "text-burgundy"}`}>{message}</p>
          ) : null}
        </div>
      </form>
    </section>
  );
}
