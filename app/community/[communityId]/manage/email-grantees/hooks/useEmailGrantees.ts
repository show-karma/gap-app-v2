import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { errorManager } from "@/components/Utilities/errorManager";
import {
  getGranteeEmails,
  type SendEmailParams,
  sendEmailToGrantees,
} from "../services/emailGranteesService";

export function useGranteeEmails(programId: string) {
  return useQuery({
    queryKey: ["grantee-emails", programId],
    queryFn: () => getGranteeEmails(programId),
    enabled: !!programId,
  });
}

export function useSendEmailToGrantees() {
  return useMutation({
    mutationFn: (params: SendEmailParams) => sendEmailToGrantees(params),
    onSuccess: (data) => {
      if (data.success) {
        toast.success(
          `Email sent successfully to ${data.sentCount} recipient${data.sentCount === 1 ? "" : "s"}`
        );
      } else {
        toast.error(
          `Sent to ${data.sentCount} recipient${data.sentCount === 1 ? "" : "s"}, ${data.failedCount} failed`
        );
      }
    },
    onError: (error: Error) => {
      errorManager("Failed to send email to grantees", error);
      toast.error(error.message || "Failed to send email");
    },
  });
}
