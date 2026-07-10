import React from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function AppButton({
  children,
  variant = "primary",
  className = "",
  ...props
}: Props) {
  const base =
    "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold " +
    "transition-[transform,background-color,color,border-color,box-shadow] duration-200 active:scale-[0.98] " +
    "disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100";

  const variants: Record<ButtonVariant, string> = {
    primary:
      "bg-[var(--app-primary)] text-white shadow-[0_6px_18px_rgba(0,113,227,0.2)] hover:bg-[var(--app-primary-hover)] hover:shadow-[0_8px_22px_rgba(0,113,227,0.26)]",
    secondary:
      "border border-[var(--app-border)] bg-[var(--app-surface-solid)] text-[var(--app-text)] shadow-sm hover:bg-white/60 dark:hover:bg-white/10",
    danger: "bg-red-500/10 text-red-600 hover:bg-red-500/15 dark:text-red-400",
    ghost: "text-[var(--app-muted)] hover:bg-black/5 hover:text-[var(--app-text)] dark:hover:bg-white/10",
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
