## TODO / Plan

Priorität: P1 (kritisch), P2 (sollte), P3 (kann).

1. ✅ **P1 – Routing reparieren & Feature-Komponenten füllen:** Die Pages-Implementierungen (Dashboard, Clients, Projects) nach `src/features/*` übernehmen oder sauber re-exportieren, sodass `App.tsx` wieder funktionierende Routen liefert. Kurzer Smoke-Test (Build) nachziehen.
2. ✅ **P1 – Settings-UI umsetzen:** In `src/features/settings/SettingsView.tsx` eine Maske bauen, die `dbGetSettings` lädt, alle `UserSettings`-Felder bearbeitbar macht, validiert und über `dbSaveSettings` speichert; Fehlerzustände anzeigen.
3. ✅ **P1 – Clients-UX abrunden:** Beim CRUD-Flow in der neuen Features-Komponente Lade-/Fehlerzustände abdecken und Pflichtfeld-Validierungen sicherstellen (Company-Name).
4. ✅ **P1 – Projects-UX abrunden:** Feature-Komponente mit Supabase-Interaktion (Listen/Anlegen) inkl. humanisierter Fehlertexte fertigstellen; Validierungen für Name/Client/Budgets.
5. ✅ **P2 – Dokumenten-Flows absichern:** Fehlermeldungen im Offer/Invoice-Editor/List klarer machen (z. B. bei fehlenden Settings/DueDate), und sicherstellen, dass Readonly-Ansicht & Print-Start robust bleiben.
6. ✅ **P2 – Hilfs-Layer auffüllen:** Leere Utilities (`src/lib/env.ts`, `assert.ts`, `format.ts`) und `src/components/EmptyState.tsx` mit sinnvollen Helfern bestücken oder entfernen, sofern nicht benötigt; Konsumenten anpassen.
7. ✅ **P3 – Styles & DX:** Gemeinsame Basis-Styles (`src/styles/index.css`) anbinden, README-Kurznotiz zu Setup/ENV ergänzen.

Abschlusskriterium: Alle Routen laufen, Settings bearbeitbar, Angebote/Rechnungen editier-/druckbar, Build ohne Fehler.
