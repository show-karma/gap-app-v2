import { DefaultLoading } from "@/components/Utilities/DefaultLoading";
import { useGrantStore } from "@/store/grant";
import dynamic from "next/dynamic";

const ReviewGrant = dynamic(
  () => import("@/components/Pages/ReviewGrant").then((mod) => mod.ReviewGrant),
  {
    loading: () => <DefaultLoading />,
  }
);
export default function Page() {
  const { grant } = useGrantStore();
  if (!grant) {
    return null;
  }
  return <ReviewGrant grant={grant} />;
}
