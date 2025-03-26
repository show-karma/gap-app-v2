import fetchData from "@/utilities/fetchData";
import { useEffect, useState } from "react";

export const useStaff = () => {
  const [isStaff, setIsStaff] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const checkStaffAuthorization = async () => {
      try {
        setIsLoading(true);
        const [data] = await fetchData("/auth/staff/authorized");
        setIsStaff(data?.authorized ?? false);
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error("Failed to check staff authorization")
        );
      } finally {
        setIsLoading(false);
      }
    };

    checkStaffAuthorization();
  }, []);

  return { isStaff, isLoading, error };
};
