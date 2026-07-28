import { supabase } from "@/supabaseClient";

export type DocumentDeliveryStatus = "sent" | "failed" | "status_unknown" | "cancelled";

export type DocumentDelivery = {
  id: string;
  documentType: "offer" | "invoice";
  documentId: string;
  projectId: string | null;
  recipient: string;
  cc: string | null;
  bcc: string | null;
  subject: string;
  status: "processing" | DocumentDeliveryStatus;
  providerMessageId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  sentAt: string | null;
  failedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type DeliveryRow = {
  id: string;
  document_type: "offer" | "invoice";
  document_id: string;
  project_id: string | null;
  recipient: string;
  cc: string | null;
  bcc: string | null;
  subject: string;
  status: "processing" | DocumentDeliveryStatus;
  provider_message_id: string | null;
  error_code: string | null;
  error_message: string | null;
  sent_at: string | null;
  failed_at: string | null;
  created_at: string;
  updated_at: string;
};

const mapDelivery = (row: DeliveryRow): DocumentDelivery => ({
  id: row.id,
  documentType: row.document_type,
  documentId: row.document_id,
  projectId: row.project_id,
  recipient: row.recipient,
  cc: row.cc,
  bcc: row.bcc,
  subject: row.subject,
  status: row.status,
  providerMessageId: row.provider_message_id,
  errorCode: row.error_code,
  errorMessage: row.error_message,
  sentAt: row.sent_at,
  failedAt: row.failed_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

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
  const row = unwrapSingle(data as unknown as DeliveryRow | DeliveryRow[] | null);
  if (!row?.id) throw new Error("Versandprotokoll konnte nicht angelegt werden.");
  return mapDelivery(row);
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
  const row = unwrapSingle(data as unknown as DeliveryRow | DeliveryRow[] | null);
  if (!row?.id) throw new Error("Versandprotokoll konnte nicht aktualisiert werden.");
  return mapDelivery(row);
}

export async function listDocumentDeliveries(input: {
  documentType: "offer" | "invoice";
  documentId: string;
  limit?: number;
}): Promise<DocumentDelivery[]> {
  const { data, error } = await supabase
    .from("document_deliveries" as never)
    .select("id,document_type,document_id,project_id,recipient,cc,bcc,subject,status,provider_message_id,error_code,error_message,sent_at,failed_at,created_at,updated_at")
    .eq("document_type", input.documentType)
    .eq("document_id", input.documentId)
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.min(input.limit ?? 20, 100)));

  if (error) throw error;
  return ((data ?? []) as unknown as DeliveryRow[]).map(mapDelivery);
}

export async function listProjectDeliveries(projectId: string, limit = 50): Promise<DocumentDelivery[]> {
  const { data, error } = await supabase
    .from("document_deliveries" as never)
    .select("id,document_type,document_id,project_id,recipient,cc,bcc,subject,status,provider_message_id,error_code,error_message,sent_at,failed_at,created_at,updated_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.min(limit, 100)));

  if (error) throw error;
  return ((data ?? []) as unknown as DeliveryRow[]).map(mapDelivery);
}
