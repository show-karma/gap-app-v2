"use client";

import { memo, useCallback, useState } from "react";
import { isAddress } from "viem";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { formatAddressForDisplay } from "@/utilities/donations/helpers";
import { cn } from "@/utilities/tailwind";

interface EmptyStateProps {
  connectedAddress: string;
  onCheckAddress: (address: `0x${string}`) => void;
  isChecking: boolean;
  compact?: boolean;
}

const truncateAddress = (address: string) => formatAddressForDisplay(address, 6, 4);

function EmptyStateComponent({
  connectedAddress,
  onCheckAddress,
  isChecking,
  compact = false,
}: EmptyStateProps) {
  const [inputAddress, setInputAddress] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleCheck = useCallback(() => {
    const trimmed = inputAddress.trim();

    if (!trimmed) {
      setValidationError("Please enter a wallet address");
      return;
    }

    if (!isAddress(trimmed)) {
      setValidationError("Please enter a valid Ethereum address");
      return;
    }

    if (trimmed.toLowerCase() === connectedAddress.toLowerCase()) {
      setValidationError("This is your connected wallet address");
      return;
    }

    setValidationError(null);
    onCheckAddress(trimmed as `0x${string}`);
  }, [inputAddress, connectedAddress, onCheckAddress]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputAddress(e.target.value);
    setValidationError(null);
  }, []);

  return (
    <Card className={cn(compact ? "max-w-md mx-auto" : "max-w-2xl mx-auto")}>
      <CardContent className={cn(compact ? "py-4 px-4" : "py-8 px-6")}>
        {!compact && (
          <>
            <div className="text-center mb-6">
              <p className="text-muted-foreground mb-2">
                No claimable funds found for this wallet:
              </p>
              <p className="font-mono text-sm text-muted-foreground">
                {truncateAddress(connectedAddress)}
              </p>
            </div>
            <Separator className="my-6" />
          </>
        )}
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">Check a different address</p>
          <div>
            <Input
              placeholder="Enter wallet address (0x...)"
              value={inputAddress}
              onChange={handleInputChange}
              className={cn("font-mono text-sm", validationError && "border-destructive")}
              disabled={isChecking}
            />
            {validationError && <p className="text-sm text-destructive mt-1">{validationError}</p>}
          </div>
          <Button
            className="w-full font-semibold"
            onClick={handleCheck}
            disabled={isChecking || !inputAddress.trim()}
          >
            {isChecking ? "Checking..." : "Check"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export const EmptyState = memo(EmptyStateComponent);
