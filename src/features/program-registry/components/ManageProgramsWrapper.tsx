"use client";
/* eslint-disable @next/next/no-img-element */
import dynamic from "next/dynamic";
import { LoadingManagePrograms } from "./Loading/ManagePrograms";

const ManagePrograms = dynamic(
  () =>
    import("@/features/program-registry/components/ManagePrograms").then(
      (mod) => mod.ManagePrograms
    ),
  {
    loading: () => <LoadingManagePrograms />,
  }
);

const ManageProgramsWrapper = () => {
  return <ManagePrograms />;
};

export default ManageProgramsWrapper;
