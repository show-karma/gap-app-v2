import { envVars } from '@/utilities/enviromentVars';
import { errorManager } from '@/components/Utilities/errorManager';
import type {
  DonationApiResponse,
  CreateDonationRequest,
  OnrampRequest,
  OnrampResponse
} from '@/hooks/donation/types';

const API_URL = envVars.NEXT_PUBLIC_GAP_INDEXER_URL;

async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response
      .text()
      .catch(() => 'Unable to read error response');

    const error = new Error(
      `API request failed: ${response.status} ${response.statusText}`
    );

    errorManager('Donation service API error', error, {
      statusCode: response.status,
      statusText: response.statusText,
      errorBody: errorText
    });

    throw error;
  }

  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    const error = new Error('Server returned non-JSON response');
    errorManager('Invalid content-type from donation endpoint', error, {
      contentType,
      url: response.url
    });
    throw error;
  }

  try {
    const json = await response.json();
    return json.data;
  } catch (error) {
    if (error instanceof SyntaxError) {
      const jsonError = new Error('Server returned invalid JSON');
      errorManager('JSON parsing failed for donation service', jsonError, {
        url: response.url,
        originalError: error.message
      });
      throw jsonError;
    }
    throw error;
  }
}

export const donationsService = {
  async getUserDonations(
    walletAddress: string
  ): Promise<DonationApiResponse[]> {
    try {
      const url = `${API_URL}/v2/donations/user/${walletAddress}`;
      const response = await fetch(url);
      return handleApiResponse<DonationApiResponse[]>(response);
    } catch (error) {
      errorManager('Failed to fetch user donations', error, {
        walletAddress
      });
      throw error;
    }
  },

  async getProjectDonations(
    projectUID: string
  ): Promise<DonationApiResponse[]> {
    try {
      const url = `${API_URL}/v2/donations/project/${projectUID}`;
      const response = await fetch(url);
      return handleApiResponse<DonationApiResponse[]>(response);
    } catch (error) {
      errorManager('Failed to fetch project donations', error, {
        projectUID
      });
      throw error;
    }
  },

  async createDonation(
    request: CreateDonationRequest
  ): Promise<DonationApiResponse> {
    try {
      const url = `${API_URL}/v2/donations`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });
      return handleApiResponse<DonationApiResponse>(response);
    } catch (error) {
      errorManager('Failed to create donation record', error, {
        donorAddress: request.donorAddress,
        projectUID: request.projectUID,
        amount: request.amount,
        tokenSymbol: request.tokenSymbol
      });
      throw error;
    }
  },

  async createOnrampUrl(request: OnrampRequest): Promise<OnrampResponse> {
    try {
      const url = `${API_URL}/v2/onramp/create`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });
      return handleApiResponse<OnrampResponse>(response);
    } catch (error) {
      errorManager('Failed to create onramp URL', error, {
        projectId: request.projectId,
        fiatAmount: request.fiatAmount,
        fiatCurrency: request.fiatCurrency
      });
      throw error;
    }
  }
};
