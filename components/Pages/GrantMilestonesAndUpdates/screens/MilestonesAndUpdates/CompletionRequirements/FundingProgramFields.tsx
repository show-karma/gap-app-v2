"use client";
import React from "react";

const labelStyle = "text-sm font-bold text-black dark:text-zinc-100";

interface FundingProgramFieldsProps {
  pitchDeckLink: string;
  demoVideoLink: string;
  onPitchDeckChange: (value: string) => void;
  onDemoVideoChange: (value: string) => void;
  errors?: {
    pitchDeckLink?: boolean;
    demoVideoLink?: boolean;
  };
}

export const FundingProgramFields: React.FC<FundingProgramFieldsProps> = ({
  pitchDeckLink,
  demoVideoLink,
  onPitchDeckChange,
  onDemoVideoChange,
  errors = {},
}) => {
  const getInputStyle = (hasError: boolean) => {
    const baseStyle = "w-full px-3 py-2 bg-white dark:bg-zinc-900 rounded-md focus:outline-none focus:ring-2 dark:text-zinc-100";
    const borderStyle = hasError 
      ? "border-2 border-red-500 focus:ring-red-500" 
      : "border border-gray-300 dark:border-zinc-700 focus:ring-blue-500";
    return `${baseStyle} ${borderStyle}`;
  };
  return (
    <>
      <div className="flex w-full flex-col gap-2">
        <label htmlFor="pitch-deck-link" className={labelStyle}>
          Pitch Deck Link <span className="text-red-500">*</span>
        </label>
        <input
          id="pitch-deck-link"
          type="url"
          value={pitchDeckLink}
          onChange={(e) => {
            onPitchDeckChange(e.target.value);
          }}
          placeholder="https://example.com/pitch-deck"
          className={getInputStyle(!!errors.pitchDeckLink)}
          required
        />
        {errors.pitchDeckLink && (
          <p className="text-xs text-red-500">Pitch deck link is required</p>
        )}
      </div>

      <div className="flex w-full flex-col gap-2">
        <label htmlFor="demo-video-link" className={labelStyle}>
          Demo Video Link <span className="text-red-500">*</span>
        </label>
        <input
          id="demo-video-link"
          type="url"
          value={demoVideoLink}
          onChange={(e) => {
            onDemoVideoChange(e.target.value);
          }}
          placeholder="https://example.com/demo-video"
          className={getInputStyle(!!errors.demoVideoLink)}
          required
        />
        {errors.demoVideoLink && (
          <p className="text-xs text-red-500">Demo video link is required</p>
        )}
      </div>
    </>
  );
};