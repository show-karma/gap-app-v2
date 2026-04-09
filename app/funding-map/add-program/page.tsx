import { AddProgramWrapper } from "@/components/Pages/ProgramRegistry/AddProgramWrapper";
import { customMetadata } from "@/utilities/meta";

export const metadata = customMetadata({
  title: "Add a Grant Program",
  description: "Add your grant program to the comprehensive registry of funding programs.",
  path: "/funding-map/add-program",
});

export default function AddProgramPage() {
  return <AddProgramWrapper />;
}
