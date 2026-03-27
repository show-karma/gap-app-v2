import { HttpResponse, http } from "msw";
import { BASE } from "./base-url";

export interface AuthPermissions {
  isAdmin: boolean;
  isCommunityAdmin: boolean;
  isProgramManager: boolean;
  isReviewer: boolean;
  permissions: string[];
}

const defaultPermissions: AuthPermissions = {
  isAdmin: false,
  isCommunityAdmin: false,
  isProgramManager: false,
  isReviewer: false,
  permissions: [],
};

export function authHandlers(options?: { permissions?: Partial<AuthPermissions> }) {
  const permissions = { ...defaultPermissions, ...options?.permissions };

  return [
    http.get(`${BASE}/v2/auth/permissions`, () => HttpResponse.json(permissions)),

    http.get(`${BASE}/v2/user/permissions`, () =>
      HttpResponse.json({ permissions: permissions.permissions })
    ),

    http.get(`${BASE}/v2/user/communities/admin`, () => HttpResponse.json([])),

    http.get(`${BASE}/v2/user/projects`, () =>
      HttpResponse.json({
        payload: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      })
    ),
  ];
}

export function authErrorHandlers() {
  return [
    http.get(`${BASE}/v2/auth/permissions`, () =>
      HttpResponse.json({ error: "Unauthorized" }, { status: 401 })
    ),

    http.get(`${BASE}/v2/user/permissions`, () =>
      HttpResponse.json({ error: "Unauthorized" }, { status: 401 })
    ),
  ];
}
