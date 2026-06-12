import { Skeleton } from "@/components/Utilities/Skeleton";

export const LoadingProgramTable = () => {
  const emptyArrayHeader = Array.from({ length: 7 });
  const emptyArrayRows = Array.from({ length: 12 });
  return (
    <div className="w-full flex flex-col">
      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <table className="min-w-full divide-y divide-gray-300 h-full">
              <thead>
                <tr className="">
                  {emptyArrayHeader.map((_row, index) => {
                    return (
                      <th key={index}>
                        <Skeleton className="h-9 w-full max-lg:min-w-40 rounded-lg border-0 my-2" />
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {emptyArrayRows.map((_row, index) => {
                  return (
                    <tr key={index}>
                      {emptyArrayHeader.map((_row, indexH) => {
                        return (
                          <td key={indexH}>
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
