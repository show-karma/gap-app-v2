import { AddProgramWrapper } from "@/components/Pages/ProgramRegistry/AddProgramWrapper";
import { customMetadata } from "@/utilities/meta";

export const metadata = customMetadata({
  title: "Submit a Funding Opportunity",
  description:
    "Submit your funding opportunity to the comprehensive registry of web3 funding programs.",
  path: "/funding-map/add-program",
});

export default function AddProgramPage() {
  return <AddProgramWrapper />;
}
