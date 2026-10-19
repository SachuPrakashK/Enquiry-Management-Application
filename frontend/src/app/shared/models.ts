export interface Entity {
  id: string;
  createdAt: string;
  updatedAt: string;
}
export interface Category extends Entity {
  name: string;
  code: string;
  description: string;
  isActive: boolean;
}
export interface EnquiryStatus extends Category {
  color: string;
}
export type Master = Category | EnquiryStatus;
export type MasterKind = 'statuses' | 'categories';
export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type AdminRole = 'Super Admin' | 'Admin';
export interface AdminUser extends Entity {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  role: AdminRole;
  isActive: boolean;
  profileImage?: string;
}
export interface AuthSession {
  userId: string;
  role: AdminRole;
  token: string;
  expiresAt: number;
}
export interface Enquiry extends Entity {
  referenceNumber: string;
  customerName: string;
  email: string;
  phone: string;
  companyName: string;
  categoryId: string;
  subject: string;
  message: string;
  priority: Priority;
  statusId: string;
  preferredContactMethod: string;
  source: string;
  nextFollowUpDate: string;
  notes: string;
}
export interface FollowUp extends Entity {
  enquiryId: string;
  followUpDate: string;
  followUpType: string;
  notes: string;
  outcome: string;
  nextFollowUpDate: string;
}
export interface EnquiryOptions {
  priorities: Priority[];
  contactMethods: string[];
  sources: string[];
  followUpTypes: string[];
}
export type CreateDto<T extends Entity> = Omit<T, keyof Entity | 'referenceNumber'>;
export interface EnquiryFilters {
  statusId: string;
  categoryId: string;
  priority: string;
  source: string;
  from: string;
  to: string;
  followUp: string;
  customer: string;
}
