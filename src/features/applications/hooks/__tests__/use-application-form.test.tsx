/**
 * Regression test for the milestone "errors flash on Add" bug.
 *
 * Background: RHF v7.62's useFieldArray has an internal useEffect that
 * fires the resolver on the array path after every append/remove,
 * gated on:
 *
 *   _actioned.current
 *   && (!mode.isOnSubmit || isSubmitted)
 *   && !reValidateMode.isOnSubmit
 *
 * With `mode: "onBlur"` (the previous default in this hook) the second
 * condition was always true regardless of submission state — so
 * appending an empty milestone instantly re-ran zod, which returned
 * nested errors for every required sub-field. The fix here is to keep
 * `mode: "onSubmit"`. This file pins both the absence of eager errors
 * AND the proxyFormState invariant: nothing in this hook may
 * re-subscribe to `isValid` / `isDirty`, since that also triggers
 * resolver passes on every state mutation.
 */
import { act, renderHook } from "@testing-library/react";
import { useFieldArray } from "react-hook-form";
import { describe, expect, it } from "vitest";
import type { ApplicationQuestion } from "@/types/whitelabel-entities";
import { useApplicationForm } from "../use-application-form";

const milestoneQuestion: ApplicationQuestion = {
  id: "milestones",
  type: "milestone",
  label: "Project Milestones",
  required: true,
  validation: { minMilestones: 1, maxMilestones: 5 },
};

function useApplicationFormWithMilestones() {
  const form = useApplicationForm([milestoneQuestion]);
  const fa = useFieldArray({ control: form.control, name: "milestones" as never });
  return { form, fa };
}

describe("useApplicationForm — useFieldArray eager-validation guard", () => {
  it("does not populate per-field errors when a milestone is appended before any submit", () => {
    const { result } = renderHook(() => useApplicationFormWithMilestones());

    // Sanity: no errors initially.
    expect(result.current.form.formState.errors).toEqual({});

    act(() => {
      result.current.fa.append({
        title: "",
        description: "",
        dueDate: "",
        fundingRequested: "",
        completionCriteria: "",
      } as never);
    });

    // The fix: no error tree was populated for `milestones` on append.
    // If `mode` ever flips back to `'onBlur'` (or anything other than
    // 'onSubmit'), or if a future edit re-subscribes to isValid /
    // isDirty, RHF's internal useFieldArray effect will fire the
    // resolver here and this assertion fails.
    expect(result.current.form.formState.errors.milestones).toBeUndefined();
  });

  it("does not populate errors when a milestone is removed before any submit", () => {
    const { result } = renderHook(() => useApplicationFormWithMilestones());

    act(() => {
      result.current.fa.append({
        title: "T",
        description: "D",
        dueDate: `${new Date().getFullYear() + 1}-01-01`,
        fundingRequested: "$1",
        completionCriteria: "Done",
      } as never);
    });

    act(() => {
      result.current.fa.remove(0);
    });

    expect(result.current.form.formState.errors.milestones).toBeUndefined();
  });

  it("still rejects an empty milestone when validation is explicitly triggered", async () => {
    // Counterpart guarantee: the resolver still works — required
    // sub-fields DO fail when validation is actually run.
    const { result } = renderHook(() => useApplicationFormWithMilestones());

    act(() => {
      result.current.fa.append({
        title: "",
        description: "",
        dueDate: "",
        fundingRequested: "",
        completionCriteria: "",
      } as never);
    });

    let isValid: boolean | undefined;
    await act(async () => {
      isValid = await result.current.form.validateForm();
    });

    expect(isValid).toBe(false);
  });
});
