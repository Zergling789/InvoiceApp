export default function handler(req, res) {
  // Nur GET erlauben, damit du 405 sauber erkennst
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  // Keine Caches, damit du wirklich live siehst was passiert
  res.setHeader("Cache-Control", "no-store");

  return res.status(200).json({
    ok: true,
    service: "freelanceflow",
    ts: new Date().toISOString(),
  });
}
