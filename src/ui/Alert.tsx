import type { ReactNode } from "react";

type AlertTone = "error" | "info";

type AlertProps = {
  title?: string;
  message: string;
  tone?: AlertTone;
  action?: ReactNode;
};

const toneStyles: Record<AlertTone, string> = {
  error: "border-red-500/25 bg-red-500/10 text-red-800 dark:text-red-200",
  info: "border-blue-500/25 bg-blue-500/10 text-blue-800 dark:text-blue-200",
};

export function Alert({ title, message, tone = "info", action }: AlertProps) {
  return (
    <div
      className={`flex flex-col gap-2 rounded-xl border p-3 text-sm ${toneStyles[tone]}`}
      role={tone === "error" ? "alert" : "status"}
    >
      <div className="flex flex-col gap-1">
        {title && <div className="font-semibold">{title}</div>}
        <div>{message}</div>
      </div>
      {action && <div className="flex">{action}</div>}
    </div>
  );
}
