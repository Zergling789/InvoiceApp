type TrackProps = Record<string, string | number | boolean | null | undefined>;

type PlausibleFn = (event: string, opts?: { props?: TrackProps }) => void;

export function trackEvent(event: string, props?: TrackProps): void {
  if (typeof window === "undefined") return;
  const plausible = (window as { plausible?: PlausibleFn }).plausible;
  if (typeof plausible === "function") {
    plausible(event, { props });
    return;
  }
  if (import.meta.env.DEV) {
    console.debug("[track]", event, props ?? {});
  }
}
