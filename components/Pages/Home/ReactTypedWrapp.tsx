"use client";
import { ReactTyped } from "react-typed";

export const ReactTypedWrapper = () => {
  const phrases = [
    "Open Source",
    "Public Goods",
    "Community Funded",
    "Crypto protocol",
  ];
  return (
    <ReactTyped
      strings={phrases}
      typeSpeed={100}
      className="w-max bg-[#EAECF5] p-4 text-center text-6xl font-normal leading-[120px] dark:text-gray-100 dark:bg-gray-800 text-gray-900 max-2xl:text-4xl max-2xl:leading-[80px] max-lg:text-3xl max-lg:leading-[80px]"
      loop
      backSpeed={50}
    />
  );
};
