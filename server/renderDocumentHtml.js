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
const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const taxLabel = (pos, fallbackRate = 0, smallBusiness = false) => {
  const category = pos?.taxCategory ?? (smallBusiness ? "SMALL_BUSINESS" : Number(fallbackRate) === 7 ? "REDUCED" : Number(fallbackRate) === 0 ? "ZERO" : "STANDARD");
  if (category === "EXEMPT") return "Steuerfrei";
  if (category === "REVERSE_CHARGE") return "Reverse Charge";
  if (category === "SMALL_BUSINESS") return "Kleinunternehmer";
  return `${Number(pos?.taxRate ?? fallbackRate)} %`;
};

export function renderDocumentHtml({ type, doc = {}, settings = {}, client = {} }) {
  const isInvoice = type === "invoice";
  const isSmallBusiness = isInvoice && Boolean(doc.isSmallBusiness);
  const vatRate = Number(doc.vatRate ?? 0);
  const net = Array.isArray(doc.positions) ? roundMoney(doc.positions.reduce((sum, p) => sum + roundMoney(sumPosition(p)), 0)) : 0;
  const taxGroups = new Map();
  for (const position of Array.isArray(doc.positions) ? doc.positions : []) {
    const category = position.taxCategory ?? (isSmallBusiness ? "SMALL_BUSINESS" : vatRate === 0 ? "ZERO" : "STANDARD");
    const rate = ["ZERO", "EXEMPT", "REVERSE_CHARGE", "SMALL_BUSINESS"].includes(category) ? 0 : Number(position.taxRate ?? vatRate);
    const lineNet = roundMoney(sumPosition(position));
    const key = `${category}:${rate}`;
    taxGroups.set(key, { category, rate, net: roundMoney((taxGroups.get(key)?.net ?? 0) + lineNet), tax: 0, reason: position.taxExemptionReason ?? "" });
  }
  for (const group of taxGroups.values()) group.tax = roundMoney(group.net * (group.rate / 100));
  const vat = roundMoney([...taxGroups.values()].reduce((sum, group) => sum + group.tax, 0));
  const total = roundMoney(net + vat);
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
  const templateId = ["classic", "minimal", "modern"].includes(settings.templateId)
    ? settings.templateId
    : "classic";
  const primaryColor = /^#[0-9a-f]{6}$/i.test(settings.primaryColor ?? "")
    ? settings.primaryColor
    : "#4f46e5";
  const logoDataUrl = /^data:image\/(png|jpeg|webp);base64,/i.test(settings.logoDataUrl ?? "")
    ? settings.logoDataUrl
    : "";

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
        --accent: ${primaryColor};
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
      .company-logo { display: block; max-width: 45mm; max-height: 20mm; object-fit: contain; object-position: left center; margin-bottom: 10px; }
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
      .tax-breakdown { margin-top: 18px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
      .tax-card { border: 1px solid var(--border); border-radius: 6px; padding: 10px 12px; font-size: 11px; }
      .tax-card-title { font-weight: 700; margin-bottom: 7px; }
      .tax-card-row { display: flex; justify-content: space-between; gap: 12px; padding: 2px 0; }
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
      .w-60 { width: 40%; }
      .w-12 { width: 12%; }
      .w-14 { width: 14%; }
      .w-14r { width: 14%; text-align: right; }
      .w-18r { width: 18%; text-align: right; }
      .page-break { page-break-inside: avoid; }
      body.template-minimal .page { padding: 24mm 20mm; }
      body.template-minimal .top { margin-bottom: 44px; }
      body.template-minimal .company-name { font-size: 16px; font-weight: 600; }
      body.template-minimal .doc-title { font-size: 22px; font-weight: 600; letter-spacing: 2px; }
      body.template-minimal .table th { border-bottom-width: 1px; font-weight: 600; }
      body.template-minimal .bank { border: 0; border-top: 1px solid var(--border); border-radius: 0; background: transparent; padding-inline: 0; }
      body.template-modern .page { border-top: 7mm solid var(--accent); padding-top: 13mm; }
      body.template-modern .doc-title { color: var(--accent); }
      body.template-modern .table th { color: var(--accent); border-bottom-color: var(--accent); }
      body.template-modern .totals-row.total { margin-top: 5px; border-radius: 5px; background: var(--accent); color: white; padding: 9px 10px; }
      body.template-modern .bank { border-color: color-mix(in srgb, var(--accent) 28%, white); background: color-mix(in srgb, var(--accent) 6%, white); }
    </style>
  </head>
  <body class="template-${templateId}">
    <div class="page">
      <div class="top">
        <div>
          ${logoDataUrl ? `<img class="company-logo" src="${logoDataUrl}" alt="" />` : ""}
          <div class="company-name">${escapeHtml(companyName)}</div>
          <div class="muted">${addressLines.map(escapeHtml).join("<br />")}</div>
        </div>
        <div class="doc-meta">
          <div class="doc-title">${isInvoice ? "RECHNUNG" : "ANGEBOT"}</div>
          <div class="meta-line">Nr: ${escapeHtml(doc.number ?? "")}</div>
          <div class="meta-line">Datum: ${escapeHtml(formatDate(doc.date, settings.locale ?? "de-DE"))}</div>
          ${isInvoice && doc.serviceDate ? `<div class="meta-line">Leistungsdatum: ${escapeHtml(formatDate(doc.serviceDate, settings.locale ?? "de-DE"))}</div>` : ""}
          ${isInvoice && doc.servicePeriodStart && doc.servicePeriodEnd ? `<div class="meta-line">Leistungszeitraum: ${escapeHtml(formatDate(doc.servicePeriodStart, settings.locale ?? "de-DE"))} – ${escapeHtml(formatDate(doc.servicePeriodEnd, settings.locale ?? "de-DE"))}</div>` : ""}
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
              <th class="w-14 text-right">Steuer</th>
              <th class="w-18r">Gesamt</th>
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
                        <td class="text-right">${escapeHtml(taxLabel(pos, vatRate, isSmallBusiness))}</td>
                        <td class="text-right">${formatCurrency(totalPos, { locale: settings.locale, currency: settings.currency })}</td>
                      </tr>`;
                    })
                    .join("")
                : `<tr><td colspan="5" class="muted">Keine Positionen</td></tr>`
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
                ${[...taxGroups.values()].filter((group) => !["SMALL_BUSINESS", "REVERSE_CHARGE"].includes(group.category)).map((group) => `<div class="totals-row" style="color: var(--muted);"><span>${group.category === "EXEMPT" ? "Steuerfreie Umsätze" : group.category === "ZERO" ? "Umsätze mit 0 %" : `MwSt (${group.rate}%)`}:</span><span>${formatCurrency(group.category === "EXEMPT" || group.category === "ZERO" ? group.net : group.tax, { locale: settings.locale, currency: settings.currency })}</span></div>`).join("")}
                <div class="totals-row total">
                  <span>Gesamt:</span>
                  <span>${formatCurrency(total, { locale: settings.locale, currency: settings.currency })}</span>
                </div>`
          }
        </div>
        ${taxGroups.size > 0 ? `<div class="tax-breakdown page-break">${[...taxGroups.values()].map((group) => `<div class="tax-card"><div class="tax-card-title">${group.category === "SMALL_BUSINESS" ? "Kleinunternehmerregelung" : group.category === "REVERSE_CHARGE" ? "Reverse Charge" : group.category === "EXEMPT" ? "Steuerbefreite Umsätze" : group.category === "ZERO" ? "Umsätze mit 0 %" : group.category === "REDUCED" ? `Ermäßigter Steuersatz (${group.rate} %)` : `Regelsteuersatz (${group.rate} %)`}</div><div class="tax-card-row"><span>Nettobetrag</span><span>${formatCurrency(group.net, { locale: settings.locale, currency: settings.currency })}</span></div>${!["SMALL_BUSINESS", "REVERSE_CHARGE", "EXEMPT", "ZERO"].includes(group.category) ? `<div class="tax-card-row"><span>Steuerbetrag</span><span>${formatCurrency(group.tax, { locale: settings.locale, currency: settings.currency })}</span></div>` : ""}${group.reason ? `<div class="muted" style="margin-top: 5px;">Grund: ${escapeHtml(group.reason)}</div>` : ""}</div>`).join("")}</div>` : ""}
        ${
          isSmallBusiness && smallBusinessNote
            ? `<div class="muted" style="margin-top: 6px;">${sanitizeMultiline(smallBusinessNote)}</div>`
            : ""
        }
        ${[...taxGroups.values()].filter((group) => group.category === "EXEMPT" && group.reason).map((group) => `<div class="muted" style="margin-top: 6px;">Steuerbefreiung: ${escapeHtml(group.reason)}</div>`).join("")}
        ${[...taxGroups.values()].some((group) => group.category === "REVERSE_CHARGE") ? `<div class="muted" style="margin-top: 6px;">Reverse Charge: Die Steuerschuldnerschaft geht auf den Leistungsempfänger über.</div>` : ""}
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
