const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

export const buildOfferRecipientEmail = (message, recipientUrl) => {
  const messageText = String(message ?? "").trim();
  const actionText = "Angebot online ansehen und annehmen:";
  const text = [messageText, actionText, recipientUrl].filter(Boolean).join("\n\n");
  const messageHtml = escapeHtml(messageText).replaceAll("\n", "<br>");
  const safeUrl = escapeHtml(recipientUrl);

  return {
    text,
    html: `<div style="font-family:Arial,sans-serif;color:#171717;line-height:1.6">${messageHtml ? `<p>${messageHtml}</p>` : ""}<p>${actionText}</p><p><a href="${safeUrl}" style="display:inline-block;border-radius:8px;background:#2563eb;color:#fff;padding:12px 18px;text-decoration:none;font-weight:600">Angebot ansehen und beantworten</a></p><p style="font-size:12px;color:#666;word-break:break-all">${safeUrl}</p></div>`,
  };
};
