import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import type {
  Filing,
  Financials,
  Foundation,
  Grant,
  Nonprofit,
  Officer,
  QueryResponse,
} from "../types/philanthropy";

export const philanthropyService = {
  async query(message: string): Promise<QueryResponse> {
    const [data, error] = await fetchData<QueryResponse>(
      INDEXER.V2.PHILANTHROPY.QUERY,
      "POST",
      { message },
      {},
      {},
      false
    );
    if (error) throw new Error(error);
    return data!;
  },

  async getFoundation(id: string): Promise<Foundation> {
    const [data, error] = await fetchData<Foundation>(
      INDEXER.V2.PHILANTHROPY.FOUNDATIONS.GET(id),
      "GET",
      {},
      {},
      {},
      false
    );
    if (error) throw new Error(error);
    return data!;
  },

  async getFoundationGrants(id: string): Promise<Grant[]> {
    const [data, error] = await fetchData<Grant[]>(
      INDEXER.V2.PHILANTHROPY.FOUNDATIONS.GRANTS(id),
      "GET",
      {},
      {},
      {},
      false
    );
    if (error) throw new Error(error);
    return data ?? [];
  },

  async getFoundationOfficers(id: string): Promise<Officer[]> {
    const [data, error] = await fetchData<Officer[]>(
      INDEXER.V2.PHILANTHROPY.FOUNDATIONS.OFFICERS(id),
      "GET",
      {},
      {},
      {},
      false
    );
    if (error) throw new Error(error);
    return data ?? [];
  },

  async getFoundationFinancials(id: string): Promise<Financials[]> {
    const [data, error] = await fetchData<Financials[]>(
      INDEXER.V2.PHILANTHROPY.FOUNDATIONS.FINANCIALS(id),
      "GET",
      {},
      {},
      {},
      false
    );
    if (error) throw new Error(error);
    return data ?? [];
  },

  async getFoundationFiling(id: string, year: number): Promise<Filing> {
    const [data, error] = await fetchData<Filing>(
      INDEXER.V2.PHILANTHROPY.FOUNDATIONS.FILING(id, year),
      "GET",
      {},
      {},
      {},
      false
    );
    if (error) throw new Error(error);
    return data!;
  },

  async getNonprofit(id: string): Promise<Nonprofit> {
    const [data, error] = await fetchData<Nonprofit>(
      INDEXER.V2.PHILANTHROPY.NONPROFITS.GET(id),
      "GET",
      {},
      {},
      {},
      false
    );
    if (error) throw new Error(error);
    return data!;
  },

  async getNonprofitGrants(id: string): Promise<Grant[]> {
    const [data, error] = await fetchData<Grant[]>(
      INDEXER.V2.PHILANTHROPY.NONPROFITS.GRANTS(id),
      "GET",
      {},
      {},
      {},
      false
    );
    if (error) throw new Error(error);
    return data ?? [];
  },

  async getGrant(id: string): Promise<Grant> {
    const [data, error] = await fetchData<Grant>(
      INDEXER.V2.PHILANTHROPY.GRANTS.GET(id),
      "GET",
      {},
      {},
      {},
      false
    );
    if (error) throw new Error(error);
    return data!;
  },
};
