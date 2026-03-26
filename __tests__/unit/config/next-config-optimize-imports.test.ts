import * as fs from "node:fs";
import * as path from "node:path";

describe("next.config.ts optimizePackageImports", () => {
  const configPath = path.resolve(__dirname, "../../../next.config.ts");
  let configContent: string;

  beforeAll(() => {
    configContent = fs.readFileSync(configPath, "utf-8");
  });

  it("should have experimental.optimizePackageImports configured", () => {
    expect(configContent).toContain("optimizePackageImports");
  });

  const expectedPackages = [
    "@tremor/react",
    "lucide-react",
    "@radix-ui/react-icons",
    "@radix-ui/react-dialog",
    "@radix-ui/react-dropdown-menu",
    "@radix-ui/react-popover",
    "@radix-ui/react-select",
    "@radix-ui/react-tabs",
    "@radix-ui/react-tooltip",
    "react-hot-toast",
    "@heroicons/react",
    "date-fns",
  ];

  it.each(expectedPackages)("should include %s in optimizePackageImports", (pkg) => {
    expect(configContent).toContain(`"${pkg}"`);
  });
});
