// server/renderDocumentHtml.js
// Renders an HTML representation of an offer/invoice that mirrors the in-app preview.

const escapeHtml = (value = "") =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatCurrency = (amount, options = {}) => {
  const locale = options.locale || "de-DE";
  const currency = options.currency || "EUR";
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(Number(amount ?? 0));
};

const formatDate = (date, locale = "de-DE") => {
  if (!date) return "";
  try {
    const d = new Date(date);
    return new Intl.DateTimeFormat(locale).format(d);
  } catch {
    return String(date);
  }
};

const sanitizeMultiline = (text = "") => escapeHtml(String(text ?? "")).replace(/\r?\n/g, "<br />");

const sumPosition = (pos) => Number(pos?.quantity ?? 0) * Number(pos?.price ?? 0);

export function renderDocumentHtml({ type, doc = {}, settings = {}, client = {} }) {
  const isInvoice = type === "invoice";
  const isSmallBusiness = isInvoice && Boolean(doc.isSmallBusiness);
  const vatRate = Number(doc.vatRate ?? 0);
  const net = Array.isArray(doc.positions) ? doc.positions.reduce((sum, p) => sum + sumPosition(p), 0) : 0;
  const vat = isSmallBusiness ? 0 : net * (vatRate / 100);
  const total = isSmallBusiness ? net : net + vat;
  const smallBusinessNote =
    doc.smallBusinessNote ??
    "Kein Steuerausweis aufgrund der Anwendung der Kleinunternehmerregelung (§ 19 UStG).";

  const companyName = settings.companyName ?? "";
  const addressLines = String(settings.address ?? "").split("\n").filter(Boolean);
  const clientDisplayName = client.companyName ?? client.name ?? "";
  const clientAddressLines = String(client.address ?? "").split("\n").filter(Boolean);

  const introHtml = doc.introText ? sanitizeMultiline(doc.introText) : "";
  const footerHtml = doc.footerText ? sanitizeMultiline(doc.footerText) : "";
  const settingsFooterHtml = settings.footerText ? sanitizeMultiline(settings.footerText) : "";

  return `
<!DOCTYPE html>
<html lang="${escapeHtml(settings.locale ?? "de-DE")}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      :root {
        --text: #1f2937;
        --muted: #6b7280;
        --border: #e5e7eb;
        --bg: #ffffff;
        --accent: #111827;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Inter", "Segoe UI", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
        color: var(--text);
        background: #f8fafc;
      }
      .page {
        width: 210mm;
        min-height: 297mm;
        margin: 0 auto;
        padding: 18mm 16mm 20mm 16mm;
        background: var(--bg);
      }
      h1, h2, h3, h4 { margin: 0; }
      .top {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 32px;
      }
      .company-name { font-size: 22px; font-weight: 700; }
      .muted { color: var(--muted); font-size: 12px; line-height: 1.5; white-space: pre-line; }
      .doc-meta { text-align: right; }
      .doc-title { font-size: 28px; font-weight: 800; letter-spacing: 0.5px; margin-bottom: 6px; }
      .meta-line { color: var(--muted); font-size: 12px; }
      .section { margin-bottom: 32px; }
      .recipient-header {
        font-size: 11px;
        color: var(--muted);
        text-decoration: underline;
        margin-bottom: 6px;
      }
      .recipient { font-size: 14px; font-weight: 600; line-height: 1.5; }
      .table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
      }
      .table th {
        text-align: left;
        font-weight: 700;
        border-bottom: 2px solid var(--border);
        padding: 8px 6px;
      }
      .table td {
        border-bottom: 1px solid var(--border);
        padding: 10px 6px;
        vertical-align: top;
      }
      .text-right { text-align: right; }
      .totals {
        margin-top: 8px;
        width: 260px;
        margin-left: auto;
        font-size: 12px;
      }
      .totals-row { display: flex; justify-content: space-between; padding: 4px 0; }
      .totals-row.total { font-weight: 700; font-size: 14px; }
      .footer {
        margin-top: 32px;
        padding-top: 16px;
        border-top: 1px solid var(--border);
        font-size: 12px;
        line-height: 1.6;
      }
      .bank {
        margin-top: 12px;
        padding: 12px;
        border: 1px solid var(--border);
        border-radius: 6px;
        background: #f9fafb;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px 12px;
      }
      .bank strong { display: block; margin-bottom: 2px; }
      .intro { margin-bottom: 16px; font-size: 12px; line-height: 1.6; }
      .doc-heading { font-size: 16px; font-weight: 700; margin-bottom: 8px; }
      .w-60 { width: 60%; }
      .w-12 { width: 12%; }
      .w-14 { width: 14%; }
      .w-14r { width: 14%; text-align: right; }
      .page-break { page-break-inside: avoid; }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="top">
        <div>
          <div class="company-name">${escapeHtml(companyName)}</div>
          <div class="muted">${addressLines.map(escapeHtml).join("<br />")}</div>
        </div>
        <div class="doc-meta">
          <div class="doc-title">${isInvoice ? "RECHNUNG" : "ANGEBOT"}</div>
          <div class="meta-line">Nr: ${escapeHtml(doc.number ?? "")}</div>
          <div class="meta-line">Datum: ${escapeHtml(formatDate(doc.date, settings.locale ?? "de-DE"))}</div>
          ${isInvoice && doc.dueDate ? `<div class="meta-line">Fällig: ${escapeHtml(formatDate(doc.dueDate, settings.locale ?? "de-DE"))}</div>` : ""}
          ${!isInvoice && doc.validUntil ? `<div class="meta-line">Gültig bis: ${escapeHtml(formatDate(doc.validUntil, settings.locale ?? "de-DE"))}</div>` : ""}
        </div>
      </div>

      <div class="section page-break">
        <div class="recipient-header">${escapeHtml(companyName)} — ${escapeHtml(addressLines[0] ?? "")}</div>
        <div class="recipient">
          ${escapeHtml(clientDisplayName)}<br />
          ${client.contactPerson ? `${escapeHtml(client.contactPerson)}<br />` : ""}
          ${clientAddressLines.map(escapeHtml).join("<br />")}
        </div>
      </div>

      <div class="section page-break">
        <div class="doc-heading">${isInvoice ? `Rechnung ${escapeHtml(doc.number ?? "")}` : `Angebot ${escapeHtml(doc.number ?? "")}`}</div>
        ${introHtml ? `<div class="intro">${introHtml}</div>` : ""}

        <table class="table">
          <thead>
            <tr>
              <th class="w-60">Beschreibung</th>
              <th class="w-12 text-right">Menge</th>
              <th class="w-14 text-right">Einzelpreis</th>
              <th class="w-14 text-right">Gesamt</th>
            </tr>
          </thead>
          <tbody>
            ${
              Array.isArray(doc.positions) && doc.positions.length
                ? doc.positions
                    .map((pos) => {
                      const totalPos = sumPosition(pos);
                      return `<tr>
                        <td>${escapeHtml(pos.description ?? "")}</td>
                        <td class="text-right">${escapeHtml(pos.quantity ?? "")} ${escapeHtml(pos.unit ?? "")}</td>
                        <td class="text-right">${formatCurrency(pos.price, { locale: settings.locale, currency: settings.currency })}</td>
                        <td class="text-right">${formatCurrency(totalPos, { locale: settings.locale, currency: settings.currency })}</td>
                      </tr>`;
                    })
                    .join("")
                : `<tr><td colspan="4" class="muted">Keine Positionen</td></tr>`
            }
          </tbody>
        </table>

        <div class="totals page-break">
          ${
            isSmallBusiness
              ? `<div class="totals-row total">
                  <span>Gesamtbetrag:</span>
                  <span>${formatCurrency(total, { locale: settings.locale, currency: settings.currency })}</span>
                </div>`
              : `<div class="totals-row">
                  <span>Netto:</span>
                  <span>${formatCurrency(net, { locale: settings.locale, currency: settings.currency })}</span>
                </div>
                <div class="totals-row" style="color: var(--muted);">
                  <span>MwSt (${vatRate}%):</span>
                  <span>${formatCurrency(vat, { locale: settings.locale, currency: settings.currency })}</span>
                </div>
                <div class="totals-row total">
                  <span>Gesamt:</span>
                  <span>${formatCurrency(total, { locale: settings.locale, currency: settings.currency })}</span>
                </div>`
          }
        </div>
        ${
          isSmallBusiness && smallBusinessNote
            ? `<div class="muted" style="margin-top: 6px;">${sanitizeMultiline(smallBusinessNote)}</div>`
            : ""
        }
      </div>

      <div class="footer page-break">
        ${footerHtml ? `<div>${footerHtml}</div>` : ""}
        ${settingsFooterHtml ? `<div>${settingsFooterHtml}</div>` : ""}

        ${
          isInvoice
            ? `<div class="bank">
                <div><strong>Bankverbindung</strong>${escapeHtml(settings.bankName ?? "")}</div>
                <div style="text-align: right;"><strong>Steuer-Nr:</strong> ${escapeHtml(settings.taxId ?? "")}</div>
                <div><strong>IBAN:</strong> ${escapeHtml(settings.iban ?? "")}</div>
                <div style="text-align: right;"><strong>BIC:</strong> ${escapeHtml(settings.bic ?? "")}</div>
              </div>
              <div class="muted" style="margin-top: 6px;">Bitte geben Sie bei der Zahlung die Rechnungsnummer an.</div>`
            : ""
        }
      </div>
    </div>
  </body>
</html>
  `;
}
