export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  facilityId: string | null;
}

export interface User {
  id: string;
  userName: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  roles: string[];
  facilityId: string | null;
  facilityName?: string;
  emailConfirmed: boolean;
  lockoutEnabled: boolean;
  isActive: boolean;
}

export interface Facility {
  id: string;
  name: string;
  address: string;
  timeZoneId: string;
}

export interface Donor {
  id: string;
  fullName: string;
  nationalId: string;
  dateOfBirth: string;
  bloodGroup: string;
  gender?: string;
  contactNumber: string;
  email?: string;
  address?: string;
  isEligible: boolean;
  nextEligibleDateUtc?: string;
  notes?: string;
}

export interface Deferral {
  id: string;
  donorId: string;
  type: 'Temporary' | 'Permanent';
  reason: string;
  startDateUtc: string;
  endDateUtc?: string;
  createdByUserId: string;
}

export type UnitStatus = 'Collected' | 'Testing' | 'Available' | 'Expired' | 'Quarantined' | 'Discarded' | 'Reserved' | 'Transfused';

export interface BloodUnit {
  id: string;
  unitId: string;
  donorId: string;
  facilityId: string;
  bloodGroup: string;
  status: UnitStatus;
  collectionDateUtc: string;
  ttiScreened: boolean;
  ttiReactive: boolean;
  ttiResultsJson?: string;
  aboConfirmed: boolean;
}
