/**
 * Tests for useMilestoneActions hook.
 *
 * This hook manages UI state for milestone completing/editing actions.
 * It uses useState (not useMutation), so we test state transitions directly.
 */

import { act } from "@testing-library/react";
import { useMilestoneActions } from "@/hooks/useMilestoneActions";
import { renderHookWithProviders } from "../../utils/render";

describe("useMilestoneActions (state management)", () => {
  it("starts with isCompleting and isEditing both false", () => {
    const { result } = renderHookWithProviders(() => useMilestoneActions());

    expect(result.current.isCompleting).toBe(false);
    expect(result.current.isEditing).toBe(false);
  });

  it("sets isCompleting to true via handleCompleting", () => {
    const { result } = renderHookWithProviders(() => useMilestoneActions());

    act(() => {
      result.current.handleCompleting(true);
    });

    expect(result.current.isCompleting).toBe(true);
    expect(result.current.isEditing).toBe(false);
  });

  it("sets isCompleting back to false", () => {
    const { result } = renderHookWithProviders(() => useMilestoneActions());

    act(() => {
      result.current.handleCompleting(true);
    });
    expect(result.current.isCompleting).toBe(true);

    act(() => {
      result.current.handleCompleting(false);
    });
    expect(result.current.isCompleting).toBe(false);
  });

  it("sets isEditing to true via handleEditing", () => {
    const { result } = renderHookWithProviders(() => useMilestoneActions());

    act(() => {
      result.current.handleEditing(true);
    });

    expect(result.current.isEditing).toBe(true);
    expect(result.current.isCompleting).toBe(false);
  });

  it("sets isEditing back to false", () => {
    const { result } = renderHookWithProviders(() => useMilestoneActions());

    act(() => {
      result.current.handleEditing(true);
    });
    expect(result.current.isEditing).toBe(true);

    act(() => {
      result.current.handleEditing(false);
    });
    expect(result.current.isEditing).toBe(false);
  });

  it("allows both states to be set independently", () => {
    const { result } = renderHookWithProviders(() => useMilestoneActions());

    act(() => {
      result.current.handleCompleting(true);
      result.current.handleEditing(true);
    });

    expect(result.current.isCompleting).toBe(true);
    expect(result.current.isEditing).toBe(true);
  });
});
