export interface MockApplicant {
  address: string;
}

export interface MockApplicationAnswer {
  fieldName: string;
  value: string;
}

export interface MockApplication {
  _id: string;
  referenceNumber: string;
  projectUID: string;
  programId: string;
  communitySlug: string;
  status: string;
  applicant: MockApplicant;
  answers: MockApplicationAnswer[];
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_APPLICATION: MockApplication = {
  _id: "app-001",
  referenceNumber: "APP-2024-001",
  projectUID: "project-uid-001",
  programId: "program-001",
  communitySlug: "optimism",
  status: "pending",
  applicant: { address: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc" },
  answers: [],
  createdAt: "2024-02-01T00:00:00.000Z",
  updatedAt: "2024-02-01T00:00:00.000Z",
};

export function createMockApplication(overrides?: Partial<MockApplication>): MockApplication {
  return {
    ...structuredClone(DEFAULT_APPLICATION),
    ...overrides,
  };
}

export function createApprovedApplication(overrides?: Partial<MockApplication>): MockApplication {
  return createMockApplication({
    _id: "app-approved-001",
    referenceNumber: "APP-2024-002",
    status: "approved",
    updatedAt: "2024-02-15T00:00:00.000Z",
    ...overrides,
  });
}

export function createRejectedApplication(overrides?: Partial<MockApplication>): MockApplication {
  return createMockApplication({
    _id: "app-rejected-001",
    referenceNumber: "APP-2024-003",
    status: "rejected",
    updatedAt: "2024-02-15T00:00:00.000Z",
    ...overrides,
  });
}

export function createApplicationList(count: number): MockApplication[] {
  return Array.from({ length: count }, (_, index) =>
    createMockApplication({
      _id: `app-${String(index + 1).padStart(3, "0")}`,
      referenceNumber: `APP-2024-${String(index + 1).padStart(3, "0")}`,
      projectUID: `project-uid-${String(index + 1).padStart(3, "0")}`,
      createdAt: new Date(2024, 1, index + 1).toISOString(),
      updatedAt: new Date(2024, 1, index + 1).toISOString(),
    })
  );
}
