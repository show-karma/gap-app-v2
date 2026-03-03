"use client";

import { AlertTriangle, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

interface AccessDeniedProps {
  title?: string;
  message?: string;
  returnUrl?: string;
}

export function AccessDenied({
  title = "Access Denied",
  message = "You don't have permission to view this page.",
  returnUrl = "/",
}: AccessDeniedProps) {
  const { authenticated, login } = useAuth();
  const router = useRouter();

  return (
    <div className="container py-16 flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-lg">
        <CardContent className="text-center py-12 px-8">
          <div className="mb-6 flex justify-center">
            <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-red-600 dark:text-red-400" />
            </div>
          </div>

          <h1 className="text-2xl font-bold mb-4">{title}</h1>
          <p className="text-muted-foreground mb-8">{message}</p>

          <Button
            type="button"
            onClick={() => {
              if (!authenticated) {
                login();
              } else {
                router.push(returnUrl);
              }
            }}
          >
            <LogIn className="w-4 h-4 mr-2" />
            {authenticated ? "Go to Home" : "Sign In"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
