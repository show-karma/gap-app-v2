import { Hex } from "viem";

export default function getTokensUnderOwner(address: Hex) {
  return {
    query: `
        {
            claims(first: 5, where: {owner: "${address}"}) {
              id
              creation
              tokenID
              contract
              creator
              owner
              uri
              totalUnits
            }
          }
        `,
    variables: {},
  };
}
