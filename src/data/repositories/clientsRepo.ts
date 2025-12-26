import type { Client } from "@/domain/types";
import { normalizeClient } from "@/domain/models/Client";
import { dbDeleteClient, dbGetClientById, dbListClients, dbUpsertClient } from "@/db/clientsDb";

export async function listClients(): Promise<Client[]> {
  const result = await dbListClients();
  return result.map(normalizeClient);
}

export async function getClient(id: string): Promise<Client | null> {
  const client = await dbGetClientById(id);
  return client ? normalizeClient(client) : null;
}

export async function saveClient(client: Client): Promise<void> {
  await dbUpsertClient(normalizeClient(client));
}

export async function deleteClient(id: string): Promise<void> {
  await dbDeleteClient(id);
}
