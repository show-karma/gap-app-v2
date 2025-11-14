"use client"

import React from "react"
import { DisbursementForm } from "../../../components/Disbursement/DisbursementForm"

const DisbursePage = () => {
  return (
    <div className="mx-auto max-w-4xl py-8">
      <div className="mt-8">
        <DisbursementForm />
      </div>
    </div>
  )
}

export default DisbursePage
