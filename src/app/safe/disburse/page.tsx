"use client";

import { DisbursementForm } from "@/features/disbursements/components/DisbursementForm";
import React from "react";

const DisbursePage = () => {
  return (
    <div className="mx-auto max-w-4xl py-8">
      <div className="mt-8">
        <DisbursementForm />
      </div>
    </div>
  );
};

export default DisbursePage;
