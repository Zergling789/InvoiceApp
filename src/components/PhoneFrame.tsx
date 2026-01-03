import type { ReactNode } from "react";

interface PhoneFrameProps {
  children: ReactNode;
}

export default function PhoneFrame({ children }: PhoneFrameProps) {
  return (
    <div className="w-full max-w-[390px] rounded-[40px] border border-gray-200/80 bg-white shadow-[0_20px_60px_-30px_rgba(15,23,42,0.45)]">
      <div className="h-[820px] max-h-[90vh] overflow-hidden rounded-[40px]">
        <div className="h-full overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
