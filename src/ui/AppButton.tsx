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
    "min-h-[44px] px-4 py-2.5 rounded-md font-medium text-sm transition-colors flex items-center gap-2 " +
    "disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500/60";

  const variants: Record<ButtonVariant, string> = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400",
    secondary:
      "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-800",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20",
    ghost: "text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800",
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
