// ═══════════════════════════════════════════════════════════════
// DIALBEE TYPES — src/types/index.ts
// ═══════════════════════════════════════════════════════════════

export type UserRole = 'super_admin' | 'admin' | 'sales_agent' | 'business_owner' | 'customer';
export type Tier     = 'free' | 'standard' | 'premium' | 'enterprise';
export type BizStatus = 'pending' | 'active' | 'suspended' | 'rejected';
export type LeadStatus = 'new' | 'distributed' | 'contacted' | 'converted' | 'lost' | 'spam';
export type LeadSource = 'form' | 'call' | 'whatsapp' | 'chat';

export interface User {
  id:           string;
  email:        string;
  phone?:       string;
  fullName:     string;
  role:         UserRole;
  avatarUrl?:   string;
  countryCode?: string;
  preferredLang: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt:    string;
}

export interface Country {
  id:             string;
  code:           string;
  name:           string;
  flagEmoji:      string;
  currencyCode:   string;
  currencySymbol: string;
  defaultLang:    string;
  cities:         City[];
}

export interface City {
  id:            string;
  name:          string;
  slug:          string;
  stateProvince?: string;
  isLaunched:    boolean;
}

export interface Category {
  id:          string;
  name:        string;
  nameFr?:     string;
  nameAr?:     string;
  slug:        string;
  iconEmoji?:  string;
  colorHex?:   string;
  leadCostUsd: number;
  businessCount: number;
}

export interface Business {
  id:                   string;
  name:                 string;
  slug:                 string;
  tagline?:             string;
  description?:         string;
  categoryId:           string;
  cityId:               string;
  countryId:            string;
  phonePrimary?:        string;
  phoneSecondary?:      string;
  whatsapp?:            string;
  email?:               string;
  website?:             string;
  addressLine1?:        string;
  neighborhood?:        string;
  locationLat?:         number;
  locationLng?:         number;
  logoUrl?:             string;
  coverUrl?:            string;
  avgRating:            number;
  totalReviews:         number;
  totalLeads:           number;
  responseRate:         number;
  profileCompleteness:  number;
  subscriptionTier:     Tier;
  status:               BizStatus;
  verificationStatus:   string;
  isActive:             boolean;
  isFeatured:           boolean;
  yearEstablished?:     number;
  createdAt:            string;
  // Joined
  categoryName?:        string;
  cityName?:            string;
  countryCode?:         string;
  distance?:            number;
}

export interface Lead {
  id:              string;
  customerName?:   string;
  customerPhone?:  string;
  customerEmail?:  string;
  customerMessage?: string;
  source:          LeadSource;
  urgency:         string;
  qualityScore:    number;
  status:          LeadStatus;
  searchQuery?:    string;
  createdAt:       string;
}

export interface LeadDistribution {
  distId:         string;
  leadId:         string;
  status:         LeadStatus;
  costCharged:    number;
  viewedAt?:      string;
  respondedAt?:   string;
  createdAt:      string;
  customerName?:  string;
  customerPhone?:  string;
  customerEmail?: string;
  customerMessage?: string;
  source:         string;
  urgency:        string;
  qualityScore:   number;
}

export interface Review {
  id:          string;
  rating:      number;
  title?:      string;
  body:        string;
  reviewerName: string;
  ownerReply?: string;
  helpfulCount: number;
  date:        string;
}

export interface Subscription {
  id:       string;
  tier:     Tier;
  amount:   number;
  currency: string;
  status:   string;
  currentPeriodEnd: string;
}

export interface ApiResponse<T> {
  success:   boolean;
  data:      T;
  timestamp: string;
  message?:  string;
}

export interface PaginatedResponse<T> {
  data:       T[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

export interface SearchResponse {
  data:       Business[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

export interface AuthTokens {
  accessToken:  string;
  refreshToken: string;
  user:         User;
}
