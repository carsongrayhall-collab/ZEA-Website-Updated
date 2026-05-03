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
  const [pin, setPin] = useState("");
  const [fromEmail, setFromEmail] = useState("Carson Hall <carson.hall@zeabroker.com>");
  const [replyTo, setReplyTo] = useState("carson.hall@zeabroker.com");
  const [unsubscribeUrl, setUnsubscribeUrl] = useState("https://www.zeabroker.com/unsubscribe");
  const [delaySeconds, setDelaySeconds] = useState(5);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [previewIndex, setPreviewIndex] = useState(0);
  const [status, setStatus] = useState("Awaiting spreadsheet upload.");
  const [log, setLog] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);

  const current = recipients[previewIndex];
  const selectedRecipients = useMemo(
    () => recipients.filter((_, index) => selected.has(index)).slice(0, 25),
    [recipients, selected]
  );

  const appendLog = (line: string) => {
    setLog((entries) => [`[${new Date().toLocaleTimeString()}] ${line}`, ...entries].slice(0, 80));
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

  const sendSelected = async () => {
    setIsSending(true);
    appendLog(
      `Sending ${selectedRecipients.length} message(s)${
        selectedRecipients.length > 1 && delaySeconds > 0 ? ` with ${delaySeconds}s between each send` : ""
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
          delaySeconds,
          recipients: selectedRecipients
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

  return (
    <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="section-card space-y-5 p-5">
        <div className="space-y-2">
          <h2 className="font-serif text-[1.9rem] text-burgundy">Control Terminal</h2>
          <p className="font-body text-[0.92rem] leading-6 text-text">
            Upload an outreach spreadsheet, preview every message, then send selected messages through the ZEA Resend account.
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
        </div>

        <div className="flex flex-wrap gap-3">
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
          <button
            type="button"
            className="bg-burgundy px-5 py-2 font-serif text-[rgba(255,248,246,0.96)] transition hover:opacity-90 disabled:opacity-50"
            disabled={isSending || !selectedRecipients.length}
            onClick={sendSelected}
          >
            {isSending ? "Sending..." : `Send ${selectedRecipients.length}`}
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
              disabled={!recipients.length}
              onClick={() => setPreviewIndex(Math.max(0, previewIndex - 1))}
            >
              Prev
            </button>
            <span>{recipients.length ? `${previewIndex + 1} / ${recipients.length}` : "0 / 0"}</span>
            <button
              type="button"
              className="border border-[rgba(110,31,27,0.24)] px-3 py-1 text-burgundy disabled:opacity-40"
              disabled={!recipients.length}
              onClick={() => setPreviewIndex(Math.min(recipients.length - 1, previewIndex + 1))}
            >
              Next
            </button>
          </div>
        </div>

        <div className="grid gap-3 text-sm text-text">
          <div>
            <span className="text-mutedTone">To:</span> {current?.email ?? "No recipient loaded"}
          </div>
          <div>
            <span className="text-mutedTone">Subject:</span> {current?.subject ?? ""}
          </div>
        </div>

        <iframe
          title="Email preview"
          className="h-[24rem] w-full border border-[rgba(110,31,27,0.18)] bg-white"
          srcDoc={current ? previewHtml(current.message) : ""}
        />
      </section>

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

      <section className="section-card space-y-4 p-5 lg:col-span-2">
        <h2 className="font-serif text-[1.9rem] text-burgundy">Activity Log</h2>
        <pre className="min-h-[12rem] overflow-auto whitespace-pre-wrap bg-[rgba(255,255,255,0.45)] p-4 text-xs leading-5 text-text">
          {log.length ? log.join("\n") : "No activity yet."}
        </pre>
      </section>
    </div>
  );
}
