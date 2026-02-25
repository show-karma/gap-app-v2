"use client";

import { Button } from "@/components/ui/button";
import { SOCIALS } from "@/utilities/socials";

export function JoinDiscordButton() {
  return (
    <Button variant="outline" asChild>
      <a href={SOCIALS.DISCORD} target="_blank" rel="noopener noreferrer">
        Join Discord
      </a>
    </Button>
  );
}
