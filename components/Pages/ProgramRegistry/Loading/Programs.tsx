import { Skeleton } from "@/components/Utilities/Skeleton";

const HEADER_CELL_KEYS = Array.from({ length: 7 }, (_, i) => `header-${i + 1}`);
const ROW_KEYS = Array.from({ length: 12 }, (_, i) => `row-${i + 1}`);

export const LoadingProgramTable = () => {
  return (
    <div className="w-full flex flex-col">
      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <table className="min-w-full divide-y divide-gray-300 h-full">
              <thead>
                <tr className="">
                  {HEADER_CELL_KEYS.map((headerKey) => {
                    return (
                      <th key={headerKey}>
                        <Skeleton className="h-9 w-full max-lg:min-w-40 rounded-lg border-0 my-2" />
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {ROW_KEYS.map((rowKey) => {
                  return (
                    <tr key={rowKey}>
                      {HEADER_CELL_KEYS.map((headerKey) => {
                        return (
                          <td key={`${rowKey}-${headerKey}`}>
                            <Skeleton className="h-12 w-full max-lg:min-w-40 rounded-lg my-5" />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
