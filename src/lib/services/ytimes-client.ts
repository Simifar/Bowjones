import { appConfig } from '@/lib/config';

export interface YtimesShopRow {
  guid: string;
  name: string;
  type?: string;
  cityName?: string;
  address?: string;
  phone?: string | null;
}

export interface YtimesShiftRow {
  guid: string;
  shopGuid: string;
  date: string;
  number: number;
  userList: Array<{
    id: number;
    start: string;
    end: string | null;
  }>;
}

export class YtimesClient {
  constructor(private readonly apiKey: string, private readonly baseUrl: string = appConfig.ytimesBaseUrl) {}

  async getShops(): Promise<YtimesShopRow[]> {
    const response = await fetch(`${this.baseUrl}/shop/list`, {
      method: 'GET',
      headers: {
        Accept: 'application/json;charset=UTF-8',
        Authorization: this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Ytimes API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data?.success) {
      throw new Error(data?.error || 'Ytimes returned an unsuccessful response');
    }

    return Array.isArray(data.rows) ? data.rows : [];
  }

  async getShifts(dateFrom: string, dateTo: string): Promise<YtimesShiftRow[]> {
    const response = await fetch(`${this.baseUrl}/shift/list`, {
      method: 'POST',
      headers: {
        Accept: 'application/json;charset=UTF-8',
        'Content-Type': 'application/json;charset=UTF-8',
        Authorization: this.apiKey,
      },
      body: JSON.stringify({ dateFrom, dateTo }),
    });

    if (!response.ok) {
      throw new Error(`Ytimes API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data?.success) {
      throw new Error(data?.error || 'Ytimes returned an unsuccessful response');
    }

    return Array.isArray(data.rows) ? data.rows : [];
  }
}
