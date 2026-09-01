import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useGrantDetailsModal } from "@/components/Pages/Admin/ControlCenter/useGrantDetailsModal";

const rows = [
  { grantUid: "grant-batch-3", projectSlug: "filecoin-infra" },
  { grantUid: "grant-batch-2", projectSlug: "filecoin-infra" },
];

function setup(overrides: Partial<Parameters<typeof useGrantDetailsModal>[0]> = {}) {
  const replaceQuery = vi.fn();
  const params = {
    projectParam: "filecoin-infra",
    grantParam: "grant-batch-2",
    searchQuery: "",
    isLoading: false,
    rows,
    replaceQuery,
    ...overrides,
  };
  const hook = renderHook((p: typeof params) => useGrantDetailsModal(p), {
    initialProps: params,
  });
  return { ...hook, replaceQuery, params };
}

describe("useGrantDetailsModal", () => {
  it("should_open_the_matching_grant_and_strip_params_when_row_is_present", () => {
    const { result, replaceQuery } = setup();

    expect(result.current.detailsGrantUid).toBe("grant-batch-2");
    expect(result.current.detailsModalOpen).toBe(true);
    expect(replaceQuery).toHaveBeenCalledWith({ project: null, grant: null, search: null });
  });

  it("should_do_nothing_when_project_param_is_absent", () => {
    const { result, replaceQuery } = setup({ projectParam: undefined });

    expect(result.current.detailsModalOpen).toBe(false);
    expect(replaceQuery).not.toHaveBeenCalled();
  });

  it("should_wait_while_data_is_loading", () => {
    const { result, replaceQuery } = setup({ isLoading: true });

    expect(result.current.detailsModalOpen).toBe(false);
    expect(replaceQuery).not.toHaveBeenCalled();
  });

  it("should_narrow_by_search_when_project_is_not_in_current_rows", () => {
    const { result, replaceQuery } = setup({ projectParam: "elsewhere" });

    expect(result.current.detailsModalOpen).toBe(false);
    expect(replaceQuery).toHaveBeenCalledWith({ search: "elsewhere", page: "1" });
  });

  it("should_clean_url_when_already_searched_and_still_not_found", () => {
    const { result, replaceQuery } = setup({ projectParam: "elsewhere", searchQuery: "elsewhere" });

    expect(result.current.detailsModalOpen).toBe(false);
    expect(replaceQuery).toHaveBeenCalledWith({ project: null, grant: null, search: null });
  });

  it("should_keep_an_unrelated_search_query_when_opening", () => {
    const { replaceQuery } = setup({ searchQuery: "other" });

    expect(replaceQuery).toHaveBeenCalledWith({ project: null, grant: null, search: "other" });
  });

  it("should_not_reopen_after_close_for_the_same_project_param", () => {
    const { result, rerender, params } = setup();

    act(() => result.current.closeDetails());
    rerender({ ...params, rows: [...rows] });

    expect(result.current.detailsModalOpen).toBe(false);
    expect(result.current.detailsGrantUid).toBeNull();
  });

  it("should_open_and_close_manually_via_openDetails_and_closeDetails", () => {
    const { result } = setup({ projectParam: undefined });

    act(() => result.current.openDetails("grant-batch-3"));
    expect(result.current.detailsGrantUid).toBe("grant-batch-3");
    expect(result.current.detailsModalOpen).toBe(true);

    act(() => result.current.closeDetails());
    expect(result.current.detailsGrantUid).toBeNull();
    expect(result.current.detailsModalOpen).toBe(false);
  });
});
