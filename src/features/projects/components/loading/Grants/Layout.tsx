import { Skeleton } from "@/components/ui/skeleton";
import { ReactNode } from "react";

export const ProjectGrantsLayoutLoading = ({
  children,
}: {
  children?: ReactNode;
}) => {
  const emptyArray = Array.from({ length: 3 }, (_, index) => index);
  return (
    <>
      <div className="flex max-lg:flex-col">
        <div className="w-full max-w-[320px] max-lg:max-w-full py-5 border-none max-lg:w-full max-lg:px-0">
          <div className=" lg:hidden">
            <div className="rounded-lg border border-[#E3E8EF] w-full  px-3 py-4">
              <Skeleton className="w-full h-10" />
            </div>
          </div>
          <nav
            className="flex flex-1 flex-col gap-4 max-lg:hidden"
            aria-label="Sidebar"
          >
            <div className="flex w-full min-w-[240px] flex-row items-center gap-2">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 dark:text-zinc-300"
              >
                <g clipPath="url(#clip0_2139_16649)">
                  <path
                    d="M5.66659 9.77648C5.66659 10.6356 6.36303 11.332 7.22214 11.332H8.66659C9.58706 11.332 10.3333 10.5858 10.3333 9.66536C10.3333 8.74489 9.58706 7.9987 8.66659 7.9987H7.33325C6.41278 7.9987 5.66659 7.25251 5.66659 6.33203C5.66659 5.41156 6.41278 4.66536 7.33325 4.66536H8.7777C9.63681 4.66536 10.3333 5.36181 10.3333 6.22092M7.99992 3.66536V4.66536M7.99992 11.332V12.332M14.6666 7.9987C14.6666 11.6806 11.6818 14.6654 7.99992 14.6654C4.31802 14.6654 1.33325 11.6806 1.33325 7.9987C1.33325 4.3168 4.31802 1.33203 7.99992 1.33203C11.6818 1.33203 14.6666 4.3168 14.6666 7.9987Z"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
                <defs>
                  <clipPath id="clip0_2139_16649">
                    <rect width="16" height="16" fill="white" />
                  </clipPath>
                </defs>
              </svg>

              <p className="text-xs font-bold text-black dark:text-zinc-300 ">
                FUNDING
              </p>
            </div>
            <ul role="list" className="space-y-2 mt-8">
              {emptyArray.map((item, index) => (
                <li key={index}>
                  <Skeleton
                    className={"h-8 flex items-center rounded-md w-full"}
                  />
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="flex-1 pl-5 pt-5 pb-20 max-lg:px-0 max-lg:pt-0">
          <div className="flex flex-row gap-4 justify-between max-md:flex-col border-b border-b-zinc-900 dark:border-b-zinc-200 pb-2 mb-4 w-full">
            <Skeleton className="w-full h-9" />
          </div>
          <div className="sm:block">
            <nav
              className="isolate flex flex-row max-lg:w-full flex-wrap gap-4 divide-x divide-gray-200 rounded-lg py-1 px-1  bg-[#F2F4F7] dark:bg-zinc-900 w-max transition-all duration-300 ease-in-out"
              aria-label="Tabs"
            >
              <Skeleton
                className={
                  "h-7 group relative w-24 border-none overflow-hidden rounded-lg py-2 px-3 text-center  focus:z-10 transition-all duration-300 ease-in-out"
                }
              />
              <Skeleton
                className={
                  "h-7 group relative w-24 border-none overflow-hidden rounded-lg py-2 px-3 text-center  focus:z-10 transition-all duration-300 ease-in-out"
                }
              />
              <Skeleton
                className={
                  "h-7 group relative w-24 border-none overflow-hidden rounded-lg py-2 px-3 text-center  focus:z-10 transition-all duration-300 ease-in-out"
                }
              />
            </nav>
          </div>
          {children}
        </div>
      </div>
    </>
  );
};
