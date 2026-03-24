import type { IFormSchema, IFundingProgramConfig } from "@/types/funding-platform";
import type { Community } from "@/types/v2/community";
import { applyOverrides, type DeepPartial, seq } from "./utils";

// ─── Community factory ───

export function createMockCommunity(overrides?: DeepPartial<Community>): Community {
  const n = seq();
  const defaults: Community = {
    uid: `0xcommunity${n.toString(16).padStart(8, "0")}` as `0x${string}`,
    chainID: 10,
    details: {
      name: `Optimism RetroPGF Round ${n}`,
      description:
        "A retroactive public goods funding program rewarding builders who create measurable impact in the Optimism ecosystem.",
      slug: `optimism-retropgf-${n}`,
      imageURL: `https://storage.karma.fund/communities/retropgf-${n}.png`,
    },
    createdAt: "2024-01-10T08:00:00Z",
    updatedAt: "2024-06-01T12:00:00Z",
  };
  return applyOverrides(defaults, overrides);
}

// ─── Program factory ───

export interface MockProgram {
  id: string;
  programId: string;
  chainID: number;
  communityUID: string;
  name: string;
  status: "active" | "closed" | "draft";
  formSchema: IFormSchema;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export function createMockProgram(overrides?: DeepPartial<MockProgram>): MockProgram {
  const n = seq();
  const defaults: MockProgram = {
    id: `config-${n}`,
    programId: `program-${n}`,
    chainID: 10,
    communityUID: `0xcommunity${n.toString(16).padStart(8, "0")}`,
    name: `Season ${n} Builder Grants`,
    status: "active",
    formSchema: {
      title: "Grant Application Form",
      description: "Apply for a builder grant in this funding round",
      fields: [
        {
          id: "projectName",
          type: "text",
          label: "Project Name",
          placeholder: "Enter your project name",
          required: true,
        },
        {
          id: "description",
          type: "textarea",
          label: "Project Description",
          placeholder: "Describe your project",
          required: true,
          validation: { maxLength: 5000 },
        },
        {
          id: "fundingAmount",
          type: "number",
          label: "Funding Requested (USD)",
          required: true,
          validation: { min: 1000, max: 100000 },
        },
      ],
      settings: {
        submitButtonText: "Submit Application",
        confirmationMessage: "Your application has been submitted successfully.",
      },
    },
    isEnabled: true,
    createdAt: "2024-03-01T00:00:00Z",
    updatedAt: "2024-03-01T00:00:00Z",
  };
  return applyOverrides(defaults, overrides);
}
