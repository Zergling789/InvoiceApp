import { Link } from "react-router-dom";

import ThemeToggle from "@/components/ThemeToggle";

const benefits = [
  "Du schickst Rechnungen mit ruhigem Gefühl raus.",
  "Du musst später nicht rumfummeln oder nachbessern.",
  "Du wirkst souverän, auch wenn du selten abrechnest.",
];

const testimonials = [
  {
    quote: "Endlich ohne Bauchweh beim Abschicken.",
    author: "Freelancer, Design",
  },
  {
    quote: "Die Schritte sind klar, ich werde geführt statt belehrt.",
    author: "Solo-Selbstständige, Beratung",
  },
  {
    quote: "Ich brauche nur gelegentlich eine Rechnung — jetzt passt es.",
    author: "Freelancer, Development",
  },
];

const faqs = [
  {
    question: "Ist das für seltene Rechnungen gedacht?",
    answer:
      "Ja. Die Oberfläche ist so aufgebaut, dass du auch nach Wochen wieder sicher einsteigen kannst.",
  },
  {
    question: "Muss ich mich mit Steuern oder Recht auskennen?",
    answer:
      "Nein. Du bekommst klare Hinweise, aber keine Rechts- oder Steuerberatung.",
  },
  {
    question: "Kann ich später noch etwas ändern?",
    answer:
      "Ja, solange du die Rechnung nicht finalisierst. Danach bleibt sie unverändert, damit du nicht versehentlich etwas zerstörst.",
  },
  {
    question: "Was passiert, wenn ich unsicher bin?",
    answer:
      "Du wirst durch die wichtigsten Angaben geführt und kannst die Rechnung vor dem Versand prüfen.",
  },
  {
    question: "Kann ich es erstmal anschauen, ohne mich festzulegen?",
    answer: "Ja, du kannst die Demo nutzen, um den Ablauf zu sehen.",
  },
  {
    question: "Ist das auch für Teams geeignet?",
    answer:
      "Der Fokus liegt auf Solo-Selbstständigen. Für Teams ist es aktuell nicht optimiert.",
  },
];

function HeroSection() {
  return (
    <section className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
      <div className="space-y-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-300">
          FreelanceFlow
        </p>
        <h1 className="text-4xl font-semibold leading-tight text-gray-900 dark:text-white sm:text-5xl">
          Rechnungen, die beim ersten Mal stimmen.
        </h1>
        <p className="text-lg text-gray-600 dark:text-slate-300">
          Du schreibst zu wenige Rechnungen, um Routine zu haben – aber zu viele, um
          Fehler zu riskieren.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
          >
            Kostenlos starten
          </Link>
          <Link
            to="/demo/angebotdetails"
            className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition hover:border-gray-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-500"
          >
            Demo ansehen
          </Link>
        </div>
        <ul className="space-y-2 text-sm text-gray-600 dark:text-slate-300">
          {benefits.map((benefit) => (
            <li key={benefit} className="flex items-start gap-2">
              <span className="mt-1 h-2 w-2 rounded-full bg-indigo-500" />
              <span>{benefit}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="space-y-4">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            Einmal richtig. Dann abgeschlossen.
          </p>
          <p className="text-sm text-gray-600 dark:text-slate-300">
            Für Freelancer, die jedes Mal hoffen, dass ihre Rechnung schon stimmt.
          </p>
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
            Du wirst Schritt für Schritt durch die Pflichtangaben geführt – ohne Fachsprache,
            ohne Chaos.
          </div>
        </div>
      </div>
    </section>
  );
}

function SocialProofSection() {
  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Echte Stimmen, echte Erleichterung.
        </h2>
        <p className="text-sm text-gray-600 dark:text-slate-400">
          Datenschutz &amp; Datenhoheit sind uns wichtig.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {testimonials.map((item) => (
          <figure
            key={item.quote}
            className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
          >
            <blockquote className="text-sm text-gray-700 dark:text-slate-200">
              “{item.quote}”
            </blockquote>
            <figcaption className="mt-4 text-xs font-semibold text-gray-500 dark:text-slate-400">
              {item.author}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function ProblemSolutionSection() {
  return (
    <section className="space-y-8">
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
        Von Unsicherheit zur ruhigen Rechnung.
      </h2>
      <div className="grid gap-6 md:grid-cols-3">
        {[
          {
            title: "Problem",
            text: "Du schreibst nur gelegentlich Rechnungen und musst jedes Mal nachschlagen.",
          },
          {
            title: "Konsequenz",
            text: "Jeder Versand fühlt sich riskant an – mit Angst vor Korrekturen oder Rückfragen.",
          },
          {
            title: "Lösung",
            text: "Ein klarer Ablauf, der dich führt und dir am Ende ein gutes Gefühl gibt.",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
          >
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.title}</p>
            <p className="mt-3 text-sm text-gray-600 dark:text-slate-300">{item.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    {
      title: "Daten eingeben",
      text: "Die wichtigsten Angaben werden abgefragt – nur was wirklich nötig ist.",
    },
    {
      title: "Prüfen & verstehen",
      text: "Du siehst, was fehlt, und kannst bewusst finalisieren.",
    },
    {
      title: "Sicher abschicken",
      text: "Einmal richtig. Dann abgeschlossen – ohne späteres Nachjustieren.",
    },
  ];

  return (
    <section className="space-y-8">
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">So funktioniert’s.</h2>
      <div className="grid gap-6 md:grid-cols-3">
        {steps.map((step, index) => (
          <div
            key={step.title}
            className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-300">
              Schritt {index + 1}
            </p>
            <p className="mt-3 text-base font-semibold text-gray-900 dark:text-white">
              {step.title}
            </p>
            <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">{step.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function NotForYouSection() {
  const bullets = [
    "Du schreibst täglich Rechnungen und brauchst Massen-Workflows.",
    "Du willst Experimente mit rechtlichen Sonderfällen – ohne jede Absicherung.",
    "Du suchst komplexe Team- und Freigabeprozesse.",
  ];

  return (
    <section className="space-y-6 rounded-3xl border border-gray-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Nicht für dich, wenn …</h2>
      <ul className="space-y-3 text-sm text-gray-600 dark:text-slate-300">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex items-start gap-2">
            <span className="mt-1 h-2 w-2 rounded-full bg-gray-400 dark:bg-slate-500" />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function FAQSection() {
  return (
    <section className="space-y-8">
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">FAQ</h2>
      <div className="grid gap-6 md:grid-cols-2">
        {faqs.map((item) => (
          <div
            key={item.question}
            className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
          >
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.question}</p>
            <p className="mt-3 text-sm text-gray-600 dark:text-slate-300">{item.answer}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FinalCTASection() {
  return (
    <section className="rounded-3xl border border-indigo-100 bg-indigo-50 p-8 text-center dark:border-indigo-900/60 dark:bg-indigo-950/40">
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
        Mach Schluss mit dem „Hoffentlich stimmt’s“-Gefühl.
      </h2>
      <p className="mt-3 text-sm text-gray-600 dark:text-slate-300">
        Starte in wenigen Minuten – ohne Druck, aber mit Klarheit.
      </p>
      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          to="/login"
          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
        >
          Kostenlos starten
        </Link>
        <Link
          to="/demo/angebotdetails"
          className="inline-flex items-center justify-center rounded-lg border border-indigo-200 bg-white px-6 py-3 text-sm font-semibold text-indigo-700 transition hover:border-indigo-300 dark:border-indigo-700 dark:bg-slate-900 dark:text-indigo-200"
        >
          Demo ansehen
        </Link>
      </div>
    </section>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pt-10 lg:px-10">
        <div className="flex justify-end">
          <ThemeToggle />
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 pb-16 pt-6 lg:px-10">
        <HeroSection />
        <SocialProofSection />
        <ProblemSolutionSection />
        <HowItWorksSection />
        <NotForYouSection />
        <FAQSection />
        <FinalCTASection />
      </div>
    </div>
  );
}
