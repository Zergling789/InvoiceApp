app.get("/api/me", requireAuth, (req, res) => {
  res.json({ ok: true, user: req.user, sessionUserId: req.session?.userId ?? null });
});
