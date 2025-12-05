"use client";

import React, { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { SingleProjectDonateModal } from "./SingleProjectDonateModal";
import type { DonateButtonProps } from "./types";

export const DonateButton = React.memo<DonateButtonProps>(
  ({ projectId, projectTitle, payoutAddress, chainID, className }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleOpenModal = useCallback(() => {
      setIsModalOpen(true);
    }, []);

    const handleCloseModal = useCallback(() => {
      setIsModalOpen(false);
    }, []);

    return (
      <>
        <Button onClick={handleOpenModal} className={className}>
          Donate
        </Button>
        <SingleProjectDonateModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          project={{
            uid: projectId,
            title: projectTitle,
            payoutAddress,
            chainID,
          }}
        />
      </>
    );
  }
);

DonateButton.displayName = "DonateButton";
