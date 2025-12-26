import { supabase } from "@/supabaseClient";

export async function requireAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  const token = data.session?.access_token;
  if (!token) throw new Error("Nicht eingeloggt. Bitte anmelden.");
  return token;
}
