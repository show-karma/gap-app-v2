// import type { ApiRequest } from "@show-karma/karma-gap-sdk";
// import { handler as sponsorTxnHandler } from "@show-karma/karma-gap-sdk";
// import { NextApiResponse } from "next";

// const handler = (req: Request, res: Response) =>{
//     sponsorTxnHandler(req as ApiRequest, res, "NEXT_GELATO_API_KEY");
// }

// export const GET = handler;
// export const POST = handler;
export const GET = () => {
  return new Response("");
};
