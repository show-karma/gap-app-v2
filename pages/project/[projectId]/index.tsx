import { useRouter } from "next/router";
import * as React from "react";
import { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

const tabs = [
  { name: "Project", href: "/project/${projectId}" },
  {
    name: "Grants",
    href: "/grants/?tab=grants&grantId=0xb7ff3368a18ea43386a15080173beb6a32b2fcf1ae0df9acf1b3e173a808ae8f%2Foverview",
  },
  { name: "Team", href: "/team" },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

const ProjectPage = () => {
  return <div>This is the Project Layout&apos;s landing page</div>;
};

export const NestedLayout = ({ children }: Props) => {
  const router = useRouter();
  return (
    <div>
      <div className="relative border-b border-gray-200 pb-5 sm:pb-0">
        <div className="px-4 sm:px-6 lg:px-8 pt-5 md:flex md:items-center md:justify-between">
          <h1 className="text-2xl font-semibold leading-6 text-gray-900">
            Blockchain Innovation Hub
          </h1>
          <div className="mt-3 flex">
            <button
              type="button"
              className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              Share
            </button>
            <button
              type="button"
              className="ml-3 inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Create
            </button>
          </div>
        </div>
        <div className="mt-4">
          <div className="sm:hidden">
            <label htmlFor="current-tab" className="sr-only">
              Select a tab
            </label>
            <select
              id="current-tab"
              name="current-tab"
              className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
            >
              {tabs.map((tab) => (
                <option key={tab.name}>{tab.name}</option>
              ))}
            </select>
          </div>
          <div className="px-4 sm:px-6 lg:px-8 hidden sm:block">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <a
                  key={tab.name}
                  href={tab.href}
                  className={classNames(
                    tab.href.split("/")[3] === router.pathname.split("/")[3]
                      ? "border-indigo-500 text-indigo-600"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700",
                    "whitespace-nowrap border-b-2 px-1 pb-4 text-sm font-medium"
                  )}
                >
                  {tab.name}
                </a>
              ))}
            </nav>
          </div>
        </div>
      </div>
      <div className="px-4 sm:px-6 lg:px-8">{children}</div>
    </div>
  );
};

export const ProjectPageLayout = (page: any) => (
  <NestedLayout>{page}</NestedLayout>
);

ProjectPage.getLayout = ProjectPageLayout;

export default ProjectPage;
