"use client";
import { useEffect, useState } from "react";
import { Community } from "@show-karma/karma-gap-sdk";
import { useGap } from "@/hooks";

export default function CommunityStats() {
  const [allCommunities, setAllCommunities] = useState<Community[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  const { gap } = useGap();

  const fetchCommunities = async () => {
    try {
      if (!gap) throw new Error("Gap not initialized");
      setIsLoading(true);
      const result = await gap.fetch.communities();
      result.sort((a, b) =>
        (a.details?.name || a.uid).localeCompare(b.details?.name || b.uid)
      );
      setAllCommunities(result);
      return result;
    } catch (error) {
      console.log(error);
      setAllCommunities([]);
      return undefined;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunities();
  }, []);

  return (
    <div>
      <h1>Admin Communities Stats Page</h1>
    </div>
  );
}
