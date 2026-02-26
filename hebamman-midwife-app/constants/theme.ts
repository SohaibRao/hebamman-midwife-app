/**
 * Theme Constants for Hebamman Midwife App
 * Design System for German UI Redesign
 */

export const COLORS = {
  // Primary Brand Colors
  primary: '#D4A5A5',        // Rose/Mauve pink - main accent
  primaryDark: '#C08585',    // Darker rose for hover/pressed states
  primaryLight: '#E8D4D4',   // Lighter rose for backgrounds

  // Background Colors
  background: '#FFFFFF',      // Main background
  backgroundGray: '#F8F9FA',  // Secondary background
  card: '#FFFFFF',            // Card background

  // Text Colors
  text: '#1D1D1F',           // Primary text (dark gray/black)
  textSecondary: '#6B7280',  // Secondary text (lighter gray)
  textLight: '#9CA3AF',      // Tertiary text

  // Status Badge Colors
  statusSchwanger: '#D4A5A5',     // Pregnant - Pink/rose
  statusWochenbett: '#8B7355',    // Postpartum - Brown/tan
  statusAbgeschlossen: '#9CA3AF', // Completed - Gray
  statusAktiv: '#10B981',         // Active - Green
  statusOffen: '#F59E0B',         // Open/Pending - Orange
  statusAbgesagt: '#EF4444',      // Cancelled - Red

  // Location/Type Badge Colors
  locationPraxis: '#E3F2FD',      // Practice - Light blue background
  locationPraxisText: '#1976D2',  // Practice - Blue text
  locationHausbesuch: '#E8F5E9',  // Home visit - Light green background
  locationHausbesuchText: '#388E3C', // Home visit - Green text
  locationVideocall: '#F3E5F5',   // Video call - Light purple background
  locationVideocallText: '#7B1FA2', // Video call - Purple text
  locationTelefon: '#FFF9C4',     // Phone - Light yellow background
  locationTelefonText: '#F57C00', // Phone - Orange text

  // Action Colors
  success: '#10B981',        // Mint green for positive actions
  successLight: '#D1FAE5',   // Light green background
  warning: '#F59E0B',        // Orange for warnings
  warningLight: '#FEF3C7',   // Light orange background
  error: '#EF4444',          // Red for errors/delete
  errorLight: '#FEE2E2',     // Light red background
  info: '#3B82F6',           // Blue for info
  infoLight: '#DBEAFE',      // Light blue background

  // Notification Colors
  notificationBg: '#FFF1F2',     // Light pink notification background
  notificationIcon: '#D4A5A5',   // Rose notification icon

  // UI Elements
  border: '#E5E7EB',         // Border color
  borderLight: '#F3F4F6',    // Light border
  divider: '#E5E7EB',        // Divider line
  shadow: '#00000015',       // Shadow color with opacity
  overlay: '#00000080',      // Modal overlay (50% opacity)

  // Button Colors
  buttonPrimary: '#D4A5A5',       // Primary button background
  buttonPrimaryText: '#FFFFFF',   // Primary button text
  buttonSecondary: '#FFFFFF',     // Secondary button background
  buttonSecondaryBorder: '#D4A5A5', // Secondary button border
  buttonSecondaryText: '#D4A5A5', // Secondary button text
  buttonDisabled: '#E5E7EB',      // Disabled button
  buttonDisabledText: '#9CA3AF',  // Disabled text

  // Service Code Colors (from existing app)
  serviceA1A2: '#7c3aed',    // Purple
  serviceB1: '#2563eb',      // Blue
  serviceB2: '#0ea5e9',      // Cyan
  serviceE1: '#f59e0b',      // Amber
  serviceC1: '#16a34a',      // Green
  serviceC2: '#10b981',      // Teal
  serviceD1: '#ef4444',      // Red
  serviceD2: '#f97316',      // Orange
  serviceF1: '#a855f7',      // Violet
  serviceG: '#14b8a6',       // Teal - Phone consultations (Telefon-Termine)
  servicePrivate: '#8B5CF6', // Violet - Private service bookings (Privatleistungen)
};

export const TYPOGRAPHY = {
  // Font Families (using system defaults)
  fontRegular: 'System',
  fontMedium: 'System',
  fontBold: 'System',

  // Font Sizes
  size8: 8,
  size10: 10,
  size12: 12,
  size14: 14,
  size16: 16,
  size18: 18,
  size20: 20,
  size24: 24,
  size28: 28,
  size32: 32,
  size36: 36,

  // Font Weights
  weightRegular: '400' as const,
  weightMedium: '500' as const,
  weightSemiBold: '600' as const,
  weightBold: '700' as const,
  weightExtraBold: '800' as const,

  // Line Heights
  lineHeightTight: 1.2,
  lineHeightNormal: 1.5,
  lineHeightRelaxed: 1.75,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
};

export const BORDER_RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999, // For circular elements
};

export const SHADOWS = {
  sm: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
};

export const ICON_SIZES = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 40,
  xxl: 48,
};

// Status badge color mapping
export const STATUS_COLORS = {
  schwanger: {
    background: COLORS.statusSchwanger,
    text: COLORS.background,
  },
  wochenbett: {
    background: COLORS.statusWochenbett,
    text: COLORS.background,
  },
  abgeschlossen: {
    background: COLORS.statusAbgeschlossen,
    text: COLORS.background,
  },
  aktiv: {
    background: COLORS.statusAktiv,
    text: COLORS.background,
  },
  offen: {
    background: COLORS.statusOffen,
    text: COLORS.background,
  },
  pending: {
    background: COLORS.statusOffen,
    text: COLORS.background,
  },
  abgesagt: {
    background: COLORS.statusAbgesagt,
    text: COLORS.background,
  },
  cancelled: {
    background: COLORS.statusAbgesagt,
    text: COLORS.background,
  },
};

// Location/Type badge color mapping
export const LOCATION_COLORS = {
  praxis: {
    background: COLORS.locationPraxis,
    text: COLORS.locationPraxisText,
  },
  hausbesuch: {
    background: COLORS.locationHausbesuch,
    text: COLORS.locationHausbesuchText,
  },
  videocall: {
    background: COLORS.locationVideocall,
    text: COLORS.locationVideocallText,
  },
  telefon: {
    background: COLORS.locationTelefon,
    text: COLORS.locationTelefonText,
  },
};

export default {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
  ICON_SIZES,
  STATUS_COLORS,
  LOCATION_COLORS,
};
