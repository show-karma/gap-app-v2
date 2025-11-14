/**
 * @file Tests for useCopyToClipboard hook
 * @description Tests clipboard utility hook with toast notifications
 */

import { act, renderHook } from "@testing-library/react"
import toast from "react-hot-toast"
import * as errorManagerModule from "@/components/Utilities/errorManager"
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard"

// Mock dependencies
jest.mock("react-hot-toast")
jest.mock("@/components/Utilities/errorManager")

const mockToast = toast as jest.Mocked<typeof toast>
const mockErrorManager = errorManagerModule.errorManager as jest.MockedFunction<
  typeof errorManagerModule.errorManager
>

describe("useCopyToClipboard", () => {
  const originalClipboard = navigator.clipboard
  const mockWriteText = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText,
      },
    })
  })

  afterEach(() => {
    Object.assign(navigator, {
      clipboard: originalClipboard,
    })
  })

  describe("Initialization", () => {
    it("should initialize with null copiedText", () => {
      const { result } = renderHook(() => useCopyToClipboard())

      expect(result.current[0]).toBeNull()
      expect(typeof result.current[1]).toBe("function")
    })

    it("should return tuple of [copiedText, copy function]", () => {
      const { result } = renderHook(() => useCopyToClipboard())

      expect(Array.isArray(result.current)).toBe(true)
      expect(result.current).toHaveLength(2)
    })
  })

  describe("Successful Copy", () => {
    it("should copy text to clipboard with default message", async () => {
      mockWriteText.mockResolvedValue(undefined)

      const { result } = renderHook(() => useCopyToClipboard())

      let copyResult: boolean = false
      await act(async () => {
        copyResult = await result.current[1]("test text")
      })

      expect(mockWriteText).toHaveBeenCalledWith("test text")
      expect(result.current[0]).toBe("test text")
      expect(mockToast.success).toHaveBeenCalledWith("Copied to clipboard")
      expect(copyResult).toBe(true)
    })

    it("should copy text with custom message", async () => {
      mockWriteText.mockResolvedValue(undefined)

      const { result } = renderHook(() => useCopyToClipboard())

      let copyResult: boolean = false
      await act(async () => {
        copyResult = await result.current[1]("test text", "Custom success message")
      })

      expect(mockWriteText).toHaveBeenCalledWith("test text")
      expect(mockToast.success).toHaveBeenCalledWith("Custom success message")
      expect(copyResult).toBe(true)
    })

    it("should update copiedText state after successful copy", async () => {
      mockWriteText.mockResolvedValue(undefined)

      const { result } = renderHook(() => useCopyToClipboard())

      await act(async () => {
        await result.current[1]("first text")
      })

      expect(result.current[0]).toBe("first text")

      await act(async () => {
        await result.current[1]("second text")
      })

      expect(result.current[0]).toBe("second text")
    })

    it("should handle empty string copy", async () => {
      mockWriteText.mockResolvedValue(undefined)

      const { result } = renderHook(() => useCopyToClipboard())

      let copyResult: boolean = false
      await act(async () => {
        copyResult = await result.current[1]("")
      })

      expect(mockWriteText).toHaveBeenCalledWith("")
      expect(result.current[0]).toBe("")
      expect(copyResult).toBe(true)
    })

    it("should handle special characters", async () => {
      mockWriteText.mockResolvedValue(undefined)

      const { result } = renderHook(() => useCopyToClipboard())
      const specialText = "Text with\nnewlines\tand\ttabs"

      await act(async () => {
        await result.current[1](specialText)
      })

      expect(mockWriteText).toHaveBeenCalledWith(specialText)
      expect(result.current[0]).toBe(specialText)
    })

    it("should handle unicode characters", async () => {
      mockWriteText.mockResolvedValue(undefined)

      const { result } = renderHook(() => useCopyToClipboard())
      const unicodeText = "Hello 👋 World 🌍"

      await act(async () => {
        await result.current[1](unicodeText)
      })

      expect(mockWriteText).toHaveBeenCalledWith(unicodeText)
      expect(result.current[0]).toBe(unicodeText)
    })

    it("should handle long text", async () => {
      mockWriteText.mockResolvedValue(undefined)

      const { result } = renderHook(() => useCopyToClipboard())
      const longText = "a".repeat(10000)

      await act(async () => {
        await result.current[1](longText)
      })

      expect(mockWriteText).toHaveBeenCalledWith(longText)
      expect(result.current[0]).toBe(longText)
    })
  })

  describe("Copy Failures", () => {
    it("should handle clipboard API errors", async () => {
      const error = new Error("Clipboard write failed")
      mockWriteText.mockRejectedValue(error)

      const { result } = renderHook(() => useCopyToClipboard())

      let copyResult: boolean = true
      await act(async () => {
        copyResult = await result.current[1]("test text")
      })

      expect(result.current[0]).toBeNull()
      expect(mockErrorManager).toHaveBeenCalledWith("Copy to clipboard failed", error)
      expect(copyResult).toBe(false)
    })

    it("should reset copiedText to null on error", async () => {
      mockWriteText.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("Failed"))

      const { result } = renderHook(() => useCopyToClipboard())

      // First successful copy
      await act(async () => {
        await result.current[1]("success text")
      })
      expect(result.current[0]).toBe("success text")

      // Second copy fails
      await act(async () => {
        await result.current[1]("fail text")
      })
      expect(result.current[0]).toBeNull()
    })

    it("should handle permission errors", async () => {
      const permissionError = new Error("Permission denied")
      mockWriteText.mockRejectedValue(permissionError)

      const { result } = renderHook(() => useCopyToClipboard())

      let copyResult: boolean = true
      await act(async () => {
        copyResult = await result.current[1]("test text")
      })

      expect(copyResult).toBe(false)
      expect(mockErrorManager).toHaveBeenCalledWith("Copy to clipboard failed", permissionError)
    })
  })

  describe("Clipboard API Unavailability", () => {
    it("should return false when clipboard API is not supported", async () => {
      Object.assign(navigator, {
        clipboard: undefined,
      })

      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation()

      const { result } = renderHook(() => useCopyToClipboard())

      let copyResult: boolean = true
      await act(async () => {
        copyResult = await result.current[1]("test text")
      })

      expect(copyResult).toBe(false)
      expect(consoleWarnSpy).toHaveBeenCalledWith("Clipboard not supported")
      expect(result.current[0]).toBeNull()

      consoleWarnSpy.mockRestore()
    })

    it("should not attempt to write when clipboard is null", async () => {
      Object.assign(navigator, {
        clipboard: null,
      })

      const { result } = renderHook(() => useCopyToClipboard())

      await act(async () => {
        await result.current[1]("test text")
      })

      expect(mockWriteText).not.toHaveBeenCalled()
    })
  })

  describe("Function Stability", () => {
    it("should maintain stable copy function reference", () => {
      const { result, rerender } = renderHook(() => useCopyToClipboard())

      const firstCopyFn = result.current[1]
      rerender()
      const secondCopyFn = result.current[1]

      expect(firstCopyFn).toBe(secondCopyFn)
    })
  })

  describe("Concurrent Copies", () => {
    it("should handle multiple sequential copies", async () => {
      mockWriteText.mockResolvedValue(undefined)

      const { result } = renderHook(() => useCopyToClipboard())

      await act(async () => {
        await result.current[1]("text 1")
        await result.current[1]("text 2")
        await result.current[1]("text 3")
      })

      expect(result.current[0]).toBe("text 3")
      expect(mockWriteText).toHaveBeenCalledTimes(3)
    })

    it("should handle rapid consecutive copies", async () => {
      mockWriteText.mockResolvedValue(undefined)

      const { result } = renderHook(() => useCopyToClipboard())

      await act(async () => {
        const promises = [
          result.current[1]("rapid 1"),
          result.current[1]("rapid 2"),
          result.current[1]("rapid 3"),
        ]
        await Promise.all(promises)
      })

      expect(mockWriteText).toHaveBeenCalledTimes(3)
    })
  })

  describe("Edge Cases", () => {
    it("should handle copy of whitespace-only text", async () => {
      mockWriteText.mockResolvedValue(undefined)

      const { result } = renderHook(() => useCopyToClipboard())

      await act(async () => {
        await result.current[1]("   ")
      })

      expect(mockWriteText).toHaveBeenCalledWith("   ")
      expect(result.current[0]).toBe("   ")
    })

    it("should handle copy of JSON strings", async () => {
      mockWriteText.mockResolvedValue(undefined)

      const { result } = renderHook(() => useCopyToClipboard())
      const jsonString = JSON.stringify({ key: "value", nested: { prop: 123 } })

      await act(async () => {
        await result.current[1](jsonString)
      })

      expect(mockWriteText).toHaveBeenCalledWith(jsonString)
      expect(result.current[0]).toBe(jsonString)
    })

    it("should handle copy of URLs", async () => {
      mockWriteText.mockResolvedValue(undefined)

      const { result } = renderHook(() => useCopyToClipboard())
      const url = "https://example.com/path?query=value&other=param"

      await act(async () => {
        await result.current[1](url)
      })

      expect(mockWriteText).toHaveBeenCalledWith(url)
      expect(result.current[0]).toBe(url)
    })
  })

  describe("Return Value Consistency", () => {
    it("should return consistent boolean based on success", async () => {
      mockWriteText
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error("Failed"))
        .mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useCopyToClipboard())

      let result1: boolean = false
      await act(async () => {
        result1 = await result.current[1]("success 1")
      })
      expect(result1).toBe(true)

      let result2: boolean = false
      await act(async () => {
        result2 = await result.current[1]("failure")
      })
      expect(result2).toBe(false)

      let result3: boolean = false
      await act(async () => {
        result3 = await result.current[1]("success 2")
      })
      expect(result3).toBe(true)
    })
  })
})
