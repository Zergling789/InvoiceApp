import { useEffect, useRef, useState, type InputHTMLAttributes } from "react";

type AppNumberInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "inputMode" | "max" | "min" | "onChange" | "step" | "type" | "value"
> & {
  value: number | null | undefined;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number | "any";
  suffix?: string;
};

const formatInputValue = (value: number | null | undefined) =>
  value == null || !Number.isFinite(value) ? "" : String(value);

const parseInputValue = (text: string) => Number(text.replace(",", "."));

export function AppNumberInput({
  value,
  onValueChange,
  min,
  max,
  step,
  suffix,
  className,
  onBlur,
  onFocus,
  ...inputProps
}: AppNumberInputProps) {
  const [text, setText] = useState(() => formatInputValue(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(formatInputValue(value));
  }, [value]);

  const input = (
    <input
      {...inputProps}
      type="text"
      inputMode={step === 1 ? "numeric" : "decimal"}
      className={className}
      value={text}
      onFocus={(event) => {
        focused.current = true;
        onFocus?.(event);
      }}
      onBlur={(event) => {
        focused.current = false;
        const parsed = parseInputValue(text);
        if (
          text.trim() === "" ||
          !Number.isFinite(parsed) ||
          (min != null && parsed < min) ||
          (max != null && parsed > max)
        ) {
          setText(formatInputValue(value));
        }
        onBlur?.(event);
      }}
      onChange={(event) => {
        const nextText = event.target.value;
        if (!/^-?\d*(?:[.,]\d*)?$/.test(nextText)) return;
        setText(nextText);
        if (nextText.trim() === "") return;

        const parsed = parseInputValue(nextText);
        if (
          Number.isFinite(parsed) &&
          (min == null || parsed >= min) &&
          (max == null || parsed <= max)
        ) {
          onValueChange(parsed);
        }
      }}
      data-min={min}
      data-max={max}
      data-step={step}
    />
  );

  if (!suffix) return input;

  return (
    <span className="relative block">
      {input}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-[var(--app-muted)]"
      >
        {suffix}
      </span>
    </span>
  );
}
