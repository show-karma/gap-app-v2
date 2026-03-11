export const MOCK_USERS = {
  superAdmin: {
    address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    token: "mock-token-super-admin",
  },
  registryAdmin: {
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    token: "mock-token-registry-admin",
  },
  communityAdmin: {
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    token: "mock-token-community-admin",
  },
  programAdmin: {
    address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    token: "mock-token-program-admin",
  },
  reviewer: {
    address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    token: "mock-token-reviewer",
  },
  applicant: {
    address: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
    token: "mock-token-applicant",
  },
  guest: {
    address: "0x976EA74026E726554dB657fA54763abd0C3a0aa9",
    token: "mock-token-guest",
  },
} as const;

export type MockUserRole = keyof typeof MOCK_USERS;
