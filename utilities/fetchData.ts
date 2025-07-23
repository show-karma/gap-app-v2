import axios, { type Method } from "axios";
import { envVars } from "./enviromentVars";
import { getCookiesFromStoredWallet } from "./getCookiesFromStoredWallet";
import { sanitizeObject } from "./sanitize";

export default async function fetchData(
	endpoint: string,
	method: Method = "GET",
	axiosData = {},
	params = {},
	headers = {},
	isAuthorized = true,
	cache: boolean | undefined = false,
	baseUrl: string = envVars.NEXT_PUBLIC_GAP_INDEXER_URL,
) {
	try {
		const { token, walletType } = getCookiesFromStoredWallet();

		const sanitizedData = sanitizeObject(axiosData);
		const isIndexerUrl = baseUrl === envVars.NEXT_PUBLIC_GAP_INDEXER_URL;

		const requestConfig: any = {
			url: isIndexerUrl
				? `${baseUrl}${endpoint}${
						cache ? `${endpoint.includes("?") ? "&" : "?"}cache=${cache}` : ""
					}`
				: `${baseUrl}${endpoint}`,
			method,
			data: sanitizedData,
			params,
			headers: {
				...headers,
			},
		};

		if (isIndexerUrl) {
			requestConfig.headers.Authorization = isAuthorized
				? token || undefined
				: undefined;
			requestConfig.timeout = 360000;
		}

		const res = await axios.request(requestConfig);
		const resData = res.data;
		const pageInfo = res.data.pageInfo || null;
		return [resData, null, pageInfo];
	} catch (err: any) {
		let error = "";
		if (!err.response) {
			error = err;
		} else {
			error = err.response.data.message || err.message;
		}
		return [null, error];
	}
}
