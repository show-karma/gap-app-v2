import { DefaultLoading } from "@/components/Utilities/DefaultLoading";

import dynamic from "next/dynamic";

const GrantCompletion = dynamic(
  () =>
    import(
      "@/components/Pages/GrantMilestonesAndUpdates/screens/MilestonesAndUpdates/CompleteGrant"
    ).then((mod) => mod.GrantCompletion),
  {
    loading: () => <DefaultLoading />,
  }
);
export default function Page() {
  return <GrantCompletion />;
}
