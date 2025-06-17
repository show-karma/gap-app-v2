"use client";
import { NavigationLoader } from "./NavigationLoader";

interface ClientLayoutWrapperProps {
  children: React.ReactNode;
}

export const ClientLayoutWrapper = ({ children }: ClientLayoutWrapperProps) => {
  return (
    <>
      <NavigationLoader />
      {children}
    </>
  );
}; 