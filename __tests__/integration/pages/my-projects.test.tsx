import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, test } from "bun:test";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { withTestProviders } from "@/__tests__/utils/testProviders";
import Page from "@/app/my-projects/page";

// Mock is pre-registered in bun-setup.ts

describe("My Projects Page", () => {
  it("renders the MyProjects component", () => {
    render(withTestProviders(<Page />));
    const myProjectsComponent = screen.getByTestId("mock-my-projects");
    expect(myProjectsComponent).toBeInTheDocument();
    expect(myProjectsComponent).toHaveTextContent("Mocked MyProjects Component");
  });

  //   check if the page is fetching data from the indexer
  // it("fetches data from the indexer", async () => {
  //   const { result } = renderHook(
  //     () =>
  //       useQuery({
  //         queryKey: ["totalProjects"],
  //         queryFn: () => fetchMyProjects(TEST.WALLET_ADDRESS as `0x${string}`),
  //         enabled: Boolean(TEST.WALLET_ADDRESS),
  //       }),
  //     { wrapper: createWrapper() }
  //   );

  //   console.log();

  //   await waitFor(() => expect(result.current.isSuccess).toBe(true));
  // });
});
