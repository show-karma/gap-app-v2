import { FC, useEffect, useState } from "react";
import { VerifyImpactDialog } from "./VerifyImpactDialog";
import {
  IProjectImpact,
  IProjectImpactStatus,
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { VerifiedBadge } from "@/features/grants/components/milestones/VerifiedBadge";

interface ImpactVerificationsProps {
  impact: IProjectImpact;
}

export const ImpactVerifications: FC<ImpactVerificationsProps> = ({
  impact,
}) => {
  const [verifieds, setVerifieds] = useState(impact.verified);

  useEffect(() => {
    setVerifieds(impact.verified);
  }, [impact.verified]);

  const addVerification = (newVerified: IProjectImpactStatus) => {
    setVerifieds([...verifieds, newVerified]);
  };

  return (
    <div className="flex flex-row gap-3 items-center justify-start ml-3 min-w-max max-w-full">
      {verifieds.length ? (
        <div className="w-max max-w-full">
          <VerifiedBadge verifications={verifieds} title="Reviews" />
        </div>
      ) : null}
      <VerifyImpactDialog impact={impact} addVerification={addVerification} />
    </div>
  );
};
