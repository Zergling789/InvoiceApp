import React from "react";

type PhoneFrameProps = {
  children: React.ReactNode;
};

const IconBase = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {children}
  </svg>
);

const BackIcon = ({ className }: { className?: string }) => (
  <IconBase className={className}>
    <path d="M15 18l-6-6 6-6" />
  </IconBase>
);

const KebabIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
    <circle cx="5" cy="12" r="1.6" />
    <circle cx="12" cy="12" r="1.6" />
    <circle cx="19" cy="12" r="1.6" />
  </svg>
);

const CalendarIcon = ({ className }: { className?: string }) => (
  <IconBase className={className}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M16 3v4M8 3v4M3 11h18" />
  </IconBase>
);

const CheckIcon = ({ className }: { className?: string }) => (
  <IconBase className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12l2.5 2.5L16 9.5" />
  </IconBase>
);

const DownloadIcon = ({ className }: { className?: string }) => (
  <IconBase className={className}>
    <path d="M12 3v10" />
    <path d="M8 11l4 4 4-4" />
    <rect x="4" y="17" width="16" height="4" rx="1" />
  </IconBase>
);

const MailIcon = ({ className }: { className?: string }) => (
  <IconBase className={className}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 7l9 6 9-6" />
  </IconBase>
);

const CloseIcon = ({ className }: { className?: string }) => (
  <IconBase className={className}>
    <path d="M6 6l12 12M18 6l-12 12" />
  </IconBase>
);

const SignalIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
    <rect x="3" y="14" width="3" height="7" rx="1" />
    <rect x="8" y="11" width="3" height="10" rx="1" />
    <rect x="13" y="8" width="3" height="13" rx="1" />
    <rect x="18" y="5" width="3" height="16" rx="1" />
  </svg>
);

const WifiIcon = ({ className }: { className?: string }) => (
  <IconBase className={className}>
    <path d="M5 9c4.5-4.5 9.5-4.5 14 0" />
    <path d="M8 12c3-3 5-3 8 0" />
    <path d="M11 15c1-1 1-1 2 0" />
  </IconBase>
);

const BatteryIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 32 16" className={className} aria-hidden="true">
    <rect x="1" y="2" width="26" height="12" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
    <rect x="29" y="5" width="2" height="6" rx="1" fill="currentColor" />
    <rect x="4" y="5" width="18" height="6" rx="2" fill="currentColor" />
  </svg>
);

export const PhoneFrame = ({ children }: PhoneFrameProps) => (
  <div className="relative w-full max-w-[390px] rounded-[40px] border border-gray-200 bg-white shadow-2xl">
    <div className="flex items-center justify-between px-6 pb-2 pt-5 text-xs font-semibold text-gray-800">
      <span>09:24</span>
      <div className="flex items-center gap-2 text-gray-800">
        <SignalIcon className="h-4 w-4" />
        <WifiIcon className="h-4 w-4" />
        <div className="flex items-center gap-1 text-[10px] font-semibold">
          <BatteryIcon className="h-4 w-8" />
          <span>95</span>
        </div>
      </div>
    </div>
    <div className="flex h-[760px] flex-col">
      <div className="flex-1 overflow-y-auto px-6 pb-6">{children}</div>
      <div className="flex items-center justify-center pb-4">
        <span className="h-1.5 w-24 rounded-full bg-gray-900/80" />
      </div>
    </div>
  </div>
);

export const AngebotDetails = () => (
  <div className="space-y-5 pb-2">
    <header className="flex items-center justify-between pt-2">
      <button type="button" className="text-gray-900" aria-label="Zurück">
        <BackIcon className="h-5 w-5" />
      </button>
      <h1 className="text-lg font-semibold text-gray-900">Angebot AN-0005</h1>
      <button type="button" className="text-gray-700" aria-label="Mehr">
        <KebabIcon className="h-5 w-5" />
      </button>
    </header>

    <div className="flex items-center gap-3">
      <button
        type="button"
        className="rounded-full border border-blue-200 bg-blue-50 px-5 py-2 text-sm font-semibold text-blue-600 shadow-sm"
      >
        Details
      </button>
      <button
        type="button"
        className="rounded-full border border-gray-200 bg-white px-5 py-2 text-sm font-semibold text-gray-500 shadow-sm"
      >
        Aktivitäten
      </button>
    </div>

    <section className="rounded-[24px] border border-gray-100 bg-white p-5 shadow-md">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Zink GmbH</h2>
          <p className="text-sm text-gray-500">Meisenstraße</p>
        </div>
        <div className="text-right text-xs text-gray-600">
          <p className="text-sm font-semibold tracking-wide text-gray-900">ANGEBOT</p>
          <p>Nr: AN-0005</p>
          <p>Datum: 27.12.2025</p>
          <p>Gültig bis: 10.01.2026</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-900">
        <div className="flex items-center gap-3">
          <CalendarIcon className="h-5 w-5 text-blue-500" />
          <div>
            <p className="text-xs font-semibold uppercase text-blue-500">Datum:</p>
            <p className="font-medium text-blue-900">27. Dezember 2025</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <CheckIcon className="h-5 w-5 text-blue-500" />
          <div>
            <p className="text-xs font-semibold uppercase text-blue-500">Gültig bis:</p>
            <p className="font-medium text-blue-900">10. Januar 2026</p>
          </div>
        </div>
      </div>

      <div className="mt-4 border-t border-gray-100 pt-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-500">Zwischensumme:</span>
          <span className="text-base font-semibold text-gray-900">10,00 €</span>
        </div>
      </div>
    </section>

    <section className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-600">
        MZ
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-900">Michelle Zink</p>
        <p className="text-sm text-gray-500">Stadtgraben 61</p>
      </div>
    </section>

    <section className="rounded-[24px] border border-gray-100 bg-white p-5 shadow-md">
      <p className="text-sm text-gray-500">
        Gerne unterbreiten wir Ihnen folgendes Angebot:
      </p>

      <div className="mt-4 overflow-hidden rounded-2xl border border-gray-100">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-600">
            <tr>
              <th className="px-4 py-3">Beschreibung</th>
              <th className="px-4 py-3">Menge</th>
              <th className="px-4 py-3 text-right">Einzelpreis</th>
              <th className="px-4 py-3 text-right">Gesamt</th>
            </tr>
          </thead>
          <tbody className="text-gray-800">
            <tr className="border-t border-gray-100">
              <td className="px-4 py-3 font-medium">Malen</td>
              <td className="px-4 py-3">1 Std</td>
              <td className="px-4 py-3 text-right text-gray-500">10,00 €</td>
              <td className="px-4 py-3 text-right font-semibold text-gray-900">10,00 €</td>
            </tr>
          </tbody>
        </table>
        <div className="border-t border-gray-100 bg-white px-4 py-3 text-sm text-gray-500">
          <div className="flex justify-end gap-2">
            <span>Betrag:</span>
            <span className="font-semibold text-gray-900">10,00 €</span>
          </div>
        </div>
        <div className="border-t border-gray-100 bg-blue-50 px-4 py-3 text-sm text-gray-500">
          <div className="flex justify-end gap-2">
            <span>Wartemt</span>
            <span className="font-semibold text-gray-900">10,00 €</span>
          </div>
        </div>
      </div>
    </section>

    <section className="space-y-3 rounded-[24px] border border-gray-100 bg-white p-4 shadow-md">
      <button
        type="button"
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white shadow-sm"
      >
        <DownloadIcon className="h-4 w-4" />
        PDF herunterladen
      </button>
      <button
        type="button"
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700"
      >
        <MailIcon className="h-4 w-4" />
        Per E-Mail senden
      </button>
      <button
        type="button"
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700"
      >
        <CloseIcon className="h-4 w-4" />
        Schließen
      </button>
    </section>
  </div>
);

export default function AngebotDetailsPage() {
  return (
    <main className="min-h-screen bg-gray-100 px-4 py-10">
      <div className="flex justify-center">
        <PhoneFrame>
          <AngebotDetails />
        </PhoneFrame>
      </div>
    </main>
  );
}
