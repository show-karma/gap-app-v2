"use client";

import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ApplicationLookupFormProps {
  onSubmit: (referenceNumber: string) => void;
  isLoading: boolean;
}

export function ApplicationLookupForm({ onSubmit, isLoading }: ApplicationLookupFormProps) {
  const [referenceNumber, setReferenceNumber] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (referenceNumber.trim()) {
      onSubmit(referenceNumber.trim().toUpperCase());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="reference-number">Application Reference Number</Label>
        <Input
          id="reference-number"
          type="text"
          placeholder="APP-XXXXXXXX-XXXXXX"
          value={referenceNumber}
          onChange={(e) => setReferenceNumber(e.target.value)}
          required
          className="font-mono uppercase"
          autoFocus
        />
        <p className="text-xs text-muted-foreground">
          Enter the reference number you received when you submitted your application
        </p>
      </div>

      <Button type="submit" className="w-full" disabled={!referenceNumber.trim() || isLoading}>
        {isLoading ? "Looking up..." : "Find Application"}
      </Button>
    </form>
  );
}
