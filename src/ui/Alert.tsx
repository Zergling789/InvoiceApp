import type { ReactNode } from "react";

type AlertTone = "error" | "info";

type AlertProps = {
  title?: string;
  message: string;
  tone?: AlertTone;
  action?: ReactNode;
};

const toneStyles: Record<AlertTone, string> = {
  error: "border-red-200 bg-red-50 text-red-800",
  info: "border-blue-200 bg-blue-50 text-blue-800",
};

export function Alert({ title, message, tone = "info", action }: AlertProps) {
  return (
    <div className={`flex flex-col gap-2 rounded border p-3 text-sm ${toneStyles[tone]}`}>
      <div className="flex flex-col gap-1">
        {title && <div className="font-semibold">{title}</div>}
        <div>{message}</div>
      </div>
      {action && <div className="flex">{action}</div>}
    </div>
  );
}
