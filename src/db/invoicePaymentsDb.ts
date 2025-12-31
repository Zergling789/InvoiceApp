import { supabase } from "@/supabaseClient";
import type { InvoicePayment } from "@/types";

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);

  const user = data.session?.user;
  if (!user) throw new Error("Nicht eingeloggt");

  return user.id;
}

export async function dbListInvoicePayments(invoiceId: string): Promise<InvoicePayment[]> {
  const uid = await requireUserId();

  const { data, error } = await supabase
    .from("invoice_payments")
    .select("*")
    .eq("user_id", uid)
    .eq("invoice_id", invoiceId)
    .order("paid_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((r: any) => ({
    id: r.id,
    invoiceId: r.invoice_id,
    amountCents: Number(r.amount_cents ?? 0),
    currency: r.currency ?? "EUR",
    paidAt: r.paid_at,
    method: r.method ?? null,
    note: r.note ?? null,
    createdAt: r.created_at ?? null,
  }));
}

export async function dbAddInvoicePayment(payment: InvoicePayment): Promise<void> {
  const uid = await requireUserId();

  const payload = {
    id: payment.id,
    user_id: uid,
    invoice_id: payment.invoiceId,
    amount_cents: Number(payment.amountCents ?? 0),
    currency: payment.currency ?? "EUR",
    paid_at: payment.paidAt,
    method: payment.method ?? null,
    note: payment.note ?? null,
    created_at: payment.createdAt ?? new Date().toISOString(),
  };

  const { error } = await supabase.from("invoice_payments").insert(payload);
  if (error) throw new Error(error.message);
}

export async function dbDeleteInvoicePayment(id: string): Promise<void> {
  const uid = await requireUserId();

  const { error } = await supabase.from("invoice_payments").delete().eq("id", id).eq("user_id", uid);
  if (error) throw new Error(error.message);
}
