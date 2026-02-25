import { Dashboard } from "@/components/Pages/Dashboard/Dashboard";
import { defaultMetadata } from "@/utilities/meta";

export const metadata = {
  ...defaultMetadata,
  title: "Dashboard | Karma",
};

export default function Page() {
  return <Dashboard />;
}
