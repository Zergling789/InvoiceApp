import type { PositionTemplate, PositionTemplateInput } from "@/app/positions/positionCatalogService";
import type { TaxCategory } from "@/types";

export const UNIT_OPTIONS = [
  ["Std", "Stunde"], ["Stk", "Stück"], ["m", "Meter"], ["m²", "Quadratmeter"],
  ["m³", "Kubikmeter"], ["kg", "Kilogramm"], ["t", "Tonne"], ["Tag", "Tag"],
  ["Monat", "Monat"], ["Pauschal", "Pauschal"], ["OTHER", "Andere Einheit"],
] as const;

export type PositionForm = {
  kind: "PRODUCT" | "SERVICE";
  name: string;
  description: string;
  category: string;
  unit: string;
  price: number | null;
  taxCategory: TaxCategory;
  taxRate: number;
  productNumber: string;
  manufacturer: string;
};

export const emptyPositionForm = (smallBusiness = false): PositionForm => ({
  kind: "SERVICE", name: "", description: "", category: "", unit: "Std", price: null,
  taxCategory: smallBusiness ? "SMALL_BUSINESS" : "STANDARD", taxRate: smallBusiness ? 0 : 19,
  productNumber: "", manufacturer: "",
});

export const formFromTemplate = (template: PositionTemplate): PositionForm => ({
  kind: template.kind === "PRODUCT" ? "PRODUCT" : "SERVICE",
  name: template.name, description: template.description, category: template.category,
  unit: template.unit, price: template.default_unit_price, taxCategory: template.tax_category,
  taxRate: template.tax_rate, productNumber: template.product_number ?? "", manufacturer: template.manufacturer ?? "",
});

export const toTemplateInput = (form: PositionForm): PositionTemplateInput => ({
  kind: form.kind, name: form.name.trim(), description: form.description.trim(), category: form.category.trim(),
  unit: form.unit.trim(), defaultQuantity: 1, defaultUnitPrice: form.price,
  taxCategory: form.taxCategory, taxRate: form.taxRate,
  productNumber: form.kind === "PRODUCT" ? form.productNumber.trim() : "",
  manufacturer: form.kind === "PRODUCT" ? form.manufacturer.trim() : "",
});

export const unitLabel = (unit: string) => UNIT_OPTIONS.find(([value]) => value === unit)?.[1] ?? unit;
