import type { Client } from "../types";

export function createEmptyClient(id: string): Client {
  return {
    id,
    companyName: "",
    contactPerson: "",
    email: "",
    address: "",
    notes: "",
  };
}

export function normalizeClient(client: Client): Client {
  return {
    ...client,
    companyName: client.companyName ?? "",
    contactPerson: client.contactPerson ?? "",
    email: client.email ?? "",
    address: client.address ?? "",
    notes: client.notes ?? "",
  };
}
