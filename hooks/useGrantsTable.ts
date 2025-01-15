import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { SimplifiedGrant } from "./useGrants";

type SortField = "project" | "grant" | "description" | "categories";
type SortDirection = "asc" | "desc";

interface UseGrantsTableProps {
  grants: SimplifiedGrant[];
  itemsPerPage?: number;
}

export const useGrantsTable = ({
  grants,
  itemsPerPage = 12,
}: UseGrantsTableProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get values from URL or use defaults
  const currentPage = Number(searchParams.get("page")) || 1;
  const selectedProgram = searchParams.get("program");
  const sortField = searchParams.get("sortField") as SortField | null;
  const sortDirection = searchParams.get(
    "sortDirection"
  ) as SortDirection | null;

  // Create URLSearchParams instance for manipulation
  const createQueryString = useCallback(
    (params: Record<string, string | null>) => {
      const newSearchParams = new URLSearchParams(searchParams.toString());

      // Update or remove each parameter
      Object.entries(params).forEach(([key, value]) => {
        if (value === null) {
          newSearchParams.delete(key);
        } else {
          newSearchParams.set(key, value);
        }
      });

      return newSearchParams.toString();
    },
    [searchParams]
  );

  const uniquePrograms = useMemo(() => {
    const programs = Array.from(new Set(grants.map((grant) => grant.grant)));
    return programs.sort((a, b) => a.localeCompare(b));
  }, [grants]);

  const filteredAndSortedGrants = useMemo(() => {
    let processed = [...grants];

    // Apply program filter
    if (selectedProgram) {
      processed = processed.filter((grant) => grant.grant === selectedProgram);
    }

    // Apply sorting
    if (sortField && sortDirection) {
      processed.sort((a, b) => {
        const aValue =
          sortField === "categories"
            ? a.categories.join(", ")
            : (a[sortField as keyof SimplifiedGrant] as string);
        const bValue =
          sortField === "categories"
            ? b.categories.join(", ")
            : (b[sortField as keyof SimplifiedGrant] as string);

        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      });
    }

    return processed;
  }, [grants, selectedProgram, sortField, sortDirection]);

  const paginatedGrants = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAndSortedGrants.slice(startIndex, endIndex);
  }, [filteredAndSortedGrants, currentPage, itemsPerPage]);

  const handlePageChange = (page: number) => {
    const query = createQueryString({ page: page.toString() });
    router.push(`${pathname}?${query}`);
  };

  const handleProgramChange = (program: string | null) => {
    const query = createQueryString({
      program: program,
      page: "1", // Reset to first page when changing program
    });
    router.push(`${pathname}?${query}`);
  };

  const handleSortChange = (field: SortField) => {
    const newDirection =
      field === sortField && sortDirection === "asc" ? "desc" : "asc";

    const query = createQueryString({
      sortField: field,
      sortDirection: newDirection,
      page: "1", // Reset to first page when changing sort
    });
    router.push(`${pathname}?${query}`);
  };

  return {
    currentPage,
    totalItems: filteredAndSortedGrants.length,
    paginatedGrants,
    uniquePrograms,
    selectedProgram,
    sort: {
      field: sortField || undefined,
      direction: sortDirection || undefined,
    },
    handlePageChange,
    handleProgramChange,
    handleSortChange,
  };
};
