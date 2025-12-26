import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export default function HomePage() {
  return (
    <div className="landing">
      <header className="landing__nav">
        <div className="landing__brand">FreelanceFlow</div>
        <nav className="landing__nav-actions">
          <Link to="/login" className="landing__link">
            Login
          </Link>
          <Link to="/login" className="landing__button">
            Loslegen <ArrowRight size={16} />
          </Link>
        </nav>
      </header>

      <section className="landing__hero">
        <div className="landing__hero-copy">
          <p className="landing__eyebrow">Invoice App fuer Selbststaendige</p>
          <h1>Von Angebot bis Rechnung. Klar, schnell, professionell.</h1>
          <p className="landing__lead">
            Verwalte Kunden, Projekte, Angebote und Rechnungen in einem klaren
            Workflow. Weniger Admin, mehr Arbeit an deinen Projekten.
          </p>
          <div className="landing__actions">
            <Link to="/login" className="landing__button landing__button--solid">
              Login und starten <ArrowRight size={16} />
            </Link>
            <a href="#features" className="landing__button landing__button--ghost">
              Mehr erfahren
            </a>
          </div>
          <div className="landing__trust">
            <span>
              <CheckCircle2 size={16} /> Supabase Login
            </span>
            <span>
              <CheckCircle2 size={16} /> PDF Export
            </span>
            <span>
              <CheckCircle2 size={16} /> DACH Ready
            </span>
          </div>
        </div>
        <div className="landing__hero-card">
          <div className="landing__hero-card-header">
            <span>Aktuelle Woche</span>
            <strong>3 Rechnungen offen</strong>
          </div>
          <div className="landing__hero-metric">
            <div>
              <p>Offene Angebote</p>
              <h3>5</h3>
            </div>
            <div>
              <p>Umsaetze</p>
              <h3>12.480 EUR</h3>
            </div>
          </div>
          <div className="landing__hero-list">
            <div>
              <span>Design Sprint</span>
              <span className="landing__tag">Angebot</span>
            </div>
            <div>
              <span>Website Relaunch</span>
              <span className="landing__tag landing__tag--paid">Bezahlt</span>
            </div>
            <div>
              <span>Brand Audit</span>
              <span className="landing__tag landing__tag--due">Faellig</span>
            </div>
          </div>
        </div>
      </section>

      <section className="landing__features" id="features">
        <div className="landing__feature">
          <h3>Angebote, die sitzen</h3>
          <p>Baue Angebote mit klaren Positionen, Rabatten und Terminen.</p>
        </div>
        <div className="landing__feature">
          <h3>Rechnungen im Blick</h3>
          <p>Behalte Zahlungsstatus, Faelligkeiten und Mahnfristen im Auge.</p>
        </div>
        <div className="landing__feature">
          <h3>Projekte sauber dokumentiert</h3>
          <p>Halte Projekte, Kunden und Leistungsnachweise an einem Ort.</p>
        </div>
      </section>

      <section className="landing__cta">
        <div>
          <h2>Bereit fuer den naechsten Auftrag?</h2>
          <p>Logge dich ein und starte deine Rechnung in wenigen Minuten.</p>
        </div>
        <Link to="/login" className="landing__button landing__button--solid">
          Zur Loginseite <ArrowRight size={16} />
        </Link>
      </section>

      <footer className="landing__footer">
        <span>FreelanceFlow Invoice App</span>
        <span>Made for founders and freelancers.</span>
      </footer>
    </div>
  );
}
