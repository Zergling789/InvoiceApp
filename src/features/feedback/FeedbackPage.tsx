import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import { AppButton } from "@/ui/AppButton";
import { AppCard } from "@/ui/AppCard";
import { useToast } from "@/ui/FeedbackProvider";
import { dbCreateFeedback, dbListFeedback } from "@/db/feedbackDb";
import { formatDate } from "@/types";
import type { FeedbackEntry } from "@/types";

const ratingOptions = [
  { label: "Sehr gut", value: 5 },
  { label: "Gut", value: 4 },
  { label: "Okay", value: 3 },
  { label: "Schwach", value: 2 },
  { label: "Schlecht", value: 1 },
];

export default function FeedbackPage() {
  const toast = useToast();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState("");
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFeedback = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dbListFeedback();
      setEntries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Feedback konnte nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFeedback();
  }, [loadFeedback]);

  const resetForm = () => {
    setSubject("");
    setMessage("");
    setRating("");
  };

  const submitFeedback = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();

    if (!trimmedSubject || !trimmedMessage) {
      toast.error("Bitte Betreff und Nachricht ausfuellen.");
      return;
    }

    setSubmitting(true);
    try {
      await dbCreateFeedback({
        subject: trimmedSubject,
        message: trimmedMessage,
        rating: rating ? Number(rating) : null,
      });
      toast.success("Danke! Dein Feedback wurde gespeichert.");
      resetForm();
      await loadFeedback();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Feedback konnte nicht gespeichert werden.");
    } finally {
      setSubmitting(false);
    }
  };

  const hasEntries = useMemo(() => entries.length > 0, [entries.length]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-gray-900">Feedback</h1>
        <p className="text-sm text-gray-600">
          Teile uns mit, was dir gefaellt oder was wir verbessern koennen.
        </p>
      </div>

      <AppCard>
        <form className="space-y-4" onSubmit={submitFeedback}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Betreff *</label>
              <input
                className="w-full border rounded p-3 text-base"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="z.B. Wunsch fuer neue Funktion"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bewertung</label>
              <select
                className="w-full border rounded p-3 text-base bg-white"
                value={rating}
                onChange={(event) => setRating(event.target.value)}
              >
                <option value="">Keine Auswahl</option>
                {ratingOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nachricht *</label>
            <textarea
              className="w-full border rounded p-3 text-base"
              rows={5}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Schreibe dein Feedback hier..."
            />
          </div>

          <div className="flex justify-end">
            <AppButton type="submit" disabled={submitting}>
              {submitting ? "Speichere..." : "Feedback senden"}
            </AppButton>
          </div>
        </form>
      </AppCard>

      <AppCard>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Deine letzten Rueckmeldungen</h2>
          <AppButton variant="secondary" onClick={loadFeedback} disabled={loading}>
            Aktualisieren
          </AppButton>
        </div>
        {error && <div className="mt-3 text-sm text-red-700">{error}</div>}
        {loading ? (
          <div className="mt-4 text-gray-500">Lade...</div>
        ) : !hasEntries ? (
          <div className="mt-4 text-gray-500">Noch kein Feedback hinterlegt.</div>
        ) : (
          <div className="mt-4 divide-y">
            {entries.map((entry) => (
              <div key={entry.id} className="py-4 space-y-2">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div className="font-semibold text-gray-900">{entry.subject}</div>
                  <div className="text-xs text-gray-500">
                    {formatDate(entry.createdAt)}
                    {entry.rating ? ` · Bewertung ${entry.rating}/5` : ""}
                  </div>
                </div>
                <div className="text-sm text-gray-700 whitespace-pre-line">{entry.message}</div>
              </div>
            ))}
          </div>
        )}
      </AppCard>
    </div>
  );
}
