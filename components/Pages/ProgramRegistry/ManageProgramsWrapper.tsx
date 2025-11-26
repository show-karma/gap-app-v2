"use client";
/* eslint-disable @next/next/no-img-element */
import dynamic from "next/dynamic";
import { LoadingManagePrograms } from "@/components/Pages/ProgramRegistry/Loading/ManagePrograms";

const ManagePrograms = dynamic(
  () =>
    import("@/components/Pages/ProgramRegistry/ManagePrograms").then((mod) => mod.ManagePrograms),
  {
    loading: () => <LoadingManagePrograms />,
  }
);

const ManageProgramsWrapper = () => {
  return <ManagePrograms />;
};

export default ManageProgramsWrapper;
