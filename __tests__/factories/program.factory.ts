import type { IFormSchema, IFundingProgramConfig } from "@/types/funding-platform";
import { applyOverrides, type DeepPartial, seq } from "./utils";

// ─── MockProgram (lightweight, used in MSW handlers and component tests) ───

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
    formSchema: createMockFormSchema(),
    isEnabled: true,
    createdAt: "2024-03-01T00:00:00Z",
    updatedAt: "2024-03-01T00:00:00Z",
  };
  return applyOverrides(defaults, overrides);
}

// ─── IFundingProgramConfig factory (full backend config shape) ───

export function createMockProgramConfig(
  overrides?: DeepPartial<IFundingProgramConfig>
): IFundingProgramConfig {
  const n = seq();
  const defaults: IFundingProgramConfig = {
    id: `config-${n}`,
    programId: `program-${n}`,
    chainID: 10,
    formSchema: createMockFormSchema(),
    isEnabled: true,
    createdAt: "2024-03-01T00:00:00Z",
    updatedAt: "2024-03-01T00:00:00Z",
  };
  return applyOverrides(defaults, overrides);
}

// ─── Form schema factory ───

export function createMockFormSchema(overrides?: DeepPartial<IFormSchema>): IFormSchema {
  const defaults: IFormSchema = {
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
  };
  return applyOverrides(defaults, overrides);
}

// ─── Status presets ───

export function activeProgramConfig(
  overrides?: DeepPartial<IFundingProgramConfig>
): IFundingProgramConfig {
  return createMockProgramConfig({
    isEnabled: true,
    ...overrides,
  } as DeepPartial<IFundingProgramConfig>);
}

export function disabledProgramConfig(
  overrides?: DeepPartial<IFundingProgramConfig>
): IFundingProgramConfig {
  return createMockProgramConfig({
    isEnabled: false,
    ...overrides,
  } as DeepPartial<IFundingProgramConfig>);
}

export function programWithAI(
  overrides?: DeepPartial<IFundingProgramConfig>
): IFundingProgramConfig {
  return createMockProgramConfig({
    systemPrompt: "Evaluate this grant application for technical feasibility and impact.",
    detailedPrompt:
      "Score this application 1-10 on: technical approach, team capability, ecosystem impact.",
    aiModel: "gpt-4",
    enableRealTimeEvaluation: true,
    ...overrides,
  } as DeepPartial<IFundingProgramConfig>);
}
