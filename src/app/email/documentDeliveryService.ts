import { supabase } from "@/supabaseClient";

export type DocumentDeliveryStatus = "sent" | "failed" | "status_unknown" | "cancelled";

export type DocumentDelivery = {
  id: string;
  status: "processing" | DocumentDeliveryStatus;
};

const unwrapSingle = <T>(data: T | T[] | null): T | null => {
  if (Array.isArray(data)) return data[0] ?? null;
  return data;
};

export async function beginDocumentDelivery(input: {
  documentType: "offer" | "invoice";
  documentId: string;
  recipient: string;
  cc?: string;
  bcc?: string;
  subject: string;
}): Promise<DocumentDelivery> {
  const { data, error } = await supabase.rpc("begin_document_delivery" as never, {
    p_document_type: input.documentType,
    p_document_id: input.documentId,
    p_recipient: input.recipient,
    p_cc: input.cc ?? null,
    p_bcc: input.bcc ?? null,
    p_subject: input.subject,
  } as never);

  if (error) throw error;
  const delivery = unwrapSingle(data as unknown as DocumentDelivery | DocumentDelivery[] | null);
  if (!delivery?.id) throw new Error("Versandprotokoll konnte nicht angelegt werden.");
  return delivery;
}

export async function completeDocumentDelivery(input: {
  deliveryId: string;
  status: DocumentDeliveryStatus;
  providerMessageId?: string;
  errorCode?: string;
  errorMessage?: string;
}): Promise<DocumentDelivery> {
  const { data, error } = await supabase.rpc("complete_document_delivery" as never, {
    p_delivery_id: input.deliveryId,
    p_status: input.status,
    p_provider_message_id: input.providerMessageId ?? null,
    p_error_code: input.errorCode ?? null,
    p_error_message: input.errorMessage ?? null,
  } as never);

  if (error) throw error;
  const delivery = unwrapSingle(data as unknown as DocumentDelivery | DocumentDelivery[] | null);
  if (!delivery?.id) throw new Error("Versandprotokoll konnte nicht aktualisiert werden.");
  return delivery;
}
