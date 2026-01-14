export default function handler(_req, res) {
  res.status(404).json({
    ok: false,
    error: {
      code: "NOT_FOUND",
      message: "Not Found",
    },
  });
}
