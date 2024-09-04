"use client";
/* eslint-disable @next/next/no-img-element */
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Spinner } from "@/components/Utilities/Spinner";
import { useCommunitiesStore } from "@/store/communities";
import { PAGES } from "@/utilities/pages";
import { MESSAGES } from "@/utilities/messages";
import { Community } from "@show-karma/karma-gap-sdk";
import { INDEXER } from "@/utilities/indexer";
import fetchData from "@/utilities/fetchData";
import { useGap } from "@/hooks";
import { errorManager } from "@/components/Utilities/errorManager";
import { AddAdmin } from "./AddAdminDialog";
import { RemoveAdmin } from "./RemoveAdminDialog";
import { formatDate } from "@/utilities/formatDate";
import { blo } from "blo";
import { CommunityDialog } from "@/components/Dialogs/CommunityDialog";
import { LinkIcon } from "@heroicons/react/24/solid";
import CommunityStats from "@/components/CommunityStats";
import { chainImgDictionary } from "@/utilities/chainImgDictionary";
import { chainNameDictionary } from "@/utilities/chainNameDictionary";

export const CommunitiesToAdmin = () => {
  const [allCommunities, setAllCommunities] = useState<Community[]>([]);
  const [communityAdmins, setCommunityAdmins] = useState<any>([]);

  const { communities: communitiesToAdmin, isLoading } = useCommunitiesStore();
  const { gap } = useGap();

  const fetchCommunities = async () => {
    try {
      if (!gap) throw new Error("Gap not initialized");

      const result = await gap.fetch.communities();
      result.sort((a, b) =>
        (a.details?.name || a.uid).localeCompare(b.details?.name || b.uid)
      );
      setAllCommunities(result);
      const fetchPromises = result.map(async (community) => {
        try {
          const [data, error] = await fetchData(
            INDEXER.COMMUNITY.ADMINS(community.uid),
            "GET",
            {},
            {},
            {},
            false,
            true
          );

          if (error || !data) return { id: community.uid, admins: [] };
          return data;
        } catch {
          return { id: community.uid, admins: [] };
        }
      });
      const communityAdmins = await Promise.all(fetchPromises);

      // Update the state with the fetched data
      setCommunityAdmins(communityAdmins);

      return result;
    } catch (error: any) {
      console.log(error);
      errorManager(`Error fetching all communities`, error);
      setAllCommunities([]);
      return undefined;
    } finally {
    }
  };

  useEffect(() => {
    fetchCommunities();
  }, []);

  function shortenHex(hexString: string) {
    const firstPart = hexString.substring(0, 6);
    const lastPart = hexString.substring(hexString.length - 6);

    return `${firstPart}...${lastPart}`;
  }

  return (
    <div className="px-4 sm:px-6 lg:px-12 py-5">
      <div className="flex flex-col gap-2">
        <div className="flex justify-between">
          <div className="text-2xl font-bold">
            Your Communities{" "}
            {allCommunities.length ? `(${communitiesToAdmin.length})` : ""}
          </div>
        </div>
        <div className="mt-5 w-full gap-5">
          {allCommunities.length ? (
            <table className="border-x border-x-zinc-300 border-y border-y-zinc-300">
              <thead className="border-x border-x-zinc-300 border-y border-y-zinc-300">
                <tr className="divide-x">
                  <th>Img</th>
                  <th>Name</th>
                  <th>Created</th>
                  <th>UUID</th>
                  <th className="px-4 text-center">Community page</th>
                  <th className="px-4 text-center">Admin page</th>
                  <th className="px-4 text-center">View stats</th>
                  <th>Network</th>
                  <th>Admins</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-x">
                {allCommunities.map((community) => {
                  const isCommunityAdmin = communitiesToAdmin.some(
                    (adminOfCommunity) => adminOfCommunity.uid === community.uid
                  );

                  if (!isCommunityAdmin) return null;

                  const matchingCommunityAdmin = communityAdmins.find(
                    (admin: any) => admin.id === community.uid
                  );
                  return (
                    <React.Fragment key={community.uid}>
                      <tr className="divide-x">
                        <td>
                          <img
                            src={
                              community.details?.imageURL || blo(community.uid)
                            }
                            className="h-[64px] w-[100px] object-cover"
                            alt={community.details?.name || community.uid}
                          />
                        </td>
                        <td className="max-w-40 px-4">
                          {community.details?.name}
                        </td>
                        <td className="max-w-60 px-4">
                          {formatDate(community?.createdAt)}
                        </td>
                        <td className="max-w-80 break-all px-4">
                          {community.uid}
                        </td>
                        <td className="text-center px-4">
                          <Link
                            href={PAGES.COMMUNITY.ALL_GRANTS(
                              community.details?.slug || community.uid
                            )}
                            className="flex flex-row items-center gap-1.5 text-blue-500"
                          >
                            Community
                            <LinkIcon className="w-4 h-4" />
                          </Link>
                        </td>
                        <td className="text-center px-4">
                          <Link
                            href={PAGES.ADMIN.ROOT(
                              community.details?.slug || community.uid
                            )}
                            className="flex flex-row items-center gap-1.5 text-blue-500"
                          >
                            Admin
                            <LinkIcon className="w-4 h-4" />
                          </Link>
                        </td>
                        <td className="text-center px-4">
                          <CommunityStats communityId={community.uid} />
                        </td>
                        <td className="px-4">
                          <div className="flex flex-row gap-2 items-center">
                            <img
                              src={chainImgDictionary(community.chainID)}
                              alt={chainNameDictionary(community.chainID)}
                              className="w-5 h-5"
                            />
                            <p>{chainNameDictionary(community.chainID)}</p>
                          </div>
                        </td>
                        <td>
                          {matchingCommunityAdmin &&
                            matchingCommunityAdmin.admins.map(
                              (admin: any, index: any) => (
                                <div className="flex gap-2 p-5" key={index}>
                                  <div key={index}>
                                    {shortenHex(admin.user.id)}
                                  </div>
                                  {/* <TrashIcon
                                          width={20}
                                          onClick={() => {
                                            console.log(community.uid);
                                          }}
                                        /> */}
                                  <RemoveAdmin
                                    UUID={community.uid}
                                    chainid={community.chainID}
                                    Admin={admin.user.id}
                                    fetchAdmins={fetchCommunities}
                                  />
                                </div>
                              )
                            )}
                        </td>
                        <td>
                          <AddAdmin
                            UUID={community.uid}
                            chainid={community.chainID}
                            fetchAdmins={fetchCommunities}
                          />
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          ) : isLoading ? (
            <Spinner />
          ) : null}
        </div>
      </div>
    </div>
  );
};
