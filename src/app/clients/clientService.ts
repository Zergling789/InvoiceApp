import type { Client } from "@/types";
import * as repo from "@/data/repositories/clientsRepo";
import { createEmptyClient as createClientTemplate } from "@/domain/models/Client";

export const list = (): Promise<Client[]> => repo.listClients();
export const listClients = list;

export const get = (id: string) => repo.getClient(id);
export const getClient = get;

export const upsert = (client: Client) => repo.saveClient(client);
export const saveClient = upsert;

export const remove = (id: string) => repo.deleteClient(id);
export const removeClient = remove;

export const createEmptyClient = (id: string) => createClientTemplate(id);
