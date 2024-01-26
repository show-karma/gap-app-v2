import React from "react";
import { ProjectPageLayout } from ".";
import BlockiesSvg from "blockies-react-svg";
import { shortAddress } from "@/utilities";

function TeamPage() {
  return (
    <div className="py-5">
      <div className="font-semibold">Built By</div>
      <div className="mt-3 group block flex-shrink-0">
        <div className="flex items-center">
          <div>
            <BlockiesSvg
              className="inline-block h-9 w-9 rounded-md"
              address={`0x0694e8C9D228435c1053FCDA01809196D82549D2`}
              size={9}
            />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
              tarzanandjane.eth
            </p>
            <p className="text-xs font-medium text-gray-500 group-hover:text-gray-700">
              {shortAddress("0x0694e8C9D228435c1053FCDA01809196D82549D2")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

TeamPage.getLayout = ProjectPageLayout;

export default TeamPage;
