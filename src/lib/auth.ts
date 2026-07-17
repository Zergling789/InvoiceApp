import { supabase } from "@/supabaseClient";
import { ApiRequestError } from "@/utils/errors";

export async function requireAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new ApiRequestError(error.message, 401, "NOT_AUTHENTICATED");
  const token = data.session?.access_token;
  if (!token) {
    throw new ApiRequestError("Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.", 401, "NOT_AUTHENTICATED");
  }
  return token;
}
