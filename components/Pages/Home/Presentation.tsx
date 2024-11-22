/* eslint-disable @next/next/no-img-element */
"use client";
import { TypedLoading } from "@/components/Pages/Home/ReactTypedWrap";
import { Button } from "@/components/Utilities/Button";
import { PAGES } from "@/utilities/pages";
import { CheckIcon } from "@heroicons/react/24/outline";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
// import { ProjectDialog } from "@/components/Dialogs/ProjectDialog";

const ReactTypedWrapper = dynamic(
  () =>
    import("@/components/Pages/Home/ReactTypedWrap").then(
      (mod) => mod.ReactTypedWrapper
    ),
  { ssr: false, loading: () => <TypedLoading /> }
);

const ProjectDialog = dynamic(
  () =>
    import("@/components/Dialogs/ProjectDialog/index").then(
      (mod) => mod.ProjectDialog
    ),
  {
    ssr: false,
    loading: () => (
      <Button className="flex rounded-md hover:opacity-75 border-none transition-all ease-in-out duration-300 items-center h-max w-max flex-row gap-3 bg-brand-darkblue dark:bg-gray-700 px-7 py-4 text-lg font-semibold leading-7 text-white hover:bg-brand-darkblue max-2xl:px-5 max-2xl:text-base max-lg:text-sm">
        Add your project
        <Image
          alt="Contact"
          className="text-white"
          width={24}
          height={24}
          src="/icons/arrow-right-2.svg"
        />
      </Button>
    ),
  }
);
export const Presentation = () => {
  return (
    <div className="flex flex-1 items-end gap-8 max-2xl:gap-4">
      <div className=" flex w-full flex-row items-end justify-center gap-1 max-lg:mt-4">
        <div className="flex w-full flex-[4]  flex-col  items-start">
          <div className="flex flex-1 flex-col gap-8 pb-8 max-2xl:gap-6">
            <h4 className="w-max rounded-3xl bg-[#EAECF5] dark:bg-slate-800 dark:text-blue-400 px-3 py-1 text-center text-base font-semibold text-indigo-900  max-2xl:text-sm">
              ONCHAIN PROTOCOL
            </h4>

            <div className="flex flex-col gap-1 pb-8 max-2xl:pb-1">
              <h1 className="text-6xl font-bold leading-[64px] text-gray-900 dark:text-gray-100 max-2xl:text-4xl max-2xl:leading-[36px] max-lg:text-3xl max-lg:leading-normal">
                Visibility and <br />
                accountability for <br className="mb-3" />
                <ReactTypedWrapper />
                <span className="text-6xl font-bold leading-[64px] text-gray-900 dark:text-gray-100 max-2xl:text-4xl max-2xl:leading-[36px] max-lg:text-3xl max-lg:leading-normal">
                  <br /> projects
                </span>
              </h1>
            </div>

            <div className="w-full max-w-full flex flex-row gap-2 flex-wrap items-center">
              <ProjectDialog
                buttonElement={{
                  icon: (
                    <div className="relative h-6 w-6 max-sm:h-4 max-sm:w-4">
                      <Image
                        className=" text-white"
                        alt="Contact"
                        src="/icons/arrow-right-2.svg"
                        layout="fill"
                      />
                    </div>
                  ),
                  iconSide: "right",
                  text: "Add your project",
                  styleClass:
                    "max-sm:px-2 max-sm:py-2 flex rounded-md hover:opacity-75 border-none transition-all ease-in-out duration-300 items-center h-max w-max flex-row gap-3 bg-brand-darkblue dark:bg-gray-700 px-7 py-4 text-lg font-semibold leading-7 text-white hover:bg-brand-darkblue max-2xl:px-5 max-2xl:text-base max-lg:text-sm",
                }}
              />
              <Link href={PAGES.PROJECTS_EXPLORER}>
                <Button className="max-sm:px-2 max-sm:py-2 flex rounded-md hover:opacity-75 border-black dark:border-zinc-100 border transition-all ease-in-out duration-300 items-center h-max w-max flex-row gap-3 bg-transparent dark:bg-transparent px-7 py-4 text-lg font-semibold leading-7 text-black dark:text-zinc-100 hover:bg-transparent max-2xl:px-5 max-2xl:text-base max-lg:text-sm ">
                  Explore projects on GAP
                </Button>
              </Link>
            </div>
          </div>

          <div className="flex w-full flex-1 flex-row flex-wrap gap-6 max-md:flex-col">
            <div className="flex  min-w-min max-w-[500px] flex-1 flex-col items-start gap-3 rounded-3xl  text-gray-900 dark:text-gray-900 bg-[#D7F8EF] px-8 py-6 max-2xl:px-6 max-lg:min-w-full">
              <div className="flex items-center justify-center rounded-lg border border-black p-2 ">
                <Image
                  src="/icons/coins-stacked.png"
                  alt="Grantee"
                  width={28}
                  height={28}
                />
              </div>
              <h2 className="text-2xl text-black font-bold max-2xl:text-xl">
                For Grantees
              </h2>
              <ul className="text-gray-900">
                <li className="flex w-full flex-row gap-4 break-words">
                  <CheckIcon className="h-6 min-h-[24px] w-6 min-w-[24px]" />
                  <p className="text-base font-normal">
                    Self-Report on grant progress.
                  </p>
                </li>
                <li className="flex w-full flex-row gap-4 break-words">
                  <CheckIcon className="h-6 min-h-[24px] w-6 min-w-[24px]" />
                  <p className="text-base font-normal">Build Reputation.</p>
                </li>
                <li className="flex w-full flex-row gap-4 break-words">
                  <CheckIcon className="h-6 min-h-[24px] w-6 min-w-[24px]" />
                  <p className="text-base font-normal">Receive more funding.</p>
                </li>
              </ul>
            </div>
            <div className="flex  min-w-min max-w-[500px] flex-1 flex-col items-start gap-3 rounded-3xl text-gray-900 dark:text-gray-900 bg-[#D7F8EF] px-8 py-6 max-2xl:px-6 max-lg:min-w-full">
              <div className="flex items-center justify-center rounded-lg border border-black p-2">
                <Image
                  src="/icons/globe.png"
                  alt="For Community + Grant Admins"
                  width={28}
                  height={28}
                />
              </div>
              <h2 className="w-full text-black break-words text-2xl font-bold  max-2xl:text-xl">
                For Community + Grant Admins
              </h2>
              <ul className="text-gray-900">
                <li className="flex w-full flex-row gap-4 break-words">
                  <CheckIcon className="h-6 min-h-[24px] w-6 min-w-[24px]" />
                  <p className="text-base font-normal ">
                    Stay up-to-date on projects progress.
                  </p>
                </li>
                <li className="flex w-full flex-row gap-4 break-words">
                  <CheckIcon className="h-6 min-h-[24px] w-6 min-w-[24px]" />
                  <p className="text-base font-normal ">
                    Trigger payments based on milestone completion.
                  </p>
                </li>
                <li className="flex w-full flex-row gap-4 break-words">
                  <CheckIcon className="h-6 max-h-[24px] min-h-[24px] w-6 min-w-[24px] max-w-[24px]" />
                  <p className="text-base font-normal ">
                    Endorse projects, monitor fund usage and flag discrepancies.
                  </p>
                </li>
              </ul>
            </div>
            <div />
          </div>
        </div>
        <div className="relative flex h-full w-full max-w-[720px] flex-col justify-end max-2xl:max-w-[500px] max-xl:max-w-[360px] max-lg:hidden">
          <Image
            src="/images/homepage-artwork.png"
            alt="Homepage artwork"
            width={0}
            height={0}
            sizes="100vw"
            style={{ width: "100%", height: "auto" }} // optional
          />
        </div>
      </div>
    </div>
  );
};
