import { MilestoneNFTDialog } from "@/components/Dialogs/MilestoneNFTDialog";
import { getGapClient, useGap } from "@/hooks";
import { useProjectStore } from "@/store";
import { checkNetworkIsValid } from "@/utilities/checkNetworkIsValid";
import { useSigner, walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { MESSAGES } from "@/utilities/messages";
import { TicketIcon } from "@heroicons/react/24/outline";
import type { Milestone } from "@show-karma/karma-gap-sdk";
import { getWalletClient } from "@wagmi/core";
import { type FC, useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Hex } from "viem";
import { useNetwork, useSwitchNetwork } from "wagmi";
import { createCreatorClient } from "@zoralabs/protocol-sdk";
import { zora, zoraSepolia } from "viem/chains";
import { usePublicClient, useAccount, useChainId } from "wagmi";

import { http, createPublicClient, createWalletClient, Address } from "viem";

interface MilestoneNFTProps {
  milestone: Milestone;
}

export const MilestoneNFT: FC<MilestoneNFTProps> = ({ milestone }) => {
  const [isMintingMilestone, setIsMintingMilestone] = useState(false);

  const { switchNetworkAsync } = useSwitchNetwork();
  const refreshProject = useProjectStore((state) => state.refreshProject);

  const selectedProject = useProjectStore((state) => state.project);

  const { address: creatorAccount } = useAccount();

  const mintFn = async () => {
    setIsMintingMilestone(true);

    const mintChain = zoraSepolia; // milestone.chainID;

    try {
      const publicClient = createPublicClient({
        // this will determine which chain to interact with
        chain: mintChain,
        transport: http(),
      });

      const walletClient = createWalletClient({
        chain: mintChain,
        transport: http(),
      });

      const creatorClient = createCreatorClient({
        chainId: mintChain.id,
        publicClient,
      });

      if (!walletClient) return;

      console.log("Creating Premint...");

      // create and sign the Premint, the Premint and signature will be uploaded to an api to be served later
      const premint = await creatorClient.createPremint({
        // collection info of collection to create.  The combination of these fields will determine the
        // deterministic collection address.
        contract: {
          // the account that will be the admin of the collection.  Must match the signer of the premint.
          contractAdmin: creatorAccount as `0x${string}`,
          contractName: "GAP Milestone NFT",
          contractURI:
            "ipfs://bafkreiainxen4b4wz4ubylvbhons6rembxdet4a262nf2lziclqvv7au3e",
        },
        // token info of token to create
        token: {
          tokenURI:
            "https://bafybeiayz4vx3kap2dhsakiedlxmdtbo5zjfthy6eygxnjs2q4iv4ieqka.ipfs.nftstorage.link/metadata-0.json",
          // address to get create referral reward
          createReferral: "0x5A4830885f12438E00D8f4d98e9Fe083e707698C",
          // maximum number of tokens that can be minted.
          maxSupply: BigInt(50000),
          // the maximum number of tokens that can be minted to a single address.
          maxTokensPerAddress: BigInt(10),
          // the earliest time the premint can be brought onchain.  0 for immediate.
          mintStart: BigInt(0),
          // the duration of the mint.  0 for infinite.
          mintDuration: BigInt(0),
          // the price in eth per token, for paid mints.  0 for it to be a free mint.
          pricePerToken: BigInt(0),
          // address to receive creator rewards for free mints, or if its a paid mint, the paid mint sale proceeds.
          payoutRecipient: creatorAccount as `0x${string}`,
        },
      });

      console.log("Premint created, signing and submitting...", premint);

      // sign the new premint, and submit it to the Zora Premint API
      await premint.signAndSubmit({
        // account to sign the premint
        account: creatorAccount as `0x${string}`,
        // the walletClient will be used to sign the message.
        walletClient,
        // if true, the signature will be checked before being submitted.
        // this includes validating that the signer is authorized to create the premint.
        checkSignature: true,
      });

      console.log("Premint signed and submitted");

      toast.success(MESSAGES.MILESTONES.MINT.SUCCESS);
      await refreshProject();
    } catch (error) {
      toast.error(MESSAGES.MILESTONES.MINT.ERROR(milestone.title));
      throw error;
    } finally {
      setIsMintingMilestone(false);
    }
  };

  return (
    <MilestoneNFTDialog
      mintFunction={mintFn}
      isLoading={isMintingMilestone}
      title={
        <p className="font-normal">
          Are you sure you want to mint <b>{milestone.title}</b> milestone?
        </p>
      }
      buttonElement={{
        text: "Create Milestone NFT",
        icon: <TicketIcon className="text-white w-5 h-5 mr-1" />,
        styleClass:
          "px-2 py-1 w-max h-max text-white transition-all duration-500 bg-gradient-to-tr to-red-400 via-violet-600 from-blue-500 bg-size-200 bg-pos-0 hover:bg-pos-100  shadow",
      }}
    />
  );
};
