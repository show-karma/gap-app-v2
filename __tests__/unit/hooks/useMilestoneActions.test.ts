/**
 * @file Tests for useMilestoneActions hook
 * @description Tests for milestone action state management hook
 */

import { act, renderHook } from "@testing-library/react"
import { useMilestoneActions } from "@/hooks/useMilestoneActions"

describe("useMilestoneActions", () => {
  it("should initialize with default state", () => {
    const { result } = renderHook(() => useMilestoneActions())

    expect(result.current.isCompleting).toBe(false)
    expect(result.current.isEditing).toBe(false)
  })

  it("should update isCompleting state when handleCompleting is called", () => {
    const { result } = renderHook(() => useMilestoneActions())

    act(() => {
      result.current.handleCompleting(true)
    })

    expect(result.current.isCompleting).toBe(true)

    act(() => {
      result.current.handleCompleting(false)
    })

    expect(result.current.isCompleting).toBe(false)
  })

  it("should update isEditing state when handleEditing is called", () => {
    const { result } = renderHook(() => useMilestoneActions())

    act(() => {
      result.current.handleEditing(true)
    })

    expect(result.current.isEditing).toBe(true)

    act(() => {
      result.current.handleEditing(false)
    })

    expect(result.current.isEditing).toBe(false)
  })

  it("should handle multiple state changes independently", () => {
    const { result } = renderHook(() => useMilestoneActions())

    act(() => {
      result.current.handleCompleting(true)
      result.current.handleEditing(true)
    })

    expect(result.current.isCompleting).toBe(true)
    expect(result.current.isEditing).toBe(true)

    act(() => {
      result.current.handleCompleting(false)
    })

    expect(result.current.isCompleting).toBe(false)
    expect(result.current.isEditing).toBe(true)
  })

  it("should maintain state across re-renders", () => {
    const { result, rerender } = renderHook(() => useMilestoneActions())

    act(() => {
      result.current.handleCompleting(true)
    })

    rerender()

    expect(result.current.isCompleting).toBe(true)
  })
})
