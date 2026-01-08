import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";

import { supabase } from "@/supabaseClient";

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setHasSession(Boolean(data.session));
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-sm text-gray-500">
        Lade…
      </div>
    );
  }

  if (hasSession) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-16 text-gray-900">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-12">
        <section className="space-y-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">
            FreelanceFlow
          </p>
          <div className="space-y-4">
            <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
              Rechnungen, die endlich fertig sind.
            </h1>
            <p className="text-base text-gray-600 sm:text-lg">
              Du schreibst zu wenige Rechnungen, um Routine zu haben – aber zu viele, um
              Fehler zu riskieren.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm"
            >
              Jetzt sicher starten
            </Link>
            <Link
              to="/demo/angebotdetails"
              className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700"
            >
              Erst ansehen, dann entscheiden
            </Link>
          </div>
          <ul className="grid gap-3 text-sm text-gray-700 sm:grid-cols-3">
            <li>Du schickst ab – ohne Bauchweh.</li>
            <li>Weniger Rückfragen, weniger Korrekturen.</li>
            <li>Mehr Kontrolle, weniger offene Enden.</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-700">
          <div className="grid gap-4 sm:grid-cols-3">
            <blockquote className="space-y-2">
              <p className="italic">„Endlich keine Unsicherheit mehr beim Abschicken.“</p>
              <p className="text-xs text-gray-500">Freelancer, Design</p>
            </blockquote>
            <blockquote className="space-y-2">
              <p className="italic">„Ich weiß jetzt, wann eine Rechnung wirklich fertig ist.“</p>
              <p className="text-xs text-gray-500">Solo-Selbstständig, Beratung</p>
            </blockquote>
            <blockquote className="space-y-2">
              <p className="italic">„Die PDF sieht jedes Mal sauber und gleich aus.“</p>
              <p className="text-xs text-gray-500">Freelancer, Entwicklung</p>
            </blockquote>
          </div>
          <p className="mt-6 text-xs text-gray-500">
            Seriös, klar, ohne Marketing-Tricks – damit du dich auf deinen Job konzentrierst.
          </p>
        </section>

        <section className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">Problem → Konsequenz → Lösung</h2>
            <p className="text-sm text-gray-600">
              Du schreibst eine Rechnung, dann beginnst du zu prüfen: Pflichtangaben,
              Format, Nummer, Datum. Jedes Mal neu.
            </p>
          </div>
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-sm text-gray-700">
            <p className="font-semibold text-gray-900">Konsequenz</p>
            <p className="mt-2">
              Du bist unsicher, schickst zu spät ab oder bekommst Rückfragen und Korrekturen.
              Das kostet Nerven, Zeit und Vertrauen.
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-700">
            <p className="font-semibold text-gray-900">Lösung</p>
            <p className="mt-2">
              Die Rechnung geht von Entwurf zu final – und ist dann gesperrt. Die PDF ist
              deterministisch, sauber, fertig. Du weißt: Jetzt ist abgeschlossen.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">So funktioniert’s</h2>
          <ol className="grid gap-4 text-sm text-gray-700 sm:grid-cols-3">
            <li className="rounded-2xl border border-gray-200 bg-white p-5">
              <p className="font-semibold text-gray-900">1. Daten eintragen</p>
              <p className="mt-2">Klar geführt, ohne Grübeln – Ergebnis: vollständiger Entwurf.</p>
            </li>
            <li className="rounded-2xl border border-gray-200 bg-white p-5">
              <p className="font-semibold text-gray-900">2. Final markieren</p>
              <p className="mt-2">Ein Klick macht Schluss – Ergebnis: Rechnung ist gesperrt.</p>
            </li>
            <li className="rounded-2xl border border-gray-200 bg-white p-5">
              <p className="font-semibold text-gray-900">3. PDF senden</p>
              <p className="mt-2">Immer gleich, immer sauber – Ergebnis: kein Nachbessern.</p>
            </li>
          </ol>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-700">
          <h2 className="text-2xl font-semibold text-gray-900">Nicht für dich, wenn …</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5">
            <li>du Spaß daran hast, jede Rechnung neu zusammenzubasteln.</li>
            <li>du bewusst mit offenen Entwürfen arbeitest.</li>
            <li>du lieber rätst, als sicher abzuschließen.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">FAQ</h2>
          <div className="grid gap-4 text-sm text-gray-700">
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <p className="font-semibold text-gray-900">Brauche ich das bei 5 Rechnungen?</p>
              <p className="mt-2">
                Genau dann ist die Unsicherheit am größten. Wenn du wenig Routine hast,
                lohnt sich ein sauberer, geführter Abschluss.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <p className="font-semibold text-gray-900">Ist das rechtssicher?</p>
              <p className="mt-2">
                Wir orientieren uns an gängigen Pflichtangaben. Eine rechtliche Beratung
                ersetzt das nicht – im Zweifel lass die Anforderungen prüfen.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <p className="font-semibold text-gray-900">Kann ich nachträglich ändern?</p>
              <p className="mt-2">
                Entwürfe kannst du bearbeiten. Finalisierte Rechnungen sind gesperrt, damit
                du verlässlich abschließt.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <p className="font-semibold text-gray-900">Was ist mit Angeboten?</p>
              <p className="mt-2">
                Angebote sind möglich – der Fokus liegt aber auf klaren, finalen Rechnungen.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <p className="font-semibold text-gray-900">Export/Steuerberater?</p>
              <p className="mt-2">
                PDFs kannst du sauber ablegen oder weitergeben. Für spezielle Exporte sprich
                am besten mit deinem Steuerberater.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <p className="font-semibold text-gray-900">Preis?</p>
              <p className="mt-2">
                Der Preis richtet sich nach deinem Bedarf. Schau im Login-Bereich nach den
                aktuellen Optionen.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-700">
          <h2 className="text-2xl font-semibold text-gray-900">
            Einmal richtig. Dann abgeschlossen.
          </h2>
          <p className="mt-2">
            Weniger Grübeln, mehr Klarheit. Starte jetzt und schick Rechnungen, bei denen du
            dir sicher bist.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm"
            >
              Jetzt sicher starten
            </Link>
            <Link
              to="/demo/angebotdetails"
              className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700"
            >
              Demo ansehen
            </Link>
          </div>
        </section>

        <section className="space-y-6 text-sm text-gray-700">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-gray-900">Alternative Headlines</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Rechnungen ohne Bauchweh.</li>
              <li>Für Freelancer, die sicher abschließen wollen.</li>
              <li>Einmal prüfen, dann fertig.</li>
              <li>Rechnungen, die nicht zurückkommen.</li>
              <li>Weniger Grübeln. Mehr Abschluss.</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-gray-900">Alternative Subheadlines</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Für Freelancer, die jedes Mal hoffen, dass ihre Rechnung stimmt.</li>
              <li>Zu wenig Routine, zu viel Risiko – hier wird’s sauber.</li>
              <li>Schreiben, finalisieren, abschicken. Ohne Zweifel.</li>
              <li>Rechnungen, die sich richtig anfühlen, bevor du sie sendest.</li>
              <li>Du willst sicher sein, nicht raten. Genau dafür ist das hier.</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
