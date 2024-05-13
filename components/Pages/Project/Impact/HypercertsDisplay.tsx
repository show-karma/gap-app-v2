import tokensUnderOwner from "../../../../utilities/hypercerts/tokensUnderOwner";
import axios from "axios";
import { useEffect, useState } from "react";
import EthereumAddressToENSName from "@/components/EthereumAddressToENSName";
import { shortAddress } from "@/utilities/shortAddress";
import hypercertsClient from "@/utilities/hypercerts/hypercerts";

export default function HypertCerts() {
  const [data, setData] = useState([]);

  const Metadata = (props: any) => {
    type Timeframe = number[];

    interface Scope {
      name: string;
      value: string[];
      excludes: string[];
      display_value: string;
    }

    interface Hypercert {
      impact_scope: Scope;
      work_scope: Scope;
      impact_timeframe: {
        name: string;
        value: Timeframe;
        display_value: string;
      };
      work_timeframe: {
        name: string;
        value: Timeframe;
        display_value: string;
      };
      rights: Scope;
      contributors: Scope;
    }
    const [metadata, setMetadata] = useState(
      {} as {
        name: string;
        description: string;
        image: string;
        hypercert: Hypercert;
      }
    );
    useEffect(() => {
      axios.get(`https://${props.uri}.ipfs.nftstorage.link/`).then((res) => {
        setMetadata(res.data);
      });
    }, []);

    return (
      <div className="flex justify-start items-start">
        <img className="h-50 w-100 pt-3 -ml-9" src={metadata.image} alt="" />
        {/* <div className="flex justify-start items-start">
         {metadata.hypercert && (
            <div className="mt-4 bg-gray-100 rounded-lg shadow-sm p-4">
              <h3 className="text-base font-medium text-gray-900">Hypercert</h3>
              <div className="grid grid-cols-1 gap-4 mt-2">
                <div className="grid grid-cols-2">
                  <div className="text-sm font-medium text-gray-500">
                    Impact Scope
                  </div>
                  <div className="text-sm text-gray-900">
                    {metadata.hypercert.impact_scope.display_value}
                  </div>
                </div>
                <div className="grid grid-cols-2">
                  <div className="text-sm font-medium text-gray-500">
                    Work Scope
                  </div>
                  <div className="text-sm text-gray-900">
                    {metadata.hypercert.work_scope.display_value}
                  </div>
                </div>
                <div className="grid grid-cols-2">
                  <div className="text-sm font-medium text-gray-500">
                    Impact Timeframe
                  </div>
                  <div className="text-sm text-gray-900">
                    {metadata.hypercert.impact_timeframe.display_value}
                  </div>
                </div>
                <div className="grid grid-cols-2">
                  <div className="text-sm font-medium text-gray-500">
                    Work Timeframe
                  </div>
                  <div className="text-sm text-gray-900">
                    {metadata.hypercert.work_timeframe.display_value}
                  </div>
                </div>
                <div className="grid grid-cols-2">
                  <div className="text-sm font-medium text-gray-500">
                    Rights
                  </div>
                  <div className="text-sm text-gray-900">
                    {metadata.hypercert.rights.display_value}
                  </div>
                </div>
                <div className="grid grid-cols-2">
                  <div className="text-sm font-medium text-gray-500">
                    Contributors
                  </div>
                  <div className=" grid grid-cols-1 gap-1 text-sm text-gray-900">
                    {metadata.hypercert.contributors.value.map(
                      (contributor) => (
                        <EthereumAddressToENSName
                          key={contributor}
                          address={contributor}
                        />
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          )} 
        </div>*/}
      </div>
    );
  };

  useEffect(() => {
    hypercertsClient.indexer
      .fractionsByOwner("0x0cfecb5D359E6C59ABd1d2Aa794F52C15055f451")
      .then((fractions) => {
        console.log("Fractions: ", fractions);
      })
      .catch((error) => {
        console.error("Error: ", error);
      });
  }, []);

  useEffect(() => {
    console.log(data);

    (async () => {
      axios
        .post(
          "https://api.thegraph.com/subgraphs/name/hypercerts-admin/hypercerts-optimism-mainnet",
          {
            query: tokensUnderOwner(
              "0xebe73e2b4a3e53d4051cc8563d357678ce735a31"
            ).query,
            variables: tokensUnderOwner(
              "0xebe73e2b4a3e53d4051cc8563d357678ce735a31"
            ).variables,
          }
        )
        .then((res) => {
          setData(res.data.data.claims);
        });
    })();
  }, []);
  return (
    <div className="flex">
      <div className="bg-dark grid grid-cols-1 gap-4 sm:grid-cols-2">
        {data.map((claim: any) => (
          <div
            key={claim.id}
            className="relative flex items-center space-x-3 rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 hover:border-gray-400"
          >
            <div className="min-w-0 flex-1">
              <div className="">
                <span className="absolute inset-0" aria-hidden="true" />
                <p className="text-sm font-medium text-gray-900">
                  Minted on {new Date(claim.creation * 1000).toDateString()}
                </p>
                <Metadata uri={claim.uri} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}