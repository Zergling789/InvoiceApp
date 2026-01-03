import PhoneFrame from "@/components/PhoneFrame";

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function KebabIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <circle cx="12" cy="5" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="12" cy="19" r="1.6" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3v12" strokeLinecap="round" />
      <path d="M7 10l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 21h14" strokeLinecap="round" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 6l12 12M18 6l-12 12" strokeLinecap="round" />
    </svg>
  );
}

function SignalIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
      <rect x="3" y="14" width="3" height="7" rx="1" />
      <rect x="8" y="11" width="3" height="10" rx="1" />
      <rect x="13" y="8" width="3" height="13" rx="1" />
      <rect x="18" y="5" width="3" height="16" rx="1" />
    </svg>
  );
}

function WifiIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 9c4.5-4 9.5-4 14 0" strokeLinecap="round" />
      <path d="M8 12c3-3 5-3 8 0" strokeLinecap="round" />
      <path d="M11 15c1.5-1 2.5-1 4 0" strokeLinecap="round" />
      <circle cx="12" cy="18" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function BatteryIcon() {
  return (
    <svg viewBox="0 0 28 14" className="h-4 w-7" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="1" width="22" height="12" rx="3" />
      <rect x="24" y="4" width="3" height="6" rx="1" fill="currentColor" stroke="none" />
      <rect x="3" y="3" width="17" height="8" rx="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function AngebotDetails() {
  return (
    <div className="min-h-screen bg-gray-100 px-4 py-10 text-gray-900">
      <div className="mx-auto flex w-full max-w-[420px] justify-center">
        <PhoneFrame>
          <main className="flex min-h-full flex-col bg-gray-50">
            <section className="px-6 pb-6 pt-5">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
                <span className="text-sm">09:24</span>
                <div className="flex items-center gap-2 text-gray-700">
                  <SignalIcon />
                  <WifiIcon />
                  <div className="flex items-center gap-1 text-[11px] font-semibold">
                    <BatteryIcon />
                    <span>95</span>
                  </div>
                </div>
              </div>

              <header className="mt-4 flex items-center justify-between">
                <button className="rounded-full p-2 text-gray-700">
                  <BackIcon />
                </button>
                <h1 className="text-base font-semibold">Angebot AN-0005</h1>
                <button className="rounded-full p-2 text-gray-700">
                  <KebabIcon />
                </button>
              </header>

              <nav className="mt-5 flex items-center gap-3">
                <button className="rounded-full border border-blue-200 bg-blue-50 px-5 py-1.5 text-sm font-semibold text-blue-600 shadow-sm">
                  Details
                </button>
                <button className="rounded-full border border-gray-200 bg-white px-5 py-1.5 text-sm font-semibold text-gray-400">
                  Aktivitäten
                </button>
              </nav>
            </section>

            <section className="space-y-4 px-6 pb-6">
              <article className="rounded-3xl bg-white p-5 shadow-md shadow-slate-200/70">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-base font-semibold">Zink GmbH</h2>
                    <p className="text-sm text-gray-500">Meisenstraße</p>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    <p className="text-xs font-semibold tracking-wide text-gray-700">ANGEBOT</p>
                    <p>Nr: AN-0005</p>
                    <p>Datum: 27.12.2025</p>
                    <p>Gültig bis: 10.01.2026</p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-900">
                  <div className="flex items-center gap-2">
                    <CalendarIcon />
                    <span className="text-gray-500">Datum:</span>
                    <span className="font-semibold">27. Dezember 2025</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <CheckIcon />
                    <span className="text-gray-500">Gültig bis:</span>
                    <span className="font-semibold">10. Januar 2026</span>
                  </div>
                </div>

                <div className="mt-4 h-px w-full bg-gray-200" />

                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-gray-500">Zwischensumme:</span>
                  <span className="font-semibold">10,00 €</span>
                </div>
              </article>

              <div className="flex items-center gap-3 px-2">
                <div className="h-11 w-11 rounded-full bg-gray-200" />
                <div>
                  <p className="text-sm font-semibold">Michelle Zink</p>
                  <p className="text-sm text-gray-500">Stadtgraben 61</p>
                </div>
              </div>

              <article className="rounded-3xl bg-white p-5 shadow-md shadow-slate-200/70">
                <p className="text-sm text-gray-500">
                  Gerne unterbreiten wir Ihnen folgendes Angebot:
                </p>

                <div className="mt-4 h-px w-full bg-gray-200" />

                <div className="mt-4">
                  <table className="w-full text-left text-xs text-gray-500">
                    <thead className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                      <tr>
                        <th className="pb-2">Beschreibung</th>
                        <th className="pb-2">Menge</th>
                        <th className="pb-2">Einzelpreis</th>
                        <th className="pb-2 text-right">Gesamt</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="text-sm text-gray-700">
                        <td className="py-2">Malen</td>
                        <td className="py-2">1 Std</td>
                        <td className="py-2">10,00 €</td>
                        <td className="py-2 text-right font-semibold">10,00 €</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 h-px w-full bg-gray-200" />

                <div className="mt-4 space-y-2 text-right text-sm">
                  <p>
                    <span className="text-gray-500">Betrag: </span>
                    <span className="font-semibold text-gray-900">10,00 €</span>
                  </p>
                  <p className="text-gray-500">Wartemt 10,00 €</p>
                </div>
              </article>
            </section>

            <section className="mt-auto px-6 pb-8">
              <div className="space-y-3">
                <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm">
                  <DownloadIcon />
                  PDF herunterladen
                </button>
                <button className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700">
                  <MailIcon />
                  Per E-Mail senden
                </button>
                <button className="flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700">
                  <CloseIcon />
                  Schließen
                </button>
              </div>
            </section>
          </main>
        </PhoneFrame>
      </div>
    </div>
  );
}
