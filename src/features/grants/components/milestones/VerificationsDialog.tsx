/* eslint-disable @next/next/no-img-element */
import { FC, Fragment, useEffect, useMemo, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/solid";

import { Hex } from "viem";
import { useENS } from "@/store/ens";
import { useProjectStore } from "@/src/features/projects/lib/store";
import { formatDate } from "@/utilities/formatDate";
import {
  ICommunityAdminsResponse,
  IGrantUpdateStatus,
  IMilestoneCompleted,
  IProjectImpactStatus,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { Tabs, TabContent, TabTrigger } from "@/components/Utilities/Tabs";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";
import { useAccount } from "wagmi";
import EthereumAddressToENSAvatar from "@/components/EthereumAddressToENSAvatar";
import { useGrant } from "../../lib/grant-context";

interface VerificationsDialogProps {
  verifications: (
    | IMilestoneCompleted
    | IGrantUpdateStatus
    | IProjectImpactStatus
  )[];
  isOpen: boolean;
  closeDialog: () => void;
  title: string;
}

interface VerificationsItemProps {
  verification: IMilestoneCompleted | IGrantUpdateStatus | IProjectImpactStatus;
}

const VerificationItem = ({ verification }: VerificationsItemProps) => {
  const { ensData } = useENS();
  const populateEns = useENS((state) => state.populateEns);

  useEffect(() => {
    populateEns([verification.attester]);
  }, [verification.attester]);

  return (
    <div className="flex flex-col items-start gap-1.5 p-4">
      <div className="flex flex-row gap-3 items-center">
        <EthereumAddressToENSAvatar
          address={verification.attester}
          className="h-8 w-8 min-h-8 min-w-8 rounded-full"
        />
        <p className="text-sm font-bold text-brand-darkblue font-body dark:text-zinc-200">
          {ensData[verification.attester as Hex]?.name || verification.attester}
          <span className="ml-1 font-normal font-body text-brand-gray dark:text-zinc-300">
            reviewed on {formatDate(verification.createdAt)}
          </span>
        </p>
      </div>
      <p className="pl-11 text-base font-normal text-brand-gray dark:text-zinc-300">
        {verification.data?.reason}
      </p>
    </div>
  );
};

export const VerificationsDialog: FC<VerificationsDialogProps> = ({
  verifications,
  isOpen,
  closeDialog,
  title,
}) => {
  const project = useProjectStore((state) => state.project);
  const grant = useGrant();

  const communityUid = useMemo(() => grant?.data.communityUID, [grant]);
  const [communityAdmins, setCommunityAdmins] = useState<string[]>();

  const { populateEns } = useENS();
  useEffect(() => {
    populateEns(verifications.map((v) => v.attester as string));
  }, [verifications]);

  useEffect(() => {
    if (communityUid) {
      gapIndexerApi
        .communityAdmins(communityUid)
        .then((data) => {
          setCommunityAdmins(
            data.data.admins.map((admin) => admin.user.id.toLowerCase())
          );
        })
        .catch(() => null);
    }
  }, [communityUid]);

  const adminVerifications = verifications.filter((item) =>
    communityAdmins?.includes(item.attester?.toLowerCase() as string)
  );
  const memberVerifications = verifications.filter(
    (item) => !communityAdmins?.includes(item.attester?.toLowerCase() as string)
  );

  const defaultTab =
    adminVerifications.length === 0 && memberVerifications.length > 0
      ? "members"
      : "admins";

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={closeDialog}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl h-max transform overflow-hidden rounded-2xl dark:bg-zinc-800 bg-white p-6 text-left align-middle  transition-all">
                <button
                  className="p-2 text-black dark:text-white absolute top-4 right-4"
                  onClick={() => closeDialog()}
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-3">
                    <h1 className="text-xl font-bold font-body">{title}</h1>
                    <Tabs defaultTab={defaultTab}>
                      <div className="flex flex-wrap w-max gap-2 rounded bg-[#F2F4F7] dark:bg-zinc-800 px-2 py-1">
                        <TabTrigger
                          value="admins"
                          icon={adminVerifications.length}
                          disabled={adminVerifications.length === 0}
                        >
                          Community Admins
                        </TabTrigger>
                        <TabTrigger
                          value="members"
                          icon={memberVerifications.length}
                          disabled={memberVerifications.length === 0}
                        >
                          Community Members
                        </TabTrigger>
                      </div>
                      <div className="flex flex-col border border-gray-200 divide-gray-200 rounded-xl gap-1 divide-y max-h-[420px] overflow-y-auto">
                        <TabContent value="admins">
                          {adminVerifications.map((verification) => (
                            <VerificationItem
                              key={verification.attester}
                              verification={verification}
                            />
                          ))}
                        </TabContent>
                        <TabContent value="members">
                          {memberVerifications.map((verification) => (
                            <VerificationItem
                              key={verification.attester}
                              verification={verification}
                            />
                          ))}
                        </TabContent>
                      </div>
                    </Tabs>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
