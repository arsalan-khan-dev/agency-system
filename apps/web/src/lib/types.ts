export interface ServiceCategory {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface ServiceItem {
  id: string;
  name: string;
  description: string | null;
  baseUnitCostCents: number;
  unit: string;
  isActive: boolean;
  category: ServiceCategory;
}

export interface Role {
  id: string;
  name: 'admin' | 'manager' | 'estimator' | 'viewer';
  description: string | null;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  createdAt: string;
  role: Role;
}

export interface ProjectType {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface FeatureItem {
  id: string;
  name: string;
  description: string | null;
  baselineHours: string;
  isActive: boolean;
  projectType: ProjectType;
}

export interface PricingProfile {
  id: string;
  name: string;
  description: string | null;
  baseHourlyRateCents: number;
  minimumPriceCents: number;
  currency: string;
  isActive: boolean;
}

export interface PricingRule {
  id: string;
  ruleType: 'complexity' | 'urgency';
  key: string;
  label: string;
  multiplier: string;
}

export interface EstimationQuestionOption {
  key: string;
  label: string;
}

export interface EstimationQuestion {
  id: string;
  projectType: ProjectType;
  prompt: string;
  answerType: 'complexity' | 'urgency';
  options: EstimationQuestionOption[];
  isActive: boolean;
}

export interface EstimationQuestionOption {
  key: string;
  label: string;
}

export interface EstimationQuestion {
  id: string;
  prompt: string;
  answerType: 'complexity' | 'urgency';
  options: EstimationQuestionOption[];
  isActive: boolean;
  projectType: ProjectType;
}

export interface Client {
  id: string;
  name: string;
  contactEmail: string | null;
  contactName: string | null;
  isActive: boolean;
}

export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';

export interface ConversionFunnelPoint {
  status: QuotationStatus;
  count: number;
}

export interface RevenueByProjectTypePoint {
  projectTypeName: string;
  acceptedQuotationCount: number;
  totalRevenueCents: number;
}

export interface EstimatedVsActualHoursPoint {
  projectId: string;
  projectTitle: string;
  estimatedHours: number;
  actualHours: number;
}

export interface ProfitabilityComparisonPoint {
  projectId: string;
  projectTitle: string;
  budgetCents: number;
  totalActualCostCents: number;
  profitCents: number;
  isOverBudget: boolean;
}

export interface AccuracyTrendPoint {
  projectId: string;
  projectTitle: string;
  projectTypeName: string;
  capturedAt: string;
  estimatedHours: number;
  actualHours: number;
  hoursVariancePct: number;
  budgetCents: number;
  actualCostCents: number;
  costVariancePct: number;
}

export interface AccuracyByProjectTypeSummary {
  projectTypeName: string;
  snapshotCount: number;
  avgHoursVariancePct: number;
  avgCostVariancePct: number;
}

export interface SimilarEstimateMatch {
  estimateId: string;
  title: string;
  projectTypeName: string;
  matchingFeatureCount: number;
  totalFeatureCount: number;
  overlapScore: number;
  complexityKey: string;
  urgencyKey: string;
  finalPriceCents: number;
  totalHoursSnapshot: number;
  status: string;
}

// Phase 2 task 4 — the client-safe projection returned by the public,
// unauthenticated /api/v1/public/quotations/:token routes. Deliberately a
// much narrower shape than the internal Quotation type — no ids, no
// estimate relation, no internal cost data. See QuotationService.toPublicView.
export interface PublicQuotationView {
  title: string;
  clientName: string;
  version: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  priceCents: number;
  currency: string;
  items: Array<{ description: string; hours: string }>;
  sentAt: string | null;
  respondedAt: string | null;
  recurringInterval: 'none' | 'monthly' | 'quarterly';
}

export interface QuotationItem {
  id: string;
  description: string;
  hours: string;
}

export interface Quotation {
  id: string;
  quotationGroupId: string;
  version: number;
  status: QuotationStatus;
  clientNameSnapshot: string;
  titleSnapshot: string;
  priceCentsSnapshot: number;
  currency: string;
  sentAt: string | null;
  respondedAt: string | null;
  createdAt: string;
  client: Client;
  items: QuotationItem[];
  acceptanceToken: string | null;
  acceptanceTokenExpiresAt: string | null;
  recurringInterval: 'none' | 'monthly' | 'quarterly';
  nextBillingDate: string | null;
  recurringSeriesId: string | null;
  lastReminderSentAt: string | null;
}

export type ProjectStatus = 'active' | 'completed' | 'cancelled';

export interface ProjectActualItem {
  id: string;
  description: string;
  hoursLogged: string;
  loggedAt: string;
}

export interface ExpenseItem {
  id: string;
  description: string;
  amountCents: number;
  incurredAt: string;
}

export interface Project {
  id: string;
  title: string;
  budgetCentsSnapshot: number;
  status: ProjectStatus;
  startedAt: string;
  completedAt: string | null;
  client: Client;
  quotation: Quotation;
  actuals: ProjectActualItem[];
  expenses: ExpenseItem[];
}

export interface ProfitabilitySummary {
  budgetCents: number;
  actualHours: number;
  hourlyCostBasisCents: number;
  laborCostCents: number;
  expensesCents: number;
  totalActualCostCents: number;
  profitCents: number;
  isOverBudget: boolean;
}

export interface Estimate {
  id: string;
  title: string;
  complexityKey: string;
  urgencyKey: string;
  totalHoursSnapshot: string;
  baseCostCentsSnapshot: number;
  complexityMultiplierSnapshot: string;
  urgencyMultiplierSnapshot: string;
  calculatedPriceCents: number;
  manualAdjustedPriceCents: number | null;
  adjustmentJustification: string | null;
  finalPriceCents: number;
  status: 'draft' | 'finalized';
  createdAt: string;
  projectType: ProjectType;
  pricingProfile: PricingProfile;
  features: Array<{ id: string; featureNameSnapshot: string; baselineHoursSnapshot: string }>;
}

export type ChangeRequestStatus = 'pending' | 'approved' | 'rejected';

export interface ChangeRequest {
  id: string;
  title: string;
  description: string;
  hoursDelta: string;      // numeric string from Postgres
  priceDeltaCents: number;
  status: ChangeRequestStatus;
  requestedBy: User | null;
  resolvedBy: User | null;
  // Non-null only when status === 'approved'
  resultingQuotation: Quotation | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  project: { id: string; title: string };
}

export interface OrgSettings {
  id: string;
  name: string;
  logoUrl: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  defaultCurrency: string;
  quotationFooterText: string | null;
  updatedAt: string;
}
