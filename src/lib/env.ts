type EnvValue = string | undefined;

function read(name: string): EnvValue {
  return (import.meta as any).env?.[name] ?? undefined;
}

export function requireEnv(name: string): string {
  const value = read(name);
  if (!value) throw new Error(`Environment variable ${name} fehlt.`);
  return value;
}

export function getEnv(name: string, fallback: string | null = null): string | null {
  const value = read(name);
  if (typeof value === "string" && value.length > 0) return value;
  return fallback;
}
