export interface MockApplicationFormField {
  name: string;
  type: string;
  label: string;
  required: boolean;
  placeholder?: string;
}

export interface MockApplicationForm {
  fields: MockApplicationFormField[];
}

export interface MockProgram {
  _id: string;
  programId: string;
  communitySlug: string;
  title: string;
  description: string;
  status: string;
  budgetAmount: number;
  budgetToken: string;
  applicationForm: MockApplicationForm;
  categories: string[];
  createdAt: string;
  updatedAt: string;
  accessCodeEnabled: boolean;
  accessCode?: string;
  endDate?: string;
}

const DEFAULT_APPLICATION_FORM: MockApplicationForm = {
  fields: [
    {
      name: "projectName",
      type: "text",
      label: "Project Name",
      required: true,
      placeholder: "Enter your project name",
    },
    {
      name: "projectDescription",
      type: "textarea",
      label: "Project Description",
      required: true,
      placeholder: "Describe your project",
    },
    {
      name: "requestedAmount",
      type: "number",
      label: "Requested Amount",
      required: true,
      placeholder: "Enter requested funding amount",
    },
  ],
};

const DEFAULT_PROGRAM: MockProgram = {
  _id: "program-001",
  programId: "program-001",
  communitySlug: "optimism",
  title: "Test Grant Program",
  description: "A test funding program",
  status: "active",
  budgetAmount: 100000,
  budgetToken: "USDC",
  applicationForm: DEFAULT_APPLICATION_FORM,
  categories: ["DeFi", "Infrastructure"],
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-15T00:00:00.000Z",
  accessCodeEnabled: false,
};

export function createMockProgram(overrides?: Partial<MockProgram>): MockProgram {
  return {
    ...structuredClone(DEFAULT_PROGRAM),
    ...overrides,
  };
}

export function createMockProgramWithAccessCode(overrides?: Partial<MockProgram>): MockProgram {
  return createMockProgram({
    _id: "program-access-001",
    programId: "program-access-001",
    title: "Access Code Grant Program",
    description: "A funding program requiring an access code to apply",
    accessCodeEnabled: true,
    accessCode: "TEST-ACCESS-2024",
    ...overrides,
  });
}

export function createClosedProgram(overrides?: Partial<MockProgram>): MockProgram {
  return createMockProgram({
    _id: "program-closed-001",
    programId: "program-closed-001",
    title: "Closed Grant Program",
    description: "A funding program that is no longer accepting applications",
    status: "closed",
    endDate: "2024-01-31T23:59:59.000Z",
    ...overrides,
  });
}
