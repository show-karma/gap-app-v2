import React from "react";
import { ProjectPageLayout } from ".";

function ProjectPage() {
  return (
    <div className="py-5">
      <div className="text-base">
        <span className="font-semibold">Owner:</span>
        <span className="ml-1">tarzanandjane.eth</span>
      </div>

      <div className="mt-5 font-semibold">Categories</div>
      <div className="mt-2 flex items-center gap-x-1">
        <span className="inline-flex items-center rounded-md bg-white border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
          DeFi
        </span>
        <span className="inline-flex items-center rounded-md bg-white border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
          NFT
        </span>
        <span className="inline-flex items-center rounded-md bg-white border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
          Web3
        </span>
      </div>

      <div className="mt-8 font-semibold">Description</div>

      <div className="mt-2 space-y-5">
        <p className="max-w-prose">Hi there, my name is Taylor Pedde.</p>
        <p className="max-w-prose">
          I have been an active contributor to the Arbitrum DAO for the past 6+
          months. Not all of the work I have been doing has been done in full
          view of the public, but my overall goal has been to find sustainable
          solutions for Arbitrum&apos;s on-chain liquidity environment, both for
          projects building on Arbitrum as well as for the $ARB token itself.
        </p>
        <p className="max-w-prose">
          The research I have conducted led to the publishing of a 25+ page
          proposal by SushiSwap that was posted to the forums. Since then I have
          been actively involved in dozens of conversations with leading
          delegates and working groups about treasury diversification, on-chain
          liquidity acquisition, sustainable emissions, etc.
        </p>
        <p className="max-w-prose">
          I have grown very fond of the Arbitrum community and ecosystem and am
          extremely appreciative of this opportunity to potentially be
          recognized for the hundreds of uncompensated hours I have dedicated
          thus far.
        </p>
      </div>
    </div>
  );
}

ProjectPage.getLayout = ProjectPageLayout;

export default ProjectPage;
