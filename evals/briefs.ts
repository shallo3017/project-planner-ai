import type { ProjectRequirements } from '@/server/services/ai.service';

/**
 * The fixed eval set. These briefs never change — that's the point: they're the
 * control. When a prompt or model changes, the same briefs are regenerated and
 * re-scored, so any movement in the score comes from the change, not the input.
 *
 * They deliberately span easy → hard: rich briefs, sparse ones, and a couple that
 * are vague on purpose (a good document should surface assumptions rather than
 * silently invent facts).
 */
export const BRIEFS: ProjectRequirements[] = [
  {
    name: 'FreshTiffin',
    industry: 'Food Delivery',
    description:
      'A subscription tiffin marketplace connecting home cooks with office workers in Indian metros. Buyers subscribe weekly or monthly; cooks publish menus and capacity. Needs cook onboarding with FSSAI verification, route-optimised delivery batching, and weekly cook payouts.',
    budgetRange: '₹15-20L',
    targetCountries: ['India'],
    features: [
      'Cook onboarding & KYC',
      'Weekly menu publishing',
      'Subscription billing (UPI)',
      'Delivery batching & routing',
      'Ratings & reviews',
      'Cook payout dashboard',
    ],
  },
  {
    name: 'MediQueue',
    industry: 'Healthcare',
    description:
      'Appointment booking and teleconsultation for small clinics. Patients book slots, join video consults, and receive e-prescriptions. Must be HIPAA-conscious and handle no-shows with reminders.',
    budgetRange: '$40k-60k',
    targetCountries: ['United States'],
    features: [
      'Slot booking',
      'Video consultation',
      'E-prescriptions',
      'SMS/email reminders',
      'Patient records',
    ],
  },
  {
    name: 'LedgerLite',
    industry: 'Fintech',
    description:
      'KYC-compliant onboarding and expense tracking for freelancers. Tiered identity verification, bank account linking, automated tax-category tagging of transactions, and quarterly tax estimates.',
    budgetRange: '$80k-120k',
    features: [
      'Tiered KYC',
      'Bank linking (open banking)',
      'Transaction categorisation',
      'Quarterly tax estimates',
      'Invoice generation',
    ],
  },
  {
    name: 'CourseForge',
    industry: 'Education',
    description:
      'A platform where independent instructors publish video courses with quizzes and certificates. Revenue share with instructors, drip-content scheduling, and cohort-based live sessions.',
    budgetRange: '₹25L',
    features: [
      'Course authoring',
      'Video hosting & streaming',
      'Quizzes & certificates',
      'Instructor revenue share',
      'Cohort live sessions',
    ],
  },
  {
    name: 'ShelfSense',
    industry: 'E-commerce / Retail',
    description:
      'Inventory forecasting for small retailers. Ingests POS sales history, predicts stockouts, and generates purchase orders to suppliers automatically.',
    budgetRange: '$50k',
    features: ['POS integration', 'Demand forecasting', 'Stockout alerts', 'Auto purchase orders'],
  },
  {
    name: 'CrewPilot',
    industry: 'SaaS / Productivity',
    description:
      'Shift scheduling for hourly teams in hospitality. Managers publish shifts, staff swap them subject to approval, and payroll hours export to accounting tools.',
    budgetRange: '$30k-45k',
    features: ['Shift publishing', 'Shift swaps with approval', 'Time clock', 'Payroll export'],
  },
  {
    name: 'TrailMark',
    industry: 'Other',
    description:
      'A hiking companion app with offline maps, trail conditions crowdsourced from users, and safety check-ins that alert an emergency contact if a hiker does not return on time.',
    features: ['Offline maps', 'Crowdsourced trail conditions', 'Safety check-in', 'Route recording'],
  },
  {
    name: 'RentRadar',
    industry: 'E-commerce / Retail',
    description:
      'A peer-to-peer marketplace for renting camera gear. Owners list equipment, renters book by date, with damage deposits held in escrow and identity verification for both sides.',
    budgetRange: '$60k',
    features: [
      'Gear listings & availability calendar',
      'Escrow deposits',
      'Two-sided identity verification',
      'Damage claims flow',
      'Messaging',
    ],
  },

  // ── Deliberately sparse: a strong document should state assumptions, not
  //    silently invent requirements that were never given. ──────────────────
  {
    name: 'Internal Tool',
    industry: 'SaaS / Productivity',
    description: 'A dashboard for our ops team to see what is going on.',
  },
  {
    name: 'Community App',
    description: 'An app for our neighbourhood to organise events and share notices.',
    features: ['Events', 'Notices'],
  },
];
