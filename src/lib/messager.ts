export interface MessagerRecipient {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  personalizationFocus: string;
  time: string;
  subject: string;
  message: string;
}

export const messagerFooterHtml = `
<div style="font-family: Arial, sans-serif; font-size:12px; color:#555; margin-top:25px; padding-top:15px; border-top:1px solid #ddd;">
  <img src="https://www.zeabroker.com/footer.png" alt="ZEA Brokers" width="140" border="0" style="display:block; margin-bottom:8px; outline:none; text-decoration:none;">
  <p style="margin:0; line-height:1.5;">
    <strong>Carson Hall</strong>, Founder, Licensed Life &amp; Health Agent<br>
    (513) 613-0281<br>
    <a href="https://www.zeabroker.com" style="color:#555; text-decoration:none;">www.zeabroker.com</a><br>
    NPN: 21639402
  </p>
  <p style="font-size:10px; color:#888; margin-top:8px; line-height:1.4;">
    This message is for informational purposes only and does not constitute a solicitation, recommendation, or endorsement of any specific insurance product or carrier.
  </p>
</div>`;

export function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function messageToHtml(message: string) {
  return `
    <div style="font-family: Arial, sans-serif; font-size:14px; color:#222; line-height:1.5;">
      ${escapeHtml(message).replace(/\n/g, "<br>")}
    </div>
    ${messagerFooterHtml}`;
}

export function normalizeRecipient(row: Record<string, unknown>): MessagerRecipient {
  const email = row.Email ?? row.email ?? row.To ?? row.to;
  const subject = row.Subject ?? row.subject;
  const message = row.Message ?? row.message ?? row.Body ?? row.body ?? row["Email Body"] ?? "";

  return {
    firstName: String(row["First Name"] ?? row.FirstName ?? ""),
    lastName: String(row["Last Name"] ?? row.LastName ?? ""),
    email: String(email ?? "").trim(),
    company: String(row["Company Name for Emails"] ?? row.Company ?? ""),
    personalizationFocus: String(row.Personalization_Focus ?? ""),
    time: String(row.Time ?? ""),
    subject: String(subject ?? "").trim(),
    message: String(message ?? "").trim()
  };
}

export function validateRecipient(recipient: MessagerRecipient) {
  return Boolean(recipient.email && recipient.subject && recipient.message);
}
