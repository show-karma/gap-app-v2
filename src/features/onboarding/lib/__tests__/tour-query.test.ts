import { beforeEach, describe, expect, it } from "vitest";
import { isKnownTourId, stripTourParam, TOUR_QUERY_PARAM, withTourParam } from "../tour-query";
import { TOUR_IDS } from "../tours";

beforeEach(() => {
  window.history.replaceState({}, "", "/dashboard");
});

describe("withTourParam", () => {
  it("appends the request to a bare path", () => {
    expect(withTourParam("/nonprofits/find-funders", TOUR_IDS.findFunders)).toBe(
      `/nonprofits/find-funders?${TOUR_QUERY_PARAM}=find-funders`
    );
  });

  it("preserves an existing query string", () => {
    expect(withTourParam("/my-projects?page=2", TOUR_IDS.projectWorkspace)).toBe(
      `/my-projects?page=2&${TOUR_QUERY_PARAM}=project-workspace`
    );
  });
});

describe("isKnownTourId", () => {
  it("accepts a registered tour", () => {
    expect(isKnownTourId(TOUR_IDS.reviewerInbox)).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isKnownTourId("../../etc/passwd")).toBe(false);
    expect(isKnownTourId(null)).toBe(false);
    expect(isKnownTourId(undefined)).toBe(false);
  });
});

describe("stripTourParam", () => {
  it("removes the parameter without touching the rest of the URL", () => {
    window.history.replaceState(
      {},
      "",
      `/my-projects?page=2&${TOUR_QUERY_PARAM}=project-workspace`
    );

    stripTourParam();

    expect(window.location.search).toBe("?page=2");
  });

  it("leaves a URL that never carried the parameter alone", () => {
    window.history.replaceState({}, "", "/my-projects?page=2");

    stripTourParam();

    expect(window.location.search).toBe("?page=2");
  });
});
