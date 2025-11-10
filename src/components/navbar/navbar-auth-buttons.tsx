"use client";

import { Button } from "@/components/UI/button";
import { PhoneCall } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { NavbarAuthButtonsSkeleton } from "./navbar-user-skeleton";
import { SOCIALS } from "@/utilities/socials";
import { ExternalLink } from "@/components/Utilities/ExternalLink";

export function NavbarAuthButtons() {
    const { authenticate: login, ready } = useAuth();

    if (!ready) {
        return <NavbarAuthButtonsSkeleton />;
    }

    return (
        <div className="flex items-center gap-3">
            <Button
                variant="outline"
                className="bg-secondary border-none rounded px-3 py-1 text-sm font-medium text-secondary-foreground hover:text-muted-foreground transition-colors"
                onClick={login}
            >
                Sign in
            </Button>
            <Button
                variant="outline"
                size="sm"
                className="border-border text-foreground hover:bg-accent shadow-sm"
                asChild
            >
                <ExternalLink href={SOCIALS.PARTNER_FORM}>
                    <PhoneCall className="w-4 h-4" />
                    Contact sales
                </ExternalLink>
            </Button>
        </div>
    );
}

