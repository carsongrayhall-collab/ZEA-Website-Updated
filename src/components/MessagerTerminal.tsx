"use client";

import { useMemo, useState } from "react";

interface Recipient {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  personalizationFocus: string;
  time: string;
  subject: string;
  message: string;
}

interface SendResult {
  email: string;
  subject: string;
  ok: boolean;
  id: string | null;
  error: string | null;
}

type MessagerMode = "single" | "outreach";

const emptySingleRecipient: Recipient = {
  firstName: "",
  lastName: "",
  email: "",
  company: "",
  personalizationFocus: "",
  time: "",
  subject: "",
  message: ""
};

function escapeHtml(value: string) {
  return value.replace(/[&<>]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[char] ?? char);
}

function footerHtml() {
  return `<div style="font-family: Arial, sans-serif; font-size:12px; color:#555; margin-top:25px; padding-top:15px; border-top:1px solid #ddd;">
  <img src="https://www.zeabroker.com/footer.png" alt="ZEA Brokers" width="140" border="0" style="display:block; margin-bottom:8px; outline:none; text-decoration:none;">
  <p style="margin:0; line-height:1.5;"><strong>Carson Hall</strong>, Founder, Licensed Life &amp; Health Agent<br>
  (513) 613-0281<br><a href="https://www.zeabroker.com" style="color:#555; text-decoration:none;">www.zeabroker.com</a><br>NPN: 21639402</p>
  <p style="font-size:10px; color:#888; margin-top:8px; line-height:1.4;">This message is for informational purposes only and does not constitute a solicitation, recommendation, or endorsement of any specific insurance product or carrier.</p></div>`;
}

function previewHtml(message: string) {
  return `<div style="font-family: Arial, sans-serif; font-size:14px; color:#222; line-height:1.5;">${escapeHtml(message).replace(/\n/g, "<br>")}</div>${footerHtml()}`;
}

export function MessagerTerminal() {
  const [mode, setMode] = useState<MessagerMode>("single");
  const [pin, setPin] = useState("");
  const [fromEmail, setFromEmail] = useState("Carson Hall <carson.hall@zeabroker.com>");
  const [replyTo, setReplyTo] = useState("carson.hall@zeabroker.com");
  const [unsubscribeUrl, setUnsubscribeUrl] = useState("https://www.zeabroker.com/unsubscribe");
  const [delaySeconds, setDelaySeconds] = useState(5);
  const [singleRecipient, setSingleRecipient] = useState<Recipient>(emptySingleRecipient);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [previewIndex, setPreviewIndex] = useState(0);
  const [status, setStatus] = useState("Single send mode ready.");
  const [log, setLog] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);

  const current = recipients[previewIndex];
  const previewRecipient = mode === "single" ? singleRecipient : current;
  const selectedRecipients = useMemo(
    () => recipients.filter((_, index) => selected.has(index)).slice(0, 25),
    [recipients, selected]
  );
  const singleCanSend = Boolean(
    pin.trim() && singleRecipient.email.trim() && singleRecipient.subject.trim() && singleRecipient.message.trim()
  );

  const appendLog = (line: string) => {
    setLog((entries) => [`[${new Date().toLocaleTimeString()}] ${line}`, ...entries].slice(0, 80));
  };

  const updateSingleRecipient = (field: keyof Recipient, value: string) => {
    setSingleRecipient((currentRecipient) => ({
      ...currentRecipient,
      [field]: value
    }));
  };

  const loadFile = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    setStatus("Parsing spreadsheet...");

    const response = await fetch("/api/messager-bot-cloud/parse", {
      method: "POST",
      body: formData
    });
    const data = (await response.json()) as {
      rows?: Recipient[];
      sheetName?: string;
      skipped?: number;
      error?: string;
    };

    if (!response.ok || !data.rows) {
      throw new Error(data.error ?? "Unable to parse spreadsheet.");
    }

    setRecipients(data.rows);
    setSelected(new Set(data.rows.map((_, index) => index)));
    setPreviewIndex(0);
    setStatus(`Loaded ${data.rows.length} valid rows from ${data.sheetName}. Skipped ${data.skipped}.`);
    appendLog(`Loaded ${data.rows.length} recipients.`);
  };

  const loadDefaultTemplate = async () => {
    setStatus("Loading default template...");
    const response = await fetch("/messager-default-template.xlsx");
    if (!response.ok) {
      throw new Error("Default template is not available.");
    }
    const blob = await response.blob();
    const file = new File([blob], "messager-default-template.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    await loadFile(file);
  };

  const toggle = (index: number) => {
    setSelected((currentSelected) => {
      const next = new Set(currentSelected);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const sendMessages = async (recipientsToSend: Recipient[], sendDelaySeconds: number, label: string) => {
    setIsSending(true);
    appendLog(
      `Sending ${recipientsToSend.length} ${label} message(s)${
        recipientsToSend.length > 1 && sendDelaySeconds > 0 ? ` with ${sendDelaySeconds}s between each send` : ""
      }.`
    );
    try {
      const response = await fetch("/api/messager-bot-cloud/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin,
          fromEmail,
          replyTo,
          unsubscribeUrl,
          delaySeconds: sendDelaySeconds,
          recipients: recipientsToSend
        })
      });
      const data = (await response.json()) as { results?: SendResult[]; error?: string };

      if (!response.ok || !data.results) {
        throw new Error(data.error ?? "Unable to send messages.");
      }

      data.results.forEach((result) => {
        appendLog(
          result.ok
            ? `Sent ${result.email} (${result.id})`
            : `Failed ${result.email}: ${result.error ?? "Unknown error"}`
        );
      });
      setStatus(`Finished sending ${data.results.length} message(s).`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to send messages.";
      setStatus(message);
      appendLog(`Error: ${message}`);
    } finally {
      setIsSending(false);
    }
  };

  const sendSingle = async () => {
    if (!pin.trim()) {
      const message = "Enter the terminal PIN before sending a single message.";
      setStatus(message);
      appendLog(`Error: ${message}`);
      return;
    }

    if (!singleRecipient.email.trim() || !singleRecipient.subject.trim() || !singleRecipient.message.trim()) {
      const message = "Add a recipient email, subject, and message before sending.";
      setStatus(message);
      appendLog(`Error: ${message}`);
      return;
    }

    await sendMessages([{ ...singleRecipient }], 0, "single-send");
  };

  const sendSelected = async () => {
    await sendMessages(selectedRecipients, delaySeconds, "outreach");
  };

  const switchMode = (nextMode: MessagerMode) => {
    setMode(nextMode);
    setStatus(nextMode === "single" ? "Single send mode ready." : "Outreach mode ready for spreadsheet upload.");
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="flex justify-end lg:col-span-2">
        <div className="inline-flex border border-[rgba(110,31,27,0.24)] bg-[rgba(255,255,255,0.38)] p-1" aria-label="Messager mode">
          <button
            type="button"
            className={`px-4 py-2 font-serif text-sm transition ${
              mode === "single" ? "bg-burgundy text-[rgba(255,248,246,0.96)]" : "text-burgundy hover:bg-[rgba(110,31,27,0.06)]"
            }`}
            onClick={() => switchMode("single")}
          >
            Single Send
          </button>
          <button
            type="button"
            className={`px-4 py-2 font-serif text-sm transition ${
              mode === "outreach" ? "bg-burgundy text-[rgba(255,248,246,0.96)]" : "text-burgundy hover:bg-[rgba(110,31,27,0.06)]"
            }`}
            onClick={() => switchMode("outreach")}
          >
            Outreach
          </button>
        </div>
      </div>

      <section className="section-card space-y-5 p-5">
        <div className="space-y-2">
          <h2 className="font-serif text-[1.9rem] text-burgundy">Control Terminal</h2>
          <p className="font-body text-[0.92rem] leading-6 text-text">
            {mode === "single"
              ? "Send one protected ZEA email without a spreadsheet. The approved footer is added automatically."
              : "Upload an outreach spreadsheet, preview every message, then send selected messages through the ZEA Resend account."}
          </p>
        </div>

        <div className="grid gap-3">
          <label className="block text-sm text-text">
            <span className="mb-2 block">Terminal PIN</span>
            <input
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              type="password"
              className="field-base"
              autoComplete="one-time-code"
            />
          </label>
          <label className="block text-sm text-text">
            <span className="mb-2 block">From</span>
            <input value={fromEmail} onChange={(event) => setFromEmail(event.target.value)} className="field-base" />
          </label>
          <label className="block text-sm text-text">
            <span className="mb-2 block">Reply-To</span>
            <input value={replyTo} onChange={(event) => setReplyTo(event.target.value)} className="field-base" />
          </label>
          <label className="block text-sm text-text">
            <span className="mb-2 block">Unsubscribe URL</span>
            <input
              value={unsubscribeUrl}
              onChange={(event) => setUnsubscribeUrl(event.target.value)}
              className="field-base"
            />
          </label>
          {mode === "single" ? (
            <>
              <label className="block text-sm text-text">
                <span className="mb-2 block">Recipient Email</span>
                <input
                  value={singleRecipient.email}
                  onChange={(event) => updateSingleRecipient("email", event.target.value)}
                  type="email"
                  className="field-base"
                  placeholder="recipient@example.com"
                />
              </label>
              <label className="block text-sm text-text">
                <span className="mb-2 block">Subject</span>
                <input
                  value={singleRecipient.subject}
                  onChange={(event) => updateSingleRecipient("subject", event.target.value)}
                  className="field-base"
                  placeholder="Email subject"
                />
              </label>
              <label className="block text-sm text-text">
                <span className="mb-2 block">Message</span>
                <textarea
                  value={singleRecipient.message}
                  onChange={(event) => updateSingleRecipient("message", event.target.value)}
                  className="field-base min-h-[13rem] resize-y"
                  placeholder="Write the message body. The ZEA footer will be added when sent."
                />
              </label>
            </>
          ) : (
            <>
              <label className="block text-sm text-text">
                <span className="mb-2 block">Cooldown Between Sends, Seconds</span>
                <input
                  value={delaySeconds}
                  min={0}
                  max={20}
                  type="number"
                  onChange={(event) => setDelaySeconds(Number(event.target.value || 0))}
                  className="field-base"
                />
                <span className="mt-2 block text-xs leading-5 text-mutedTone">
                  Applied after each message before the next selected recipient is sent.
                </span>
              </label>
              <label className="block text-sm text-text">
                <span className="mb-2 block">Spreadsheet</span>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="field-base"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) loadFile(file).catch((error) => setStatus(error.message));
                  }}
                />
              </label>
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          {mode === "outreach" ? (
            <>
              <button
                type="button"
                className="border border-burgundy px-5 py-2 font-serif text-burgundy transition hover:bg-[rgba(110,31,27,0.06)]"
                onClick={() => loadDefaultTemplate().catch((error) => setStatus(error.message))}
              >
                Load Default
              </button>
              <button
                type="button"
                className="border border-burgundy px-5 py-2 font-serif text-burgundy transition hover:bg-[rgba(110,31,27,0.06)] disabled:opacity-50"
                disabled={!recipients.length}
                onClick={() => setSelected(new Set(recipients.map((_, index) => index)))}
              >
                Select All
              </button>
              <button
                type="button"
                className="border border-burgundy px-5 py-2 font-serif text-burgundy transition hover:bg-[rgba(110,31,27,0.06)] disabled:opacity-50"
                disabled={!recipients.length}
                onClick={() => setSelected(new Set())}
              >
                Clear
              </button>
            </>
          ) : null}
          <button
            type="button"
            className="bg-burgundy px-5 py-2 font-serif text-[rgba(255,248,246,0.96)] transition hover:opacity-90 disabled:opacity-50"
            disabled={isSending || (mode === "single" ? !singleCanSend : !selectedRecipients.length)}
            onClick={mode === "single" ? sendSingle : sendSelected}
          >
            {isSending ? "Sending..." : mode === "single" ? "Send Single Email" : `Send ${selectedRecipients.length}`}
          </button>
        </div>

        <p className="font-body text-sm leading-6 text-mutedTone">{status}</p>
      </section>

      <section className="section-card min-h-[32rem] space-y-5 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-serif text-[1.9rem] text-burgundy">Preview</h2>
          <div className="flex items-center gap-2 text-sm text-mutedTone">
            <button
              type="button"
              className="border border-[rgba(110,31,27,0.24)] px-3 py-1 text-burgundy disabled:opacity-40"
              disabled={mode === "single" || !recipients.length}
              onClick={() => setPreviewIndex(Math.max(0, previewIndex - 1))}
            >
              Prev
            </button>
            <span>{mode === "single" ? "Single" : recipients.length ? `${previewIndex + 1} / ${recipients.length}` : "0 / 0"}</span>
            <button
              type="button"
              className="border border-[rgba(110,31,27,0.24)] px-3 py-1 text-burgundy disabled:opacity-40"
              disabled={mode === "single" || !recipients.length}
              onClick={() => setPreviewIndex(Math.min(recipients.length - 1, previewIndex + 1))}
            >
              Next
            </button>
          </div>
        </div>

        <div className="grid gap-3 text-sm text-text">
          <div>
            <span className="text-mutedTone">To:</span>{" "}
            {previewRecipient?.email || (mode === "single" ? "No recipient entered" : "No recipient loaded")}
          </div>
          <div>
            <span className="text-mutedTone">Subject:</span> {previewRecipient?.subject ?? ""}
          </div>
        </div>

        <iframe
          title="Email preview"
          className="h-[24rem] w-full border border-[rgba(110,31,27,0.18)] bg-white"
          srcDoc={previewRecipient?.message ? previewHtml(previewRecipient.message) : ""}
        />
      </section>

      {mode === "outreach" ? (
        <section className="section-card space-y-4 p-5 lg:col-span-2">
          <h2 className="font-serif text-[1.9rem] text-burgundy">Recipients</h2>
          <div className="max-h-[24rem] overflow-auto border border-[rgba(110,31,27,0.16)]">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <thead className="sticky top-0 bg-parchment text-burgundy">
                <tr>
                  <th className="p-3">Send</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Subject</th>
                  <th className="p-3">Company</th>
                </tr>
              </thead>
              <tbody>
                {recipients.length ? (
                  recipients.map((recipient, index) => (
                    <tr
                      key={`${recipient.email}-${index}`}
                      className="cursor-pointer border-t border-[rgba(110,31,27,0.12)] hover:bg-[rgba(110,31,27,0.04)]"
                      onClick={() => setPreviewIndex(index)}
                    >
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selected.has(index)}
                          onChange={() => toggle(index)}
                          onClick={(event) => event.stopPropagation()}
                        />
                      </td>
                      <td className="p-3">{recipient.email}</td>
                      <td className="p-3">{recipient.subject}</td>
                      <td className="p-3">{recipient.company}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="p-4 text-mutedTone" colSpan={4}>
                      No recipients loaded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="section-card space-y-4 p-5 lg:col-span-2">
        <h2 className="font-serif text-[1.9rem] text-burgundy">Activity Log</h2>
        <pre className="min-h-[12rem] overflow-auto whitespace-pre-wrap bg-[rgba(255,255,255,0.45)] p-4 text-xs leading-5 text-text">
          {log.length ? log.join("\n") : "No activity yet."}
        </pre>
      </section>
    </div>
  );
}
