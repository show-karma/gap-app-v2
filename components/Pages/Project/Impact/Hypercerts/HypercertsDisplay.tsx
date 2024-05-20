import tokensUnderOwnerQuery from "../../../../../utilities/hypercerts/tokensUnderOwner";
import axios from "axios";
import { useEffect, useState } from "react";
import EthereumAddressToENSName from "@/components/EthereumAddressToENSName";
import { shortAddress } from "@/utilities/shortAddress";
import hypercertsClient from "@/utilities/hypercerts/hypercerts";
import { Hex } from "viem";

interface Props {
  walletAddress: Hex | string;
}

export default function HypertCerts({ walletAddress }: Props) {
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
      console.log("ProjectRecord: ", walletAddress);
      axios.get(`https://${props.uri}.ipfs.nftstorage.link/`).then((res) => {
        setMetadata(res.data);
      });
    }, []);

    return (
      <div className="flex ">
        <img className="w-[25rem] pt-3 -ml-10" src={metadata.image} alt="" />

        {/* <div className="flex justify-start items-start">
          <div className="flex justify-start items-start">
            {metadata.hypercert && (
              <div className="mt-4 bg-gray-100 rounded-lg shadow-sm p-4">
                <h3 className="text-base font-medium text-gray-900">
                  Hypercert
                </h3>
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
          </div>
        </div> */}
      </div>
    );
  };

  useEffect(() => {
    // hypercertsClient.indexer
    //   .fractionsByOwner("0x5a4830885f12438e00d8f4d98e9fe083e707698c")
    //   .then((fractions) => {
    //     console.log("Fractions: ", fractions);
    //   })
    //   .catch((error) => {
    //     console.error("Error: ", error);
    //   });
  }, []);

  useEffect(() => {
    console.log(data);

    (async () => {
      axios
        .post(
          "https://api.thegraph.com/subgraphs/name/hypercerts-admin/hypercerts-sepolia",
          tokensUnderOwnerQuery(walletAddress as Hex)
        )
        .then((res) => {
          setData(res.data.data.claims);
        });
    })();
  }, []);

  return (
    <section className="flex flex-col justify-center items-start mt-15 pt-3 border-zinc-300 border-t-[1px]">
      <h1 className="font-bold text-2xl mb-2">Impact Certificates</h1>
      <div className="bg-dark grid grid-cols-1 gap-3 sm:grid-cols-4 mt-4">
        {data.map((claim: any) => (
          <div key={claim.id} className="flex flex-col items-start shadow-sm">
            <p className="text-sm font-medium text-gray-900">
              Minted on {new Date(claim.creation * 1000).toDateString()}
            </p>
            <Metadata uri={claim.uri} />
          </div>
        ))}
      </div>
    </section>
  );
}
