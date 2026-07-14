import QRCode from "qrcode";

const compact = (value) => String(value ?? "").replace(/\s+/g, "").toUpperCase();
const validIban = (value) => {
  const iban = compact(value);
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  const rearranged = `${iban.slice(4)}${iban.slice(0, 4)}`.replace(/[A-Z]/g, char => String(char.charCodeAt(0) - 55));
  let remainder = 0;
  for (const digit of rearranged) remainder = (remainder * 10 + Number(digit)) % 97;
  return remainder === 1;
};

export const buildEpcQrPayload = ({ beneficiary, iban, bic, amount, reference }) => {
  const cleanIban = compact(iban);
  const cleanBic = compact(bic);
  const numericAmount = Number(amount);
  if (!beneficiary || String(beneficiary).length > 70) throw Object.assign(new Error("Invalid beneficiary."), { code: "PAYMENT_QR_BENEFICIARY_INVALID" });
  if (!validIban(cleanIban)) throw Object.assign(new Error("Invalid IBAN."), { code: "PAYMENT_QR_IBAN_INVALID" });
  if (cleanBic && !/^[A-Z0-9]{8}([A-Z0-9]{3})?$/.test(cleanBic)) throw Object.assign(new Error("Invalid BIC."), { code: "PAYMENT_QR_BIC_INVALID" });
  if (!Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > 999999999.99) throw Object.assign(new Error("Invalid amount."), { code: "PAYMENT_QR_AMOUNT_INVALID" });
  const remittance = String(reference ?? "").trim().slice(0, 140);
  return ["BCD", "002", "1", "SCT", cleanBic, String(beneficiary).trim(), cleanIban, `EUR${numericAmount.toFixed(2)}`, "", "", remittance, ""].join("\n");
};

export const createEpcQrDataUrl = async (input) => QRCode.toDataURL(buildEpcQrPayload(input), { errorCorrectionLevel: "M", margin: 1, width: 300 });
