import type { Position } from "../types";

export function roundMoney(value: number, digits = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function calcNet(positions: Position[]): number {
  const net = (positions ?? []).reduce((acc, p) => {
    const qty = Number(p.quantity ?? 0);
    const price = Number(p.price ?? 0);
    return acc + qty * price;
  }, 0);
  return roundMoney(net);
}

export function calcVat(net: number, vatRate: number): number {
  const rate = Number(vatRate ?? 0) / 100;
  return roundMoney(net * rate);
}

export function getPositionTaxRate(position: Position, fallbackVatRate = 0): number {
  if (position.taxCategory === "SMALL_BUSINESS" || position.taxCategory === "ZERO" || position.taxCategory === "EXEMPT") return 0;
  return Number(position.taxRate ?? fallbackVatRate ?? 0);
}

export function calcPositionVat(positions: Position[], fallbackVatRate = 0): number {
  return roundMoney((positions ?? []).reduce((sum, position) => {
    const net = Number(position.quantity ?? 0) * Number(position.price ?? 0);
    return sum + net * (getPositionTaxRate(position, fallbackVatRate) / 100);
  }, 0));
}

export function calcGross(net: number, vat: number): number {
  return roundMoney(net + vat);
}
