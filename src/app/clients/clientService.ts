import type { Client } from "@/types";
import type { ClientSummary } from "@/domain/models/Client";
import * as repo from "@/data/repositories/clientsRepo";
import { createEmptyClient as createClientTemplate } from "@/domain/models/Client";
import type { ClientPageOptions } from "@/db/clientsDb";

export const list = (): Promise<Client[]> => repo.listClients();
export const listClients = list;
export const listSummaries = (): Promise<ClientSummary[]> => repo.listClientSummaries();
export const listPage = (options: ClientPageOptions = {}) => repo.listClientsPage(options);

export const get = (id: string) => repo.getClient(id);
export const getClient = get;

export const upsert = (client: Client) => repo.saveClient(client);
export const saveClient = upsert;

export const remove = (id: string) => repo.deleteClient(id);
export const removeClient = remove;

export const createEmptyClient = (id: string) => createClientTemplate(id);
