"use client";

import { Calendar, CheckCircle, Clock, Eye, FileQuestion, XCircle } from "lucide-react";
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/utilities/formatDate";
import type { StatusHistoryItem } from "../types";

interface StatusChangeItemProps {
  status: StatusHistoryItem;
}

function getStatusIcon(status: string) {
  switch (status) {
    case "pending":
      return <Clock className="w-4 h-4" />;
    case "under_review":
      return <Eye className="w-4 h-4" />;
    case "revision_requested":
      return <FileQuestion className="w-4 h-4" />;
    case "approved":
      return <CheckCircle className="w-4 h-4" />;
    case "rejected":
      return <XCircle className="w-4 h-4" />;
    default:
      return <Clock className="w-4 h-4" />;
  }
}

function formatStatusLabel(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function StatusChangeItem({ status }: StatusChangeItemProps) {
  return (
    <Card className="rounded-none bg-gray-50 dark:bg-zinc-900/50 border-l-4 border-l-primary">
      <CardContent className="p-4">
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              {getStatusIcon(status.status)}
            </div>
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">{formatStatusLabel(status.status)}</Badge>
              <span className="text-xs text-muted-foreground">Status Changed</span>
            </div>

            {status.reason && (
              <p className="text-sm text-muted-foreground mb-2">{status.reason}</p>
            )}

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{formatDate(status.timestamp)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{formatDate(status.timestamp, "local", "h:mm a")}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
