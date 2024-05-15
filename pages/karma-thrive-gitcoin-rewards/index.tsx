import React from "react";
import TriangleLogo from "./TriangleLogo";

const Index = () => {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-blue-50 to-blue-200 dark:from-gray-800 dark:to-gray-900 text-gray-900 dark:text-gray-100 ">
      <div className="flex flex-col lg:flex-row items-center lg:items-start justify-between p-10 space-y-10 lg:space-y-0 lg:space-x-10 flex-grow">
        <div className="flex flex-col w-full lg:w-1/2 space-y-6 lg:space-y-8">
          <h1 className="text-5xl lg:text-6xl font-bold leading-snug lg:leading-tight text-center lg:text-left">
            Karma Thrive Gitcoin Rewards
          </h1>
          <p className="text-lg lg:text-xl leading-relaxed">
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Quasi
            dolorum voluptate ex itaque asperiores ipsum iure perspiciatis quae
            provident, officiis laudantium nulla quas natus, fuga odio
            reprehenderit non? Itaque, ratione.
          </p>
        </div>
        <div className="flex justify-center items-center w-full lg:w-1/2">
          <TriangleLogo />
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 p-10 text-gray-800 dark:text-gray-100">
        <h2 className="text-3xl font-bold mb-4 text-center lg:text-left">
          Incentivizing GG20 Grantees
        </h2>
        <p className="text-lg leading-relaxed mb-6">
          We are excited to announce our collaboration with Thrive to
          incentivize all GG20 grantees to update funders on their progress
          using the Karma GAP application. This strategy aids funders in making
          informed decisions about the level of funding based on the grantees'
          progress and forthcoming milestones. Furthermore, it will boost the
          usage of the Arbitrum chain, given that all updates are posted
          onchain.
        </p>
        <h3 className="text-2xl font-semibold mb-3">How incentives work?</h3>
        <ul className=" list-disc list-inside space-y-2 text-lg">
          <li>
            Grantees must create one milestone for each month - May, June, and
            July. You receive 10 ARB for posting milestones on Karma GAP.
          </li>
          <li>
            They must post an update at the end of each month by completing that
            month's milestone. They get 20 ARB for each milestone completed.
          </li>
          <li>
            Auditors will verify the milestones and issue the rewards at the end
            of three months.
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Index;
