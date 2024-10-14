"use client";
import Link from "next/link";
import { AddExternalId } from "./AddExternalIdDialog";
import { useEffect } from "react";

export default function ExternalIds() {
  // Mock data
  const externalIds = [
    {
      id: "0x706bc44d0c033d10c977ac4a6193e7838b8a795ea0d62cdb8eb0aedb5feaa70c",
    },
  ];

  const handleRemove = (id: string) => {
    console.log(`Remove external ID: ${id}`);
    // Implement removal logic here
  };

  async function fetchApplicationsByProjectId(projectId: string) {
    const url = "https://grants-stack-indexer-v2.gitcoin.co/graphql";

    const payload = {
      query: `
      query MyQuery {
        applications(condition: {projectId: "${projectId}"}) {
          chainId
          roundId
          id
        }
      }
    `,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    const chainId = data.data.applications[0].chainId;
    const roundId = data.data.applications[0].roundId;
    const applicationId = data.data.applications[0].id;

    // Convert it into URL
    const gitcoinUrl = `https://explorer.gitcoin.co/#/round/${chainId}/${roundId}/${applicationId}`;
    return gitcoinUrl;
  }

  useEffect(() => {
    fetchApplicationsByProjectId(
      "0x706bc44d0c033d10c977ac4a6193e7838b8a795ea0d62cdb8eb0aedb5feaa70c"
    );
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">External IDs</h1>
        <AddExternalId />
      </div>
      <table className="border-x border-x-zinc-300 border-y border-y-zinc-300 w-full">
        <thead className="border-x border-x-zinc-300 border-y border-y-zinc-300">
          <tr className="divide-x">
            <th className="px-4 py-2">External ID</th>
            <th className="px-4 py-2">Gitcoin Profile</th>
            <th className="px-4 py-2">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-x">
          {externalIds.map(async (externalId) => (
            <tr key={externalId.id} className="divide-x">
              <td className="px-4 py-2 text-center">{externalId.id}</td>
              <td className="px-4 py-2 text-center">
                <Link
                  href={await fetchApplicationsByProjectId(externalId.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  {await fetchApplicationsByProjectId(externalId.id)}
                </Link>
              </td>
              <td className="px-4 py-2 text-center">
                <button
                  onClick={() => handleRemove(externalId.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
