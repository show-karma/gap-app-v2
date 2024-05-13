import { useState } from "react";

import { HypercertMetadata, TransferRestrictions } from "@hypercerts-org/sdk";
import hypercertsClient from "@/utilities/hypercerts/hypercerts";

function CreateHypercert() {
  const [metadata, setMetadata] = useState<HypercertMetadata>({
    name: "",
    description: "",
    image: "",
    version: "0.0.1",
    hypercert: {
      impact_scope: {
        name: "Impact Scope",
        value: ["all"],
        excludes: [],
        display_value: "all",
      },
      work_scope: {
        name: "Work Scope",
        value: ["Something will happen"],
        excludes: [],
        display_value: "Something will happen",
      },
      impact_timeframe: {
        name: "Impact Timeframe",
        value: [Date.now() / 1000, Date.now() / 1000],
        display_value: `${new Date().toLocaleDateString()}  ↔ ${new Date().toLocaleDateString()}`,
      },
      work_timeframe: {
        name: "Work Timeframe",
        value: [Date.now() / 1000, Date.now() / 1000],
        display_value: `${new Date().toLocaleDateString()}  ↔ ${new Date().toLocaleDateString()}`,
      },
      rights: {
        name: "Rights",
        value: ["Public Display"],
        excludes: [],
        display_value: "Public Display",
      },
      contributors: {
        name: "Contributors",
        value: [], // Assuming contributors will be added during minting
        display_value: "",
      },
    },
    properties: [],
    external_url: "",
  });
  const [totalUnits, setTotalUnits] = useState<any>(10000);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setMetadata({
      ...metadata,
      [event.target.name]: event.target.value,
    });
  };

  const handleMint = async () => {
    if (!metadata.name) {
      alert("Please enter a name for your hypercert.");
      return;
    }
    // Add other validation checks if needed

    try {
      const txHash = await hypercertsClient.mintClaim(
        metadata,
        totalUnits,
        TransferRestrictions.FromCreatorOnly
      );
      console.log("Hypercert minted successfully! Tx hash:", txHash);
      // Handle successful mint (e.g., show confirmation message)
    } catch (error) {
      console.error("Error minting hypercert:", error);
      // Handle minting error (e.g., show error message)
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">Create Hypercert</h1>
      <form className="flex flex-col space-y-2">
        <div className="flex flex-col">
          <label htmlFor="name" className="text-sm font-medium mb-1">
            Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            className={`rounded-md border border-gray-300 p-2bg-red-50`}
            onChange={handleChange}
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="description" className="text-sm font-medium mb-1">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            className="rounded-md border border-gray-300 p-2 h-24"
            onChange={handleChange}
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="image" className="text-sm font-medium mb-1">
            Image URL
          </label>
          <input
            type="text"
            id="image"
            name="image"
            className="rounded-md border border-gray-300 p-2"
            onChange={handleChange}
          />
        </div>
        <div className="flex flex-col">
          <label htmlFor="totalUnits" className="text-sm font-medium mb-1">
            Total Units
          </label>
          <input
            type="number"
            id="totalUnits"
            name="totalUnits"
            className="rounded-md border border-gray-300 p-2"
            value={totalUnits}
            onChange={(event) => setTotalUnits(parseInt(event.target.value))}
          />
        </div>
        <button
          type="button"
          className="bg-blue-500 text-white rounded-md p-2"
          onClick={handleMint}
        >
          Mint Hypercert
        </button>
      </form>
    </div>
  );
}
