"use client";

import { Button } from "@/components/ui/button";
import { SOCIALS } from "@/utilities/socials";

export function JoinDiscordButton() {
  return (
    <a href={SOCIALS.DISCORD} target="_blank" rel="noopener noreferrer">
      <Button variant="outline">Join Discord</Button>
    </a>
  );
}
