// Admin feature types

export interface AdminUser {
  address: string;
  name?: string;
  email?: string;
  role: 'super_admin' | 'community_admin';
}

export interface AdminPermissions {
  canManageCategories: boolean;
  canManageIndicators: boolean;
  canManagePrograms: boolean;
  canManagePayouts: boolean;
  canViewAllProjects: boolean;
  canManageAdmins: boolean;
}

// Re-export any admin-related types from other files as needed