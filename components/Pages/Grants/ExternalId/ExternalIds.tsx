"use client";
import Link from "next/link";
import { AddExternalId } from "./AddExternalIdDialog";

export default function ExternalIds() {
  // Mock data
  const externalIds = [
    {
      id: "0x706bc44d0c033d10c977ac4a6193e7838b8a795ea0d62cdb8eb0aedb5feaa70c",
      gitcoinProfile: "https://explorer.gitcoin.co/#/round/42161/385/24",
    },
    {
      id: "0x706bc44d0c033d10c977ac4a6193e7838b8a795ea0d62cdb8eb0aedb5feaa70c",
      gitcoinProfile: "https://explorer.gitcoin.co/#/round/42161/385/24",
    },
    {
      id: "0x706bc44d0c033d10c977ac4a6193e7838b8a795ea0d62cdb8eb0aedb5feaa70c",
      gitcoinProfile: "https://explorer.gitcoin.co/#/round/42161/385/24",
    },
  ];

  const handleRemove = (id: string) => {
    console.log(`Remove external ID: ${id}`);
    // Implement removal logic here
  };

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
          {externalIds.map((externalId) => (
            <tr key={externalId.id} className="divide-x">
              <td className="px-4 py-2 text-center">{externalId.id}</td>
              <td className="px-4 py-2 text-center">
                <Link
                  href={`https://gitcoin.co/${externalId.gitcoinProfile}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  {externalId.gitcoinProfile}
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
