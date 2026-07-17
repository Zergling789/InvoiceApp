import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Layers3, X } from "lucide-react";

import {
  loadPositionGroups,
  type PositionGroup,
} from "@/app/positions/positionCatalogService";
import type { Position } from "@/types";
import { AppButton } from "@/ui/AppButton";

type Props = {
  onApply: (positions: Omit<Position, "id">[]) => void;
  onClose: () => void;
};

export function PositionGroupDialog({ onApply, onClose }: Props) {
  const [groups, setGroups] = useState<PositionGroup[]>([]);
  const [group, setGroup] = useState<PositionGroup | null>(null);
  const [selected, setSelected] = useState<boolean[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void loadPositionGroups()
      .then((data) => {
        if (active) setGroups(data);
      })
      .catch((cause) => {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Pakete konnten nicht geladen werden.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, []);

  if (typeof document === "undefined") return null;

  const choose = (next: PositionGroup) => {
    setGroup(next);
    setSelected(next.position_group_items.map((item) => !item.optional));
  };

  const applySelection = () => {
    if (!group) return;
    onApply(
      group.position_group_items
        .filter((_, index) => selected[index])
        .map((item) => ({
          description: item.description.trim()
            ? `${item.title}\n${item.description}`
            : item.title,
          quantity: item.quantity,
          unit: item.unit,
          price: item.unit_price ?? 0,
          taxCategory: item.tax_category,
          taxRate: item.tax_rate,
        })),
    );
  };

  return createPortal(
    <div className="app-visual-viewport fixed inset-x-0 z-[80] flex items-end justify-center bg-black/35 sm:items-center sm:p-4">
      <div
        className="app-card max-h-[96%] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-b-none p-5 safe-bottom sm:max-h-[90%] sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="group-dialog-title"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="app-eyebrow">Pakete</div>
            <h2 id="group-dialog-title" className="text-xl font-semibold">
              Paket übernehmen
            </h2>
          </div>
          <button
            type="button"
            aria-label="Schließen"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        {!group ? (
          <div className="mt-5 space-y-2">
            {groups.length === 0 ? (
              <p className="text-sm text-[var(--app-muted)]">
                Noch keine Pakete gespeichert. Du kannst sie unter „Mehr →
                Produkte &amp; Leistungen → Pakete“ anlegen.
              </p>
            ) : (
              groups.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-[var(--app-border)] p-4 text-left hover:bg-black/5"
                  onClick={() => choose(item)}
                >
                  <Layers3 size={18} />
                  <span>
                    <span className="block font-medium">{item.name}</span>
                    <span className="text-xs text-[var(--app-muted)]">
                      {item.position_group_items.length} Positionen
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        ) : (
          <div className="mt-5">
            <button
              type="button"
              className="min-h-11 text-sm text-[var(--app-primary)]"
              onClick={() => setGroup(null)}
            >
              ← Anderes Paket
            </button>
            <h3 className="mt-3 font-semibold">{group.name}</h3>
            <div className="mt-2 space-y-2">
              {group.position_group_items.map((item, index) => (
                <label
                  key={item.id ?? `${item.title}-${index}`}
                  className="flex min-h-14 gap-3 rounded-xl border border-[var(--app-border)] p-3"
                >
                  <input
                    type="checkbox"
                    checked={selected[index] ?? false}
                    onChange={(event) =>
                      setSelected((current) =>
                        current.map((value, itemIndex) =>
                          itemIndex === index ? event.target.checked : value,
                        ),
                      )
                    }
                  />
                  <span>
                    <span className="block font-medium">
                      {item.title}
                      {item.optional ? " (optional)" : ""}
                    </span>
                    <span className="text-xs text-[var(--app-muted)]">
                      {item.quantity} {item.unit} · {item.unit_price === null
                        ? "Preis prüfen"
                        : `${item.unit_price.toFixed(2)} €`}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            <AppButton
              className="mt-5 w-full sm:w-auto"
              disabled={!selected.some(Boolean)}
              onClick={applySelection}
            >
              Paket übernehmen
            </AppButton>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
