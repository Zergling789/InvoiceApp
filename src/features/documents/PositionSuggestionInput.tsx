import { useEffect, useId, useRef, useState } from "react";
import { LoaderCircle, Package, Wrench } from "lucide-react";

import { findPositionSuggestions, recordPositionSuggestionEvent, type PositionSuggestion } from "@/app/positions/positionSuggestionService";
import { formatMoney } from "@/utils/money";

type Props = {
  ariaLabel?: string;
  value: string;
  disabled?: boolean;
  customerId?: string;
  documentType: "invoice" | "offer";
  currency: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: PositionSuggestion) => void;
};

export function PositionSuggestionInput({ ariaLabel, value, disabled, customerId, documentType, currency, onChange, onSelect }: Props) {
  const listboxId = useId();
  const request = useRef(0);
  const [suggestions, setSuggestions] = useState<PositionSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const query = value.trim();
    if (query.length < 2 || disabled) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    const requestId = ++request.current;
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const next = await findPositionSuggestions(query, customerId);
        if (request.current !== requestId) return;
        setSuggestions(next);
        setActiveIndex(0);
        setOpen(next.length > 0);
      } catch (cause) {
        if (request.current === requestId) setError(cause instanceof Error ? cause.message : "Vorschläge konnten nicht geladen werden.");
      } finally {
        if (request.current === requestId) setLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [customerId, disabled, value]);

  const choose = (suggestion: PositionSuggestion) => {
    onSelect(suggestion);
    setOpen(false);
    void recordPositionSuggestionEvent({ customerId, documentType, query: value, suggestionType: suggestion.kind, suggestionId: suggestion.id, action: "SELECTED", originalValue: suggestion });
  };

  return <div
    className="relative min-w-0"
    onBlur={(event) => {
      const nextTarget = event.relatedTarget;
      if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return;
      setOpen(false);
    }}
  >
    <input
      className="w-full border rounded-lg p-2 text-sm"
      placeholder="Bezeichnung"
      aria-label={ariaLabel}
      value={value}
      disabled={disabled}
      role="combobox"
      aria-autocomplete="list"
      aria-expanded={open}
      aria-controls={listboxId}
      aria-activedescendant={open && suggestions[activeIndex] ? `${listboxId}-${activeIndex}` : undefined}
      onChange={(event) => onChange(event.target.value)}
      onFocus={() => suggestions.length > 0 && setOpen(true)}
      onKeyDown={(event) => {
        if (event.key === "Escape") { setOpen(false); return; }
        if (!open || suggestions.length === 0) return;
        if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex((index) => (index + 1) % suggestions.length); }
        if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((index) => (index - 1 + suggestions.length) % suggestions.length); }
        if (event.key === "Enter") { event.preventDefault(); choose(suggestions[activeIndex]); }
      }}
    />
    {loading && <LoaderCircle aria-label="Vorschläge werden geladen" className="absolute right-2 top-2.5 animate-spin text-[var(--app-muted)]" size={16} />}
    {error && <div className="mt-1 text-xs text-red-600" role="alert">{error}</div>}
    {open && <div id={listboxId} role="listbox" className="absolute z-50 mt-1 max-h-80 w-[min(38rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-1 shadow-xl">
      {suggestions.map((suggestion, index) => {
        const price = suggestion.lastPrice ?? suggestion.standardPrice;
        return <button
          id={`${listboxId}-${index}`}
          key={suggestion.id}
          type="button"
          role="option"
          aria-selected={index === activeIndex}
          className={`block w-full rounded-lg p-3 text-left text-sm ${index === activeIndex ? "bg-blue-500/10" : "hover:bg-black/5 dark:hover:bg-white/5"}`}
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => choose(suggestion)}
        >
          <span className="flex items-center gap-2 font-semibold">{suggestion.kind === "PRODUCT" ? <Package size={15} /> : <Wrench size={15} />}{suggestion.title}</span>
          {suggestion.description && <span className="mt-1 block line-clamp-2 text-xs text-[var(--app-muted)]">{suggestion.description}</span>}
          <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--app-muted)]">
            <span>{suggestion.unit}</span><span>{price === null ? "Preis nicht hinterlegt" : formatMoney(price, currency)}</span>
            {suggestion.taxRate !== null && <span>{suggestion.taxRate} % MwSt.</span>}<span>{suggestion.category || suggestion.source}</span><span>{suggestion.source}</span>
          </span>
        </button>;
      })}
    </div>}
  </div>;
}
