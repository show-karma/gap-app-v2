import type { ApiRequest } from '@show-karma/karma-gap-sdk';
import { handler as sponsorTxnHandler } from '@show-karma/karma-gap-sdk';
import type { NextApiResponse } from 'next';

const handler = (req: ApiRequest, res: NextApiResponse) =>
  sponsorTxnHandler(req as ApiRequest, res, 'NEXT_GELATO_API_KEY');

export default handler;
