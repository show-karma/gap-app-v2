"use client";

import { Input } from "../ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function Newsletter() {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Unusable - does nothing as requested
  };

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-semibold text-base leading-6 text-foreground">
        Stay up to date
      </h2>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="email"
          placeholder="Enter email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg"
        />
        <Button type="submit" className="rounded-lg">
          Subscribe
        </Button>
      </form>
    </div>
  );
}

