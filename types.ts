
export enum UserRole {
  ADMIN = 'ADMIN',
  AGENT = 'AGENT',
  TENANT = 'TENANT'
}

export enum PropertyStatus {
  DRAFT = 'DRAFT',
  LISTED = 'LISTED',
  OCCUPIED = 'OCCUPIED',
  VACANT = 'VACANT',
  ARCHIVED = 'ARCHIVED'
}

export enum PropertyCategory {
  RESIDENTIAL = 'Residential',
  COMMERCIAL = 'Commercial'
}

export type PropertyType = 
  | 'Single Room' | 'Self-contained' | 'Mini Flat (1 Bedroom)' 
  | '2 Bedroom flat' | '3 Bedroom Flat' | '4 Bedroom Flat' 
  | 'Terrace' | 'Semi-detached Duplex' | 'Fully Detached Duplex' 
  | 'Penthouse' | 'Studio Appartment' | 'Serviced Appartment' 
  | 'Shop' | 'Plaza Shop' | 'Office Space' | 'Co-working Space' 
  | 'Factory' | 'Warehouse' | 'land';

export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED'
}

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  EMERGENCY = 'EMERGENCY'
}

export enum NotificationType {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  SUCCESS = 'SUCCESS'
}

export enum ApplicationStatus {
  PENDING = 'PENDING',
  REVIEWING = 'REVIEWING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  MORE_INFO_REQUIRED = 'MORE_INFO_REQUIRED'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  assignedPropertyIds?: string[];
  phone?: string;
  profilePictureUrl?: string;
  walletBalance?: number;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: 'debit' | 'credit';
  purpose: string;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
}

export interface Property {
  id: string;
  name: string;
  location: string;
  rent: number;
  status: PropertyStatus;
  agentId: string;
  tenantId?: string;
  description?: string;
  category: PropertyCategory;
  type: PropertyType;
  rentStartDate?: string;
  rentExpiryDate?: string;
  images?: string[];
}

export type FieldType = 'text' | 'number' | 'date' | 'select' | 'textarea' | 'file' | 'email' | 'tel';

export interface FormField {
  id: string;
  key: string; // Map to TenantApplication properties (e.g., 'firstName') or custom IDs
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[]; // For select inputs
  placeholder?: string;
}

export interface FormSection {
  id: string;
  title: string;
  icon: string; // Lucide icon name
  fields: FormField[];
}

export interface FormTemplate {
  agentId: string;
  sections: FormSection[];
  lastUpdated: string;
}

export interface TenantApplication {
  id: string;
  userId: string;
  propertyId: string;
  agentId: string;
  status: ApplicationStatus;
  submissionDate: string;
  
  // Core Fields (Mapped from Dynamic Form)
  firstName: string;
  surname: string;
  middleName: string;
  dob: string;
  maritalStatus: string;
  gender: string;
  currentHomeAddress: string;
  occupation: string;
  familySize: number;
  phoneNumber: string;
  reasonForRelocating: string;
  currentLandlordName: string;
  currentLandlordPhone: string;
  verificationType: string;
  verificationIdNumber: string;
  verificationUrl?: string;
  passportPhotoUrl?: string;
  agentIdCode: string;
  signature: string;
  applicationDate: string;
  
  // Custom Dynamic Data
  customResponses?: Record<string, any>; // Key: Field ID, Value: User Input

  riskScore: number;
  aiRecommendation: string;
}

export interface Agreement {
  id: string;
  propertyId: string;
  tenantId: string;
  version: number;
  startDate: string;
  endDate: string;
  documentUrl?: string;
  status: 'active' | 'expired' | 'terminated';
}

export interface Payment {
  id: string;
  tenantId: string;
  propertyId: string;
  amount: number;
  date: string;
  status: 'paid' | 'pending' | 'late';
}

export interface MaintenanceTicket {
  id: string;
  tenantId: string;
  propertyId: string;
  issue: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  aiAssessment?: string;
  imageUrl?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  timestamp: string;
  isRead: boolean;
  linkTo?: string;
  attachmentUrl?: string;
}
