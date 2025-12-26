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

export function calcGross(net: number, vat: number): number {
  return roundMoney(net + vat);
}
