import { HypercertClient } from "@hypercerts-org/sdk";

const client = new HypercertClient({
  // chain: { id: 11155111 }, // required - Optimism and Celo supported
  indexerEnvironment: "test",
});

export default client;
