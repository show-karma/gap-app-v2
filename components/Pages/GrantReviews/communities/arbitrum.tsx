/* eslint-disable @next/next/no-img-element */
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import React from "react";

function HeroBlock() {
  return (
    <div className="flex flex-col items-start gap-4 md:flex-row">
      <div className="p-4 md:w-1/2">
        <h1 className="text-6xl font-bold leading-[64px] text-gray-900 max-2xl:text-4xl max-2xl:leading-[36px] max-lg:text-3xl max-lg:leading-normal 2xl:max-w-[720px]">
          Arbitrum DAO Community Review
        </h1>
        <p className="mt-2 text-2xl font-bold  max-md:text-xl">
          {`Empowering Our Community's Voice in Grant Funding Decisions`}
        </p>
        <p className="mt-4 w-full text-xl max-md:text-lg">
          Welcome to the DAO-wide community review for the Arbitrum DAO. This
          beta version marks the beginning of a decentralized post-funding
          review process for our grantees. At Arbitrum, we believe that the
          entire community should have a say in how we allocate funds and ensure
          they are used responsibly. Your involvement in this initiative is
          vital for the continued growth and sustainability of the Arbitrum
          ecosystem.
        </p>
      </div>
      <div className="p-4 max-md:hidden md:w-1/2">
        <img
          src="/images/karma-grant-reviews.png"
          alt="Community Reviews"
          className="w-full"
        />
      </div>
    </div>
  );
}

const links = [
  {
    title: "All Grants",
    href: "https://gap.karmahq.xyz/community/arbitrum",
  },
  {
    title: "Gaming",
    href: "https://gap.karmahq.xyz/community/arbitrum/?categories=arb+-+gaming&status=all&sortBy=milestones",
  },
  {
    title: "Protocol",
    href: "https://gap.karmahq.xyz/community/arbitrum/?categories=arb+-+protocol%2Carb+-+new+protocol&status=all&sortBy=milestones",
  },
  {
    title: "Education & Community Growth",
    href: "https://gap.karmahq.xyz/community/arbitrum/?categories=arb+-+education%2Carb+-+community+growth&status=all&sortBy=milestones",
  },
  {
    title: "DAO Contributors",
    href: "https://gap.karmahq.xyz/community/arbitrum/?categories=arb+-+dao+contribution&status=all&sortBy=milestones",
  },
  {
    title: "Data & Analytics",
    href: "https://gap.karmahq.xyz/community/arbitrum/?categories=arb+-+data+%26+analytics&status=all&sortBy=milestones",
  },
  {
    title: "Tools",
    href: "https://gap.karmahq.xyz/community/arbitrum/?categories=arb+-+tool&status=all&sortBy=milestones",
  },
];

const ReviewsGrant = () => (
  <div className="flex flex-col gap-2">
    <h3 className="text-3xl font-bold">Review Grants</h3>
    <div className="flex flex-col gap-2">
      <p>Please select the grants you would like to review</p>
      <div className="grid w-full grid-cols-4 gap-2 max-md:grid-cols-2">
        {links.map((item) => (
          <div
            key={item.href}
            className="flex h-[150px] w-full flex-col text-blue-700 items-center justify-center gap-2 rounded-2xl px-4 py-6  transition-all duration-300 ease-in-out "
          >
            <ExternalLink href={item.href}>{item.title}</ExternalLink>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const WhyIsItImportant = () => (
  <div className="flex flex-col gap-6">
    <h3 className="text-3xl font-bold">
      Why is it important to the Arbitrum Ecosystem
    </h3>
    <div className="grid w-full grid-cols-4 gap-2 max-md:grid-cols-2 max-sm:grid-cols-1">
      <div className="flex  flex-1 flex-col items-start gap-3 rounded-3xl bg-[#D7F8EF] px-8 py-6 max-2xl:px-6">
        <div className="flex items-center justify-center rounded-lg border border-black p-2 ">
          <img
            src="/icons/coins-stacked.png"
            alt="Grantee"
            className="h-7 w-7"
          />
        </div>
        <h3 className="text-2xl font-bold text-black  max-2xl:text-xl">
          Transparency
        </h3>
        <p>
          We are committed to transparency in our grant funding process. Your
          participation ensures that grantee applications are scrutinized openly
          and fairly.
        </p>
      </div>
      <div className="flex flex-1 flex-col items-start gap-3 rounded-3xl bg-[#E0EAFF] px-8 py-6 max-2xl:px-6">
        <div className="flex items-center justify-center rounded-lg border border-black p-2 ">
          <img
            src="/icons/coins-stacked.png"
            alt="Grantee"
            className="h-7 w-7"
          />
        </div>
        <h3 className=" text-2xl font-bold text-black  max-2xl:text-xl">
          Community Involvement
        </h3>
        <p>
          It empowers every member of our community to actively contribute to
          the growth and success of the Arbitrum ecosystem.
        </p>
      </div>
      <div className="flex flex-1 flex-col items-start gap-3 rounded-3xl bg-[#D7F8EF] px-8 py-6 max-2xl:px-6">
        <div className="flex items-center justify-center rounded-lg border border-black p-2 ">
          <img
            src="/icons/coins-stacked.png"
            alt="Grantee"
            className="h-7 w-7"
          />
        </div>
        <h3 className="text-2xl font-bold text-black  max-2xl:text-xl">
          Accountability
        </h3>
        <p>
          Your reviews hold grantees accountable for their proposed objectives,
          fostering responsible fund utilization.
        </p>
      </div>
      <div className="flex flex-1 flex-col items-start gap-3 rounded-3xl bg-[#E0EAFF] px-8 py-6 max-2xl:px-6">
        <div className="flex items-center justify-center rounded-lg border border-black p-2 ">
          <img
            src="/icons/coins-stacked.png"
            alt="Grantee"
            className="h-7 w-7"
          />
        </div>
        <h3 className=" text-2xl font-bold text-black  max-2xl:text-xl">
          Quality Assurance
        </h3>
        <p>
          It ensures that we fund projects that align with our strategic goals,
          promote innovation, and effectively leverage blockchain technology.
        </p>
      </div>
    </div>
  </div>
);

const GuideForReviewers = () => (
  <div className="flex flex-col gap-3">
    <h3 className="text-3xl font-bold">Guide for Reviewers</h3>

    <div className="grid w-full grid-cols-4 gap-2 max-md:grid-cols-2 max-sm:grid-cols-1">
      <div className="flex flex-1 flex-col items-start gap-3 rounded-3xl bg-[#D7F8EF] px-8 py-6 max-2xl:px-6">
        <div className="flex items-center justify-center rounded-lg border border-black p-2 ">
          <img
            src="/icons/coins-stacked.png"
            alt="Grantee"
            className="h-7 w-7"
          />
        </div>
        <h3 className="text-2xl font-bold text-black  max-2xl:text-xl">
          Comment start Examine the Karma Profile
        </h3>
        <p>
          {`Start by thoroughly reviewing the karma profile information
      provided. This will give you an initial understanding of the
      applicant's background and their involvement in relevant
      activities.`}
        </p>
      </div>
      <div className="flex flex-1 flex-col items-start gap-3 rounded-3xl bg-[#E0EAFF] px-8 py-6 max-2xl:px-6">
        <div className="flex items-center justify-center rounded-lg border border-black p-2 ">
          <img
            src="/icons/coins-stacked.png"
            alt="Grantee"
            className="h-7 w-7"
          />
        </div>
        <h3 className=" text-2xl font-bold text-black  max-2xl:text-xl">
          Review the Attached Application
        </h3>
        <p>
          Carefully read through the attached application. Pay attention to the
          details of the project or proposal, including objectives, strategies,
          and expected outcomes.
        </p>
      </div>
      <div className="flex flex-1 flex-col items-start gap-3 rounded-3xl bg-[#D7F8EF] px-8 py-6 max-2xl:px-6">
        <div className="flex items-center justify-center rounded-lg border border-black p-2 ">
          <img
            src="/icons/coins-stacked.png"
            alt="Grantee"
            className="h-7 w-7"
          />
        </div>
        <h3 className="text-2xl font-bold text-black  max-2xl:text-xl">
          Check External Links for Context
        </h3>
        <p>
          {`Look at any external links included in the application. These may
          offer additional context, examples of past work, or more detailed
          information about the project or the applicant's background.`}
        </p>
      </div>
      <div className="flex flex-1 flex-col items-start gap-3 rounded-3xl bg-[#E0EAFF] px-8 py-6 max-2xl:px-6">
        <div className="flex items-center justify-center rounded-lg border border-black p-2 ">
          <img
            src="/icons/coins-stacked.png"
            alt="Grantee"
            className="h-7 w-7"
          />
        </div>
        <h3 className=" text-2xl font-bold text-black  max-2xl:text-xl">
          Consider Overall Alignment and Impact
        </h3>
        <p>
          {`Finally, evaluate how well the application aligns with the survey's
          objectives and the potential impact it could have within the intended
          area, whether it's community growth, innovation, user engagement, or
          another specific focus.`}
        </p>
      </div>
    </div>
  </div>
);

export const ArbitrumReview = () => {
  return (
    <div className="flex flex-col gap-20">
      <HeroBlock />
      <ReviewsGrant />
      <WhyIsItImportant />
      <GuideForReviewers />
    </div>
  );
};
