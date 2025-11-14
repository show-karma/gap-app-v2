import { errorManager } from "@/components/Utilities/errorManager"
import fetchData from "@/utilities/fetchData"
import { getNewProjects } from "@/utilities/indexer/getNewProjects"
import "@testing-library/jest-dom"

jest.mock("@/utilities/fetchData")
jest.mock("@/components/Utilities/errorManager")

describe("getNewProjects", () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it("should fetch projects successfully", async () => {
    const mockData = {
      data: [
        { id: 1, name: "Project 1" },
        { id: 2, name: "Project 2" },
      ],
    }
    const mockPageInfo = { totalItems: 2, page: 0, pageLimit: 10 }
    ;(fetchData as jest.Mock).mockResolvedValue([mockData, null, mockPageInfo])

    const result = await getNewProjects(10, 0, "createdAt", "desc")

    expect(result).toEqual({
      projects: mockData.data,
      pageInfo: mockPageInfo,
      nextOffset: 1,
    })
    expect(fetchData).toHaveBeenCalledWith(expect.any(String))
  })

  it("should handle errors when fetching projects", async () => {
    ;(fetchData as jest.Mock).mockResolvedValue([null, new Error("Fetch error"), null])

    const result = await getNewProjects(10, 0, "createdAt", "desc")

    expect(result).toEqual({
      projects: [],
      pageInfo: { totalItems: 0, page: 0, pageLimit: 10 },
      nextOffset: 0,
    })
    expect(errorManager).toHaveBeenCalledWith(
      "Something went wrong while fetching new projects",
      expect.any(Error)
    )
  })

  it("should use default values for optional parameters", async () => {
    const mockData = { data: [] }
    const mockPageInfo = { totalItems: 0, page: 0, pageLimit: 10 }
    ;(fetchData as jest.Mock).mockResolvedValue([mockData, null, mockPageInfo])

    await getNewProjects(10)

    expect(fetchData).toHaveBeenCalledWith(
      expect.stringContaining("createdAt") && expect.stringContaining("desc")
    )
  })

  it("should calculate correct nextOffset", async () => {
    const mockData = { data: [{ id: 1, name: "Project 1" }] }
    const mockPageInfo = { totalItems: 1, page: 2, pageLimit: 10 }
    ;(fetchData as jest.Mock).mockResolvedValue([mockData, null, mockPageInfo])

    const result = await getNewProjects(10, 2, "updatedAt", "asc")

    expect(result.nextOffset).toBe(3)
  })
})
