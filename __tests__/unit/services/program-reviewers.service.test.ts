import axios, { type AxiosInstance } from "axios"
import { TokenManager } from "@/utilities/auth/token-manager"

// Mock dependencies BEFORE importing the service
jest.mock("axios")
jest.mock("@/utilities/auth/token-manager")
jest.mock("@/utilities/enviromentVars", () => ({
  envVars: {
    NEXT_PUBLIC_GAP_INDEXER_URL: "http://localhost:4000",
  },
}))

// Create a persistent mock instance using var (hoisted) so it's available in jest.mock factory
// Use proper typing with jest.Mocked to maintain type safety
var mockAxiosInstance: jest.Mocked<AxiosInstance>

// Mock api-client - the factory runs at hoist time, so we initialize the mock here
jest.mock("@/utilities/auth/api-client", () => {
  // Initialize mock instance inline in the factory with proper typing
  const instance = {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    request: jest.fn(),
    head: jest.fn(),
    options: jest.fn(),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn(), clear: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn(), clear: jest.fn() },
    },
    defaults: {} as any,
    getUri: jest.fn(),
    deleteUri: jest.fn(),
  } as unknown as jest.Mocked<AxiosInstance>

  // Assign to the outer variable so tests can access it
  mockAxiosInstance = instance

  return {
    createAuthenticatedApiClient: jest.fn(() => instance),
  }
})

// Import the service AFTER all mocks are set up
import {
  type AddReviewerRequest,
  ProgramReviewer,
  programReviewersService,
} from "@/services/program-reviewers.service"

const mockedAxios = axios as jest.Mocked<typeof axios>

describe("programReviewersService", () => {
  beforeEach(() => {
    // Clear all mock calls but keep the mock implementations
    jest.clearAllMocks()
    mockAxiosInstance.get.mockClear()
    mockAxiosInstance.post.mockClear()
    mockAxiosInstance.delete.mockClear()

    ;(TokenManager.getToken as jest.Mock) = jest.fn().mockResolvedValue("test-token")
  })

  describe("getReviewers", () => {
    it("should fetch and return program reviewers", async () => {
      const mockApiResponse = {
        reviewers: [
          {
            publicAddress: "0x1234567890123456789012345678901234567890",
            programId: "program-1",
            chainID: 1,
            userProfile: {
              id: "user-1",
              publicAddress: "0x1234567890123456789012345678901234567890",
              name: "Alice Admin",
              email: "alice@example.com",
              telegram: "@aliceadmin",
              createdAt: "2024-01-01T00:00:00Z",
              updatedAt: "2024-01-01T00:00:00Z",
            },
            assignedAt: "2024-01-01T00:00:00Z",
            assignedBy: "0x9876543210987654321098765432109876543210",
          },
        ],
      }

      mockAxiosInstance.get.mockResolvedValue({ data: mockApiResponse })

      const result = await programReviewersService.getReviewers("program-1", 1)

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        "/v2/funding-program-configs/program-1/1/reviewers"
      )
      expect(result).toEqual([
        {
          publicAddress: "0x1234567890123456789012345678901234567890",
          name: "Alice Admin",
          email: "alice@example.com",
          telegram: "@aliceadmin",
          assignedAt: "2024-01-01T00:00:00Z",
          assignedBy: "0x9876543210987654321098765432109876543210",
        },
      ])
    })

    it("should return empty array when no reviewers found error", async () => {
      const mockError = {
        response: {
          data: {
            error: "Program Reviewer Not Found",
          },
        },
      }

      mockAxiosInstance.get.mockRejectedValue(mockError)

      const result = await programReviewersService.getReviewers("program-1", 1)

      expect(result).toEqual([])
    })

    it("should handle missing reviewers array in response", async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: {} })

      const result = await programReviewersService.getReviewers("program-1", 1)

      expect(result).toEqual([])
    })

    it("should throw error for server errors", async () => {
      const mockError = {
        response: {
          data: {
            error: "Internal Server Error",
          },
        },
      }

      mockAxiosInstance.get.mockRejectedValue(mockError)

      await expect(programReviewersService.getReviewers("program-1", 1)).rejects.toEqual(mockError)
    })
  })

  describe("addReviewer", () => {
    it("should add a program reviewer successfully", async () => {
      const reviewerData: AddReviewerRequest = {
        publicAddress: "0x1234567890123456789012345678901234567890",
        name: "Bob Reviewer",
        email: "bob@example.com",
        telegram: "@bobreviewer",
      }

      const mockApiResponse = {
        reviewer: {
          publicAddress: "0x1234567890123456789012345678901234567890",
          programId: "program-1",
          chainID: 1,
          userProfile: {
            id: "user-2",
            publicAddress: "0x1234567890123456789012345678901234567890",
            name: "Bob Reviewer",
            email: "bob@example.com",
            telegram: "@bobreviewer",
            createdAt: "2024-01-01T00:00:00Z",
            updatedAt: "2024-01-01T00:00:00Z",
          },
          assignedAt: "2024-01-01T00:00:00Z",
        },
      }

      mockAxiosInstance.post.mockResolvedValue({ data: mockApiResponse })

      const result = await programReviewersService.addReviewer("program-1", 1, reviewerData)

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        "/v2/funding-program-configs/program-1/1/reviewers",
        reviewerData
      )
      expect(result.name).toBe("Bob Reviewer")
      expect(result.email).toBe("bob@example.com")
    })

    it("should handle response without reviewer data", async () => {
      const reviewerData: AddReviewerRequest = {
        publicAddress: "0x1234567890123456789012345678901234567890",
        name: "Carol Reviewer",
        email: "carol@example.com",
      }

      mockAxiosInstance.post.mockResolvedValue({ data: {} })

      const result = await programReviewersService.addReviewer("program-1", 1, reviewerData)

      expect(result.publicAddress).toBe(reviewerData.publicAddress)
      expect(result.name).toBe(reviewerData.name)
      expect(result.assignedAt).toBeDefined()
    })
  })

  describe("removeReviewer", () => {
    it("should remove a program reviewer successfully", async () => {
      mockAxiosInstance.delete.mockResolvedValue({ data: {} })

      await programReviewersService.removeReviewer(
        "program-1",
        1,
        "0x1234567890123456789012345678901234567890"
      )

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith(
        "/v2/funding-program-configs/program-1/1/reviewers/0x1234567890123456789012345678901234567890"
      )
    })
  })

  describe("addMultipleReviewers", () => {
    it("should add multiple reviewers successfully", async () => {
      const reviewers: AddReviewerRequest[] = [
        {
          publicAddress: "0x1111111111111111111111111111111111111111",
          name: "Reviewer 1",
          email: "reviewer1@example.com",
        },
        {
          publicAddress: "0x2222222222222222222222222222222222222222",
          name: "Reviewer 2",
          email: "reviewer2@example.com",
        },
      ]

      mockAxiosInstance.post.mockResolvedValue({
        data: {
          reviewer: {
            publicAddress: "0x1111111111111111111111111111111111111111",
            programId: "program-1",
            chainID: 1,
            userProfile: {
              id: "user-1",
              publicAddress: "0x1111111111111111111111111111111111111111",
              name: "Reviewer 1",
              email: "reviewer1@example.com",
              createdAt: "2024-01-01T00:00:00Z",
              updatedAt: "2024-01-01T00:00:00Z",
            },
            assignedAt: "2024-01-01T00:00:00Z",
          },
        },
      })

      const result = await programReviewersService.addMultipleReviewers("program-1", 1, reviewers)

      expect(result.added).toHaveLength(2)
      expect(result.errors).toHaveLength(0)
    })

    it("should handle partial failures", async () => {
      const reviewers: AddReviewerRequest[] = [
        {
          publicAddress: "0x1111111111111111111111111111111111111111",
          name: "Reviewer 1",
          email: "reviewer1@example.com",
        },
        {
          publicAddress: "invalid",
          name: "Reviewer 2",
          email: "reviewer2@example.com",
        },
      ]

      // Mock axios.isAxiosError for this test
      mockedAxios.isAxiosError = jest.fn(
        (payload: any): payload is import("axios").AxiosError => true
      ) as unknown as typeof mockedAxios.isAxiosError

      mockAxiosInstance.post
        .mockResolvedValueOnce({
          data: {
            reviewer: {
              publicAddress: "0x1111111111111111111111111111111111111111",
              programId: "program-1",
              chainID: 1,
              userProfile: {
                id: "user-1",
                publicAddress: "0x1111111111111111111111111111111111111111",
                name: "Reviewer 1",
                email: "reviewer1@example.com",
                createdAt: "2024-01-01T00:00:00Z",
                updatedAt: "2024-01-01T00:00:00Z",
              },
              assignedAt: "2024-01-01T00:00:00Z",
            },
          },
        })
        .mockRejectedValueOnce({
          isAxiosError: true,
          response: {
            data: {
              message: "Invalid wallet address",
            },
          },
        })

      const result = await programReviewersService.addMultipleReviewers("program-1", 1, reviewers)

      expect(result.added).toHaveLength(1)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].error).toBe("Invalid wallet address")
    })
  })

  describe("validateReviewerData", () => {
    it("should validate correct reviewer data", () => {
      const data: AddReviewerRequest = {
        publicAddress: "0x1234567890123456789012345678901234567890",
        name: "Valid User",
        email: "valid@example.com",
        telegram: "@validuser",
      }

      const result = programReviewersService.validateReviewerData(data)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it("should reject invalid data", () => {
      const data: AddReviewerRequest = {
        publicAddress: "invalid",
        name: "",
        email: "invalid-email",
      }

      const result = programReviewersService.validateReviewerData(data)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })
})
