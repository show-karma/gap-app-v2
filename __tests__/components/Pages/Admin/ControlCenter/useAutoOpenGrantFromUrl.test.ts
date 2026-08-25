import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAutoOpenGrantFromUrl } from "@/components/Pages/Admin/ControlCenter/useAutoOpenGrantFromUrl";

const rows = [
  { grantUid: "grant-batch-3", projectSlug: "filecoin-infra" },
  { grantUid: "grant-batch-2", projectSlug: "filecoin-infra" },
];

function setup(overrides: Partial<Parameters<typeof useAutoOpenGrantFromUrl>[0]> = {}) {
  const replaceQuery = vi.fn();
  const onOpen = vi.fn();
  const params = {
    projectParam: "filecoin-infra",
    grantParam: "grant-batch-2",
    searchQuery: "",
    isLoading: false,
    rows,
    replaceQuery,
    onOpen,
    ...overrides,
  };
  const hook = renderHook((p: typeof params) => useAutoOpenGrantFromUrl(p), {
    initialProps: params,
  });
  return { ...hook, replaceQuery, onOpen, params };
}

describe("useAutoOpenGrantFromUrl", () => {
  it("should_open_the_matching_grant_and_strip_params_when_row_is_present", () => {
    const { onOpen, replaceQuery } = setup();

    expect(onOpen).toHaveBeenCalledWith(rows[1]);
    expect(replaceQuery).toHaveBeenCalledWith({ project: null, grant: null, search: null });
  });

  it("should_do_nothing_when_project_param_is_absent", () => {
    const { onOpen, replaceQuery } = setup({ projectParam: undefined });

    expect(onOpen).not.toHaveBeenCalled();
    expect(replaceQuery).not.toHaveBeenCalled();
  });

  it("should_wait_while_data_is_loading", () => {
    const { onOpen, replaceQuery } = setup({ isLoading: true });

    expect(onOpen).not.toHaveBeenCalled();
    expect(replaceQuery).not.toHaveBeenCalled();
  });

  it("should_narrow_by_search_when_project_is_not_in_current_rows", () => {
    const { onOpen, replaceQuery } = setup({ projectParam: "elsewhere" });

    expect(onOpen).not.toHaveBeenCalled();
    expect(replaceQuery).toHaveBeenCalledWith({ search: "elsewhere", page: "1" });
  });

  it("should_clean_url_when_already_searched_and_still_not_found", () => {
    const { onOpen, replaceQuery } = setup({ projectParam: "elsewhere", searchQuery: "elsewhere" });

    expect(onOpen).not.toHaveBeenCalled();
    expect(replaceQuery).toHaveBeenCalledWith({ project: null, grant: null, search: null });
  });

  it("should_keep_an_unrelated_search_query_when_opening", () => {
    const { replaceQuery } = setup({ searchQuery: "other" });

    expect(replaceQuery).toHaveBeenCalledWith({ project: null, grant: null, search: "other" });
  });

  it("should_open_only_once_for_the_same_project_param", () => {
    const { rerender, onOpen, params } = setup();

    rerender({ ...params, rows: [...rows] });

    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
