import { DefaultLoading } from "@/components/Utilities/DefaultLoading";
import dynamic from "next/dynamic";

const NewGrant = dynamic(
  () =>
    import("@/components/Pages/GrantMilestonesAndUpdates/screens").then(
      (mod) => mod.NewGrant
    ),
  {
    loading: () => <DefaultLoading />,
  }
);

export default function Page() {
  return <NewGrant />;
}
