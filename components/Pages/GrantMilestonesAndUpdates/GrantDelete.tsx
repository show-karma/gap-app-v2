import { DeleteDialog } from "@/components/DeleteDialog";
import { useProjectStore } from "@/store";
import {
  MESSAGES,
  checkNetworkIsValid,
  shortAddress,
  useSigner,
} from "@/utilities";
import { TrashIcon } from "@heroicons/react/24/outline";
import type { Grant } from "@show-karma/karma-gap-sdk";
import { type FC, useState } from "react";
import toast from "react-hot-toast";
import { useAccount, useNetwork, useSwitchNetwork } from "wagmi";

interface GrantDeleteProps {
  grant: Grant;
}

export const GrantDelete: FC<GrantDeleteProps> = ({ grant }) => {
  const [isDeletingGrant, setIsDeletingGrant] = useState(false);

  const signer = useSigner();
  const { address } = useAccount();
  const { chain } = useNetwork();
  const { switchNetworkAsync } = useSwitchNetwork();
  const refreshProject = useProjectStore((state) => state.refreshProject);

  const deleteGrant = async (grant: Grant) => {
    if (!address) return;
    try {
      if (!checkNetworkIsValid(chain?.id) || chain?.id !== grant.chainID) {
        await switchNetworkAsync?.(grant.chainID);
      }
      await grant
        .revoke(signer as any)
        .then(async () => {
          toast.success(MESSAGES.GRANT.DELETE.SUCCESS);
          await refreshProject();
        })
        .catch((error) => console.log(error));
    } catch (error) {
      toast.error(
        MESSAGES.GRANT.DELETE.ERROR(
          grant.details?.title || shortAddress(grant.uid)
        )
      );
      throw error;
    }
  };

  const deleteFn = async () => {
    setIsDeletingGrant(true);
    try {
      await deleteGrant(grant);
    } catch (error) {
      console.log(error);
    } finally {
      setIsDeletingGrant(false);
    }
  };

  return (
    <DeleteDialog
      deleteFunction={deleteFn}
      isLoading={isDeletingGrant}
      buttonElement={{
        icon: <TrashIcon className="w-6 h-6" />,
        text: "",
        styleClass:
          "bg-red-500 text-white p-1 px-2 shadow-none hover:opacity-75 hover:bg-red-500",
      }}
      title={
        <p className="font-normal">
          Are you sure you want to delete{" "}
          <b>{grant.details?.title || shortAddress(grant.uid)}</b> grant?
        </p>
      }
    ></DeleteDialog>
  );
};
