# Tests & Checks

## Build
```bash
npm run build
```

## E2E (Playwright)
```bash
npm run test
# oder
npm run test:e2e
```

## Server Tests (Node test runner)
```bash
npm run test:server
```

## UI/Unit (Vitest)
```bash
npm run test:ui
```

## Debug-Tipps
- Wenn E2E flaky ist: prüfe zuerst ENV (Supabase), dann stabilisiere Selectors.
- Wenn der Server lokal nicht erreichbar ist: `npm run dev:server` separat starten und Logs checken.
