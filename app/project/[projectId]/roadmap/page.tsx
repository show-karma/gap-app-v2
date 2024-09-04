import { ObjectiveFilter } from "@/components/Pages/Project/Objective/Filter";
import { ObjectiveList } from "@/components/Pages/Project/Objective/List";

export default function RoadmapPage() {
  return (
    <div className="flex flex-col w-full h-full items-center justify-start">
      <div className="flex flex-col gap-2 py-11 items-center justify-start w-full  max-w-3xl">
        <div className="py-5 w-full items-center flex flex-row justify-end">
          <ObjectiveFilter />
        </div>
        <div className="py-6 w-full ">
          <ObjectiveList />
        </div>
      </div>
    </div>
  );
}
