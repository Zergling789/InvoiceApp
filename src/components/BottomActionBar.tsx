import { useState } from "react";
import { MoreVertical } from "lucide-react";

import { AppButton } from "@/ui/AppButton";

export type MenuAction = {
  label: string;
  onClick: () => void | Promise<void>;
  danger?: boolean;
  disabled?: boolean;
};

type BottomActionBarProps = {
  primaryLabel: string;
  onPrimary: () => void | Promise<void>;
  primaryDisabled?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
  menuActions?: MenuAction[];
  loading?: boolean;
};

export function BottomActionBar({
  primaryLabel,
  onPrimary,
  primaryDisabled = false,
  secondaryLabel = "Schließen",
  onSecondary,
  menuActions = [],
  loading = false,
}: BottomActionBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const hasMenu = menuActions.length > 0;
  const primaryText = loading ? `${primaryLabel}...` : primaryLabel;

  const handleMenuAction = async (action: MenuAction) => {
    setMenuOpen(false);
    await action.onClick();
  };

  return (
    <div className="bottom-action-bar safe-area-container">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {onSecondary && (
            <AppButton variant="ghost" onClick={onSecondary}>
              {secondaryLabel}
            </AppButton>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hasMenu && (
            <div className="relative">
              <AppButton
                variant="ghost"
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-label="Mehr Optionen"
              >
                <MoreVertical size={18} />
              </AppButton>
              {menuOpen && (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-40 cursor-default"
                    onPointerDown={() => setMenuOpen(false)}
                    aria-label="Menü schließen"
                  />
                  <div className="absolute right-0 bottom-full mb-2 z-50 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                    {menuActions.map((action) => (
                      <button
                        key={action.label}
                        type="button"
                        className={[
                          "w-full px-4 py-2.5 text-left text-sm transition",
                          action.danger ? "text-red-600 hover:bg-red-50" : "text-gray-700 hover:bg-gray-50",
                          action.disabled ? "opacity-50 cursor-not-allowed" : "",
                        ].join(" ")}
                        onClick={() => void handleMenuAction(action)}
                        disabled={action.disabled}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          <AppButton onClick={onPrimary} disabled={primaryDisabled || loading}>
            {primaryText}
          </AppButton>
        </div>
      </div>
    </div>
  );
}

export default BottomActionBar;
