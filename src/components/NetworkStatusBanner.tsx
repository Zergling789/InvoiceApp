import { useEffect, useRef, useState } from "react";
import { CloudOff, Wifi } from "lucide-react";

export function NetworkStatusBanner() {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [showRestored, setShowRestored] = useState(false);
  const wasOffline = useRef(!navigator.onLine);
  const restoredTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const clearRestoredTimer = () => {
      if (restoredTimer.current) window.clearTimeout(restoredTimer.current);
      restoredTimer.current = undefined;
    };
    const handleOffline = () => {
      clearRestoredTimer();
      wasOffline.current = true;
      setShowRestored(false);
      setOnline(false);
    };
    const handleOnline = () => {
      setOnline(true);
      if (wasOffline.current) {
        clearRestoredTimer();
        wasOffline.current = false;
        setShowRestored(true);
        restoredTimer.current = window.setTimeout(() => setShowRestored(false), 3000);
      }
    };
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      clearRestoredTimer();
    };
  }, []);

  if (online && !showRestored) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-x-3 top-3 z-[120] mx-auto flex max-w-xl items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg safe-top ${
        online
          ? "border-emerald-300 bg-emerald-50 text-emerald-900"
          : "border-amber-300 bg-amber-50 text-amber-950"
      }`}
    >
      {online ? <Wifi size={18} aria-hidden="true" /> : <CloudOff size={18} aria-hidden="true" />}
      {online
        ? "Internetverbindung wiederhergestellt."
        : "Keine Internetverbindung. Speichern und Senden sind erst wieder möglich, wenn du online bist."}
    </div>
  );
}
