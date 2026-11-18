
export type OrganizationUserRole =
  | "ADMIN"
  | "OPERATOR"
  | "VIEWER";

export type OrganizationUserStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "PENDING";

export interface OrganizationUser {
  id: string;
  name: string;
  email: string;
  department: string;
  role: OrganizationUserRole;
  status: OrganizationUserStatus;
  createdAt: string;
}
