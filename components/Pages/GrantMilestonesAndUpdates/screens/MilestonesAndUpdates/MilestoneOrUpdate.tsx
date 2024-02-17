import { ReadMore } from "@/utilities";
import { FlagIcon } from "@heroicons/react/24/outline";
import { Grant } from "@show-karma/karma-gap-sdk";

interface MilestoneOrUpdateProps {
  grant: Grant | undefined;
}
export const MilestoneOrUpdate = ({ grant }: MilestoneOrUpdateProps) => {
  return (
    <div className="p-5 bg-white border border-gray-200 rounded-xl ">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-x-1 rounded-full bg-primary-50 px-2 py-1 text-xs font-semibold text-primary-600 uppercase ring-1 ring-inset ring-primary-500/10">
          <FlagIcon className="h-4 w-4 text-primary-500" aria-hidden="true" />
          Update 2
        </span>
        <div className="text-sm text-gray-600">
          Posted on &nbsp;
          <span className="font-semibold">January 25, 2024</span>
        </div>
      </div>

      <div className="mt-3 text-lg font-semibold">Training is Ongoing</div>

      <div className="mt-3">
        <ReadMore>
          Hello Community, My name is Oyeniyi Abiola Peace, I am the CEO of
          Blockchain Innovation Hub. We are one of the grantees of the
          Education, Community Growth and Events (Blockchain Innovation Hub - A
          Three Month Bootcamp for Developers). This report summarizes the
          activities completed so far for the BIH x Arbitrum Blockchain Software
          Development Bootcamp. After successful partnerships, event promotions,
          curriculum drafting and our first report, we have concluded the
          selection process and started classes for the Bootcamp. Out of
          approximately 800 registrations, we initially selected 164
          participants. We sent them a congratulatory email and invited them to
          the last Twitter Space (BIH X Arbitrum Onboarding call) scheduled for
          December 15th, 2023, at 7 pm. The final 100 participants were selected
          from the Twitter Space. Screenshot 2024-01-25 at 17.20.08|690x404
          During the Onboarding call, we provided a detailed explanation of the
          Bootcamp program and sent out a form for everyone to fill out. The 100
          selected participants were then onboarded to the Bootcamp Workspace,
          where they can access all the training materials and curriculum for
          the entire program. They are also required to submit their assignments
          as URLs using Notion. As scheduled, the first class of the Bootcamp
          commenced on January 8th, 2024, as indicated in the curriculum. Four
          classes were conducted consecutively during the first week, from
          Monday, January 8th to Thursday, January 11th, 2024. In the second
          week, only two classes were conducted on Monday, January 15th, and
          Thursday, January 18th, 2024. Similar to the first week, four classes
          were completed consecutively in the third week, from Monday, January
          22nd to Thursday, January 25th, 2024. The curriculum schedule and
          topics remained consistent throughout the three-week period.
        </ReadMore>
      </div>
    </div>
  );
};
