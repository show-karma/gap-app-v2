import { HttpResponse, http } from "msw";
import { BASE } from "./base-url";

export interface MockComment {
  id: string;
  applicationId: string;
  content: string;
  authorName: string;
  authorAddress: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
}

const defaultComment: MockComment = {
  id: "comment-001",
  applicationId: "app-uid-001",
  content: "This proposal has strong alignment with our program goals.",
  authorName: "Reviewer Alice",
  authorAddress: "0x1234567890abcdef1234567890abcdef12345678",
  createdAt: "2024-06-16T09:00:00.000Z",
  updatedAt: "2024-06-16T09:00:00.000Z",
  isDeleted: false,
};

export function commentHandlers(options?: { comments?: MockComment[] }) {
  const comments = options?.comments ?? [defaultComment];

  return [
    http.get(`${BASE}/v2/applications/:applicationId/comments`, () =>
      HttpResponse.json({
        comments,
        meta: { total: comments.length },
      })
    ),

    http.post(`${BASE}/v2/applications/:applicationId/comments`, async ({ request, params }) => {
      const body = (await request.json()) as { content: string; authorName?: string };
      return HttpResponse.json(
        {
          comment: {
            id: "new-comment-001",
            applicationId: params.applicationId as string,
            content: body.content,
            authorName: body.authorName ?? "Anonymous",
            authorAddress: "0x1234567890abcdef1234567890abcdef12345678",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isDeleted: false,
          },
        },
        { status: 201 }
      );
    }),

    http.put(`${BASE}/v2/comments/:commentId`, async ({ request, params }) => {
      const body = (await request.json()) as { content: string };
      return HttpResponse.json({
        comment: {
          id: params.commentId as string,
          content: body.content,
          updatedAt: new Date().toISOString(),
        },
      });
    }),

    http.delete(`${BASE}/v2/comments/:commentId`, ({ params }) =>
      HttpResponse.json({ success: true, commentId: params.commentId })
    ),
  ];
}

export function commentErrorHandlers() {
  return [
    http.get(`${BASE}/v2/applications/:applicationId/comments`, () =>
      HttpResponse.json({ error: "Server error" }, { status: 500 })
    ),

    http.post(`${BASE}/v2/applications/:applicationId/comments`, () =>
      HttpResponse.json({ error: "Unauthorized" }, { status: 401 })
    ),
  ];
}
