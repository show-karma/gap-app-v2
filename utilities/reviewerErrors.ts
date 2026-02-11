import axios from "axios";

export function getReviewerErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 409) {
      return "A reviewer with this email already exists.";
    }
    return error.response?.data?.message || error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}
