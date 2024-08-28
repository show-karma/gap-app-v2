import { DefaultLoading } from "@/components/Utilities/DefaultLoading";
import { useGrantStore } from "@/store/grant";
import dynamic from "next/dynamic";

const GrantAllReviews = dynamic(
  () =>
    import("@/components/Pages/AllReviews").then((mod) => mod.GrantAllReviews),
  {
    loading: () => <DefaultLoading />,
  }
);

export default function Page() {
  const { grant } = useGrantStore();
  if (!grant) {
    return null;
  }
  return <GrantAllReviews grant={grant} />;
}
