import { render, screen } from "@testing-library/react"
import EthereumAddressToENSName from "@/components/EthereumAddressToENSName"
import "@testing-library/jest-dom"

// Mock ENS store
const mockPopulateEns = jest.fn()
const mockEnsData = {}

jest.mock("@/store/ens", () => ({
  useENS: jest.fn((selector) => {
    const state = {
      ensData: mockEnsData,
      populateEns: mockPopulateEns,
    }
    return selector ? selector(state) : state
  }),
}))

describe("EthereumAddressToENSName", () => {
  const mockAddress = "0x1234567890abcdef1234567890abcdef12345678"

  beforeEach(() => {
    jest.clearAllMocks()
    Object.keys(mockEnsData).forEach((key) => delete (mockEnsData as any)[key])
  })

  describe("Rendering", () => {
    it("should render span element", () => {
      render(<EthereumAddressToENSName address={mockAddress} />)

      const span = screen.getByText(/0x1234/)
      expect(span.tagName).toBe("SPAN")
    })

    it("should have font-body class", () => {
      render(<EthereumAddressToENSName address={mockAddress} />)

      const span = screen.getByText(/0x1234/)
      expect(span).toHaveClass("font-body")
    })
  })

  describe("Address Truncation", () => {
    it("should truncate address by default", () => {
      render(<EthereumAddressToENSName address={mockAddress} />)

      expect(screen.getByText("0x1234...345678")).toBeInTheDocument()
    })

    it("should truncate address when shouldTruncate is true", () => {
      render(<EthereumAddressToENSName address={mockAddress} shouldTruncate={true} />)

      expect(screen.getByText("0x1234...345678")).toBeInTheDocument()
    })

    it("should not truncate address when shouldTruncate is false", () => {
      render(<EthereumAddressToENSName address={mockAddress} shouldTruncate={false} />)

      expect(screen.getByText(mockAddress.toLowerCase())).toBeInTheDocument()
    })

    it("should show first 6 and last 6 characters when truncated", () => {
      render(<EthereumAddressToENSName address={mockAddress} />)

      const text = screen.getByText(/0x1234...345678/)
      expect(text).toBeInTheDocument()
    })
  })

  describe("ENS Name Resolution", () => {
    it("should display ENS name when available", () => {
      const ensName = "vitalik.eth"
      ;(mockEnsData as any)[mockAddress.toLowerCase()] = { name: ensName }

      render(<EthereumAddressToENSName address={mockAddress} />)

      expect(screen.getByText(ensName)).toBeInTheDocument()
    })

    it("should prefer ENS name over truncated address", () => {
      const ensName = "test.eth"
      ;(mockEnsData as any)[mockAddress.toLowerCase()] = { name: ensName }

      render(<EthereumAddressToENSName address={mockAddress} />)

      expect(screen.getByText(ensName)).toBeInTheDocument()
      expect(screen.queryByText(/0x1234/)).not.toBeInTheDocument()
    })

    it("should call populateEns when ENS name not in cache", () => {
      render(<EthereumAddressToENSName address={mockAddress} />)

      expect(mockPopulateEns).toHaveBeenCalledWith([mockAddress.toLowerCase()])
    })

    it("should not call populateEns when ENS name is cached", () => {
      ;(mockEnsData as any)[mockAddress.toLowerCase()] = { name: "cached.eth" }

      render(<EthereumAddressToENSName address={mockAddress} />)

      expect(mockPopulateEns).not.toHaveBeenCalled()
    })
  })

  describe("Case Handling", () => {
    it("should convert address to lowercase", () => {
      const upperAddress = "0xABCDEF1234567890ABCDEF1234567890ABCDEF12"

      render(<EthereumAddressToENSName address={upperAddress} />)

      expect(mockPopulateEns).toHaveBeenCalledWith([upperAddress.toLowerCase()])
    })

    it("should display lowercase address", () => {
      const mixedCase = "0xAbCdEf1234567890AbCdEf1234567890AbCdEf12"

      render(<EthereumAddressToENSName address={mixedCase} />)

      // The address will be truncated, so check for the truncated form
      const displayText = screen.getByText(/0xabcd...cdef12/)
      expect(displayText).toBeInTheDocument()
    })
  })

  describe("Edge Cases", () => {
    it("should handle short addresses", () => {
      const shortAddress = "0x123"

      render(<EthereumAddressToENSName address={shortAddress} />)

      // Truncation logic may still apply
      expect(screen.getByText(/0x123/)).toBeInTheDocument()
    })

    it("should handle undefined address gracefully", () => {
      const { container } = render(<EthereumAddressToENSName address={undefined} />)

      expect(container.querySelector("span")).toBeInTheDocument()
    })

    it("should handle null address", () => {
      const { container } = render(<EthereumAddressToENSName address={null} />)

      expect(container.querySelector("span")).toBeInTheDocument()
    })

    it("should handle empty string address", () => {
      render(<EthereumAddressToENSName address="" />)

      expect(screen.getByText("...")).toBeInTheDocument()
    })
  })

  describe("ENS Store Integration", () => {
    it("should check ENS data on mount", () => {
      render(<EthereumAddressToENSName address={mockAddress} />)

      expect(mockPopulateEns).toHaveBeenCalledTimes(1)
    })

    it("should update when address changes", () => {
      const { rerender } = render(<EthereumAddressToENSName address={mockAddress} />)

      const newAddress = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
      rerender(<EthereumAddressToENSName address={newAddress} />)

      expect(mockPopulateEns).toHaveBeenCalledWith([newAddress.toLowerCase()])
    })
  })

  describe("Display Formatting", () => {
    it("should display full address when not truncated", () => {
      render(<EthereumAddressToENSName address={mockAddress} shouldTruncate={false} />)

      const fullAddress = mockAddress.toLowerCase()
      expect(screen.getByText(fullAddress)).toBeInTheDocument()
    })

    it("should add ellipsis in truncated format", () => {
      render(<EthereumAddressToENSName address={mockAddress} />)

      const text = screen.getByText(/\.\.\./)
      expect(text).toBeInTheDocument()
    })
  })

  describe("Multiple Instances", () => {
    it("should render multiple addresses independently", () => {
      const address1 = "0x1111111111111111111111111111111111111111"
      const address2 = "0x2222222222222222222222222222222222222222"

      const { container } = render(
        <>
          <EthereumAddressToENSName address={address1} />
          <EthereumAddressToENSName address={address2} />
        </>
      )

      const spans = container.querySelectorAll("span")
      expect(spans).toHaveLength(2)
    })
  })

  describe("ENS Name Fallback", () => {
    it("should show address when ENS name is undefined", () => {
      ;(mockEnsData as any)[mockAddress.toLowerCase()] = { name: undefined }

      render(<EthereumAddressToENSName address={mockAddress} />)

      expect(screen.getByText("0x1234...345678")).toBeInTheDocument()
    })

    it("should show address when ENS name is empty string", () => {
      ;(mockEnsData as any)[mockAddress.toLowerCase()] = { name: "" }

      render(<EthereumAddressToENSName address={mockAddress} />)

      expect(screen.getByText("0x1234...345678")).toBeInTheDocument()
    })

    it("should show address when ENS data is null", () => {
      ;(mockEnsData as any)[mockAddress.toLowerCase()] = null

      render(<EthereumAddressToENSName address={mockAddress} />)

      expect(screen.getByText("0x1234...345678")).toBeInTheDocument()
    })
  })
})
