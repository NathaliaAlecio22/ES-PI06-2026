
export type OrganizationUserRole =
  | "ADMIN"
  | "OPERATOR"
  | "VIEWER";

export type OrganizationUserStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "PENDING"
  | "EXPIRED";

export interface OrganizationUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  department: string;
  role: OrganizationUserRole;
  status: OrganizationUserStatus;
  createdAt: string | null;
  canManage?: boolean;
}
