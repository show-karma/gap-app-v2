/* eslint-disable @next/next/no-img-element */
"use client";

import { Button } from "@/components/Utilities/Button";
import { DynamicStarsReview } from "./DynamicStarsReview";
import { useReviewStore } from "@/store/review";
import { ReviewMode, Badge } from "@/types/review";
import toast from "react-hot-toast";
import { AttestationRequestData, submitAttest } from "@/utilities/attest";
import { useSigner } from "@/utilities/eas-wagmi-utils";
import { SchemaEncoder } from "@ethereum-attestation-service/eas-sdk";
import { AbiCoder, Contract, ethers } from "ethers";
import {
  ARB_ONE_EAS,
  ARB_ONE_SCHEMA_REGISTRY,
} from "@/utilities/review/constants/constants";
import { ARB_ONE_EAS_ABI } from "@/utilities/review/constants/abi";
import { encodeFunctionData, getContract } from "viem";
import { getWalletClient } from "@wagmi/core";
import { config } from "@/utilities/wagmi/config";
import { arbitrum } from "viem/chains";
import { addPrefixToIPFSLink } from "@/utilities/review/constants/utilitary";

export const CardNewReview = () => {
  const setIsOpenReview = useReviewStore((state) => state.setIsOpenReview);
  const badge = useReviewStore((state) => state.badge);
  const stories = useReviewStore((state) => state.stories);
  const setBadgeScore = useReviewStore((state) => state.setBadgeScore);
  const badgeScore = useReviewStore((state) => state.badgeScore);

  // Score of the new review
  const handleSetRating = (index: number, rating: number) => {
    const updatededBadges = [...badgeScore];
    updatededBadges[index] = rating;
    setBadgeScore(updatededBadges);
  };

  // TODO: Should create the submit to blockchain
  const handleSubmitReview = async () => {
    const data = await main();
    console.log("data", data);

    toast.success("Review submitted successfully!");
    if (badge) {
      const updatedBadgeScore = Array(badge.length).fill(1);
      console.log("updatedBadgeScore", updatedBadgeScore);
      setBadgeScore(updatedBadgeScore);
    }
    setIsOpenReview(ReviewMode.READ);
  };

  // TODO: Check those interactions here to handle the submit transaction
  const signer = useSigner();
  const handleSendTransaction = async () => {
    if (!signer) return;

    //   const EAS_CONTRACT = "0xbD75f629A22Dc1ceD33dDA0b68c546A1c035c458";
    //   const from = signer.address;
    //   const schemaUID =  "0xb3c719785e801f7efadf1d4f2473f7815a68474b4356d5fdc9be0213a0df5942" as string;
    //   const attestationRequestData: AttestationRequestData = {
    //     recipient:
    //     expirationTime: BigInt(Date.now() + 3600 * 1000),
    //     revocable: true,
    //     refUID:
    //     data: // data in hex format
    //     value: BigInt(0),
    //   };
    //   try {
    //     const receipt = await submitAttest(EAS_CONTRACT, from, schemaUID, attestationRequestData);
    //     console.log("Transaction Receipt:", receipt);
    //   } catch (error) {
    //     console.error("Error sending transaction:", error);
    //   }
  };

  async function main() {
    if (!signer) return;
    console.log("Writting a review with account:", signer.address);

    const walletClient = await getWalletClient(config, {
      chainId: arbitrum.id,
    });
    console.log("walletClient", walletClient);
    const contractFactory = getContract({
      abi: ARB_ONE_EAS_ABI,
      address: ARB_ONE_EAS,
      client: walletClient,
    });

    const grantId =
      "0x635c2d0642c81e3191e6eff8623ba601b7e22e832d7791712b6bc28d052ff2b5";
    const badgeIds = [
      "0xe02b7f93d209aa1a9708544eb17e46eee3a1f45fed0de720f4866e0caff148f8",
      "0x446d8276789167189130fb83fce2c7b401752249a46b7e001d517c972a680219",
      "0xb2cf2baa9cdf459fd115c1bac872e0c7318c71d1201da034ff34090bf5c9ead3",
      "0xe85f17539b1c37dce80ab28bd08ca41f0c3f04a997756426157561ccf3447efa",
      "0x8934465c22520a1367b2794d7c3448e531923564a89acf65fc1cb97d918eb9bd",
      "0xc7110d04cc11dd911b5c12d4a26449fd87d7b6bf92ffbe02d0cda65b161eacb9",
      "0x41fdc7e77ebf77189b683427e0c79506b9177b5ddad561f8e1d62b15f779dcfb",
    ];
    const badgeScores = [1, 2, 3, 4, 5, 4, 3];

    // Encode the data
    const abiCoder = new AbiCoder();

    // Encode the data
    const encodedData = abiCoder.encode(
      ["bytes32", "bytes32[]", "uint8[]"],
      [grantId, badgeIds, badgeScores]
    );
    console.log("encodedData", encodedData);
    const expirationTime = BigInt(1) << (BigInt(64) - BigInt(1));

    const requestData = {
      recipient: signer.address,
      expirationTime: expirationTime,
      revocable: false,
      refUID: grantId,
      data: encodedData,
      value: 0,
    };
    console.log("requestData", requestData);

    const request = {
      schema:
        "0xb3c719785e801f7efadf1d4f2473f7815a68474b4356d5fdc9be0213a0df5942" as string,
      data: requestData,
    };
    console.log("request", request);

    const uid = await contractFactory.write.attest([request]);
    const tx0 = await contractFactory.write.attest([request]);
    console.log(`Review registered with attestion UID: ${uid} at tx:`, tx0);
  }

  return (
    <div className="flex w-full flex-col justify-center gap-4">
      <div className="w-full flex flex-col px-2 gap-2">
        {badge &&
          badge.map((badge: Badge, index: number) => (
            <div key={index} className="flex flex-col w-full px-14 mt-4">
              <div className="flex justify-center sm:justify-normal flex-col sm:flex-row w-full items-center gap-3">
                <img
                  src={addPrefixToIPFSLink(badge.metadata)}
                  alt="Badge Metadata"
                  className="h-20"
                />
                <div className="text-sm order-2 sm:order-1 sm:text-start text-center">
                  {badge.description}
                </div>
                <div className="order-1 sm:order-2">
                  <DynamicStarsReview
                    totalStars={5}
                    rating={badgeScore[index]}
                    setRating={(rating) => handleSetRating(index, rating)}
                    mode={ReviewMode.WRITE}
                  />
                </div>
              </div>
            </div>
          ))}
      </div>
      <div className="flex justify-end w-full">
        <Button onClick={handleSubmitReview}>Submit Review</Button>
      </div>
    </div>
  );
};
