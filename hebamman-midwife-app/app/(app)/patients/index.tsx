// app/(app)/patients/index.tsx
import React, { useState, useEffect, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { useMidwifeProfile } from "@/hooks/useMidwifeProfile";
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, STATUS_COLORS } from "@/constants/theme";
import de from "@/constants/i18n";

// -------------------- Types --------------------
type Patient = {
  _id: string;
  userId: string;
  midwifeId: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  insuranceNumber: string;
  insuranceCompany: string;
  insuranceType: string;
  date: string;
  expectedDeliveryDate: string;
  selectedAddressDetails: {
    address: string;
    mainText: string;
    secondaryText: string;
  };
  selectedSlot: string;
  clientStatus: "pending" | "converted" | "cancelled"; // Client/Lead status
  status: "pending" | "active" | "cancelled"; // Appointment status
  createdAt: string;
};

type FilterType = "all" | "pending" | "converted" | "cancelled";

// Get German label for client status
const getClientStatusLabel = (status: string) => {
  if (status === "converted") return de.patients.status.schwanger;
  if (status === "pending") return de.patients.status.pending;
  if (status === "cancelled") return de.patients.status.cancelled;
  return status;
};

// Helper functions for client status styling
const getClientStatusBadgeStyle = (status: string) => {
  return {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor:
      status === "converted"
        ? COLORS.successLight
        : status === "pending"
        ? COLORS.warningLight
        : COLORS.errorLight,
  };
};

const getClientStatusTextStyle = (status: string) => {
  return {
    fontSize: 11,
    fontWeight: "700" as const,
    color:
      status === "converted"
        ? COLORS.success
        : status === "pending"
        ? COLORS.warning
        : COLORS.error,
  };
};

// Helper functions for appointment status styling
const getAppointmentStatusBadgeStyle = (status: string) => {
  return {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor:
      status === "active"
        ? COLORS.infoLight
        : status === "pending"
        ? COLORS.warningLight
        : COLORS.errorLight,
  };
};

const getAppointmentStatusTextStyle = (status: string) => {
  return {
    fontSize: 11,
    fontWeight: "700" as const,
    color:
      status === "active"
        ? COLORS.info
        : status === "pending"
        ? COLORS.warning
        : COLORS.error,
  };
};

// -------------------- Main Component --------------------
export default function PatientsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const pf = useMidwifeProfile(user?.id);
  const midwifeProfile = pf.data as any;
  const midwifeId = midwifeProfile?._id ?? "";

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Fetch patients
  const fetchPatients = async () => {
    if (!midwifeId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await api(`/api/public/midwifeBooking/${midwifeId}`);
      const json = await res.json();
      
      if (!json.success) {
        throw new Error(json.message || "Failed to fetch patients");
      }
      
      setPatients(json.data || []);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load patients");
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pf.status === "success" && midwifeId) {
      fetchPatients();
    }
  }, [pf.status, midwifeId]);

  // Filter patients by clientStatus
  const filteredPatients = useMemo(() => {
    if (filter === "all") return patients;
    return patients.filter(p => p.clientStatus === filter);
  }, [patients, filter]);

  // Get counts by clientStatus
  const counts = useMemo(() => {
    return {
      all: patients.length,
      pending: patients.filter(p => p.clientStatus === "pending").length,
      converted: patients.filter(p => p.clientStatus === "converted").length,
      cancelled: patients.filter(p => p.clientStatus === "cancelled").length,
    };
  }, [patients]);

  const openDetails = (patient: Patient) => {
    setSelectedPatient(patient);
    setDetailsOpen(true);
  };

  const closeDetails = () => {
    setDetailsOpen(false);
    setSelectedPatient(null);
  };

  const navigateToAppointments = () => {
    if (!selectedPatient) return;
    
    closeDetails();
    
    router.push({
      pathname: "/(app)/patients/[patientId]/appointments" as any,
      params: {
        clientId: selectedPatient.userId,
        midwifeId: midwifeId,
        patientName: selectedPatient.fullName,
      }
    });
  };

  // Render loading
  if (pf.status === "loading" || !midwifeId) {
    return (
      <View style={[styles.center, { flex: 1, backgroundColor: COLORS.background }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 8, color: COLORS.textSecondary }}>{de.common.loading}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{de.patients.title}</Text>
        <Text style={styles.subtitle}>{counts.all} {de.patients.totalCount}</Text>
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            onPress={() => setFilter("all")}
            style={[styles.filterBtn, filter === "all" && styles.filterBtnActive]}
          >
            <Text style={[styles.filterText, filter === "all" && styles.filterTextActive]}>
              {de.common.all} ({counts.all})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFilter("pending")}
            style={[styles.filterBtn, filter === "pending" && styles.filterBtnActive]}
          >
            <Text style={[styles.filterText, filter === "pending" && styles.filterTextActive]}>
              {de.patients.status.pending} ({counts.pending})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFilter("converted")}
            style={[styles.filterBtn, filter === "converted" && styles.filterBtnActive]}
          >
            <Text style={[styles.filterText, filter === "converted" && styles.filterTextActive]}>
              {de.patients.categories.pregnant} ({counts.converted})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setFilter("cancelled")}
            style={[styles.filterBtn, filter === "cancelled" && styles.filterBtnActive]}
          >
            <Text style={[styles.filterText, filter === "cancelled" && styles.filterTextActive]}>
              {de.patients.status.cancelled} ({counts.cancelled})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Error */}
      {error && (
        <View style={{ paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm }}>
          <Text style={{ color: COLORS.error }}>{error}</Text>
        </View>
      )}

      {/* List */}
      {loading ? (
        <View style={[styles.center, { padding: SPACING.xl }]}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredPatients}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.md }}
          ListEmptyComponent={
            <View style={[styles.center, { padding: SPACING.xxl }]}>
              <Text style={{ color: COLORS.textSecondary, textAlign: "center" }}>
                {de.patients.noPatients}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => openDetails(item)}
              style={styles.patientCard}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.patientName}>{item.fullName}</Text>
                <Text style={styles.patientEmail}>{item.email}</Text>
                <Text style={styles.patientPhone}>{item.phoneNumber}</Text>
                <Text style={styles.patientDate}>
                  {de.common.date}: {item.date} • {item.selectedSlot}
                </Text>
              </View>

              <View style={getClientStatusBadgeStyle(item.clientStatus)}>
                <Text style={getClientStatusTextStyle(item.clientStatus)}>
                  {getClientStatusLabel(item.clientStatus)}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Details Modal */}
      <Modal
        visible={detailsOpen}
        transparent
        animationType="fade"
        onRequestClose={closeDetails}
      >
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Patientinnen-Details</Text>
              <TouchableOpacity onPress={closeDetails}>
                <Text style={{ fontSize: 24, color: COLORS.textSecondary, fontWeight: "800" }}>×</Text>
              </TouchableOpacity>
            </View>

            {selectedPatient && (
              <ScrollView style={{ maxHeight: 500 }}>
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>{de.profile.personalInfo}</Text>
                  <DetailRow label={de.common.name} value={selectedPatient.fullName} />
                  <DetailRow label={de.common.email} value={selectedPatient.email} />
                  <DetailRow label={de.common.phone} value={selectedPatient.phoneNumber} />

                  {/* Client Status */}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{de.common.status}:</Text>
                    <View style={getClientStatusBadgeStyle(selectedPatient.clientStatus)}>
                      <Text style={getClientStatusTextStyle(selectedPatient.clientStatus)}>
                        {getClientStatusLabel(selectedPatient.clientStatus)}
                      </Text>
                    </View>
                  </View>

                  {/* Appointment Status */}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Termin:</Text>
                    <View style={getAppointmentStatusBadgeStyle(selectedPatient.status)}>
                      <Text style={getAppointmentStatusTextStyle(selectedPatient.status)}>
                        {selectedPatient.status === "active" ? "Aktiv" : selectedPatient.status === "pending" ? "Ausstehend" : "Abgesagt"}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Versicherung</Text>
                  <DetailRow label="Nummer" value={selectedPatient.insuranceNumber} />
                  <DetailRow label="Unternehmen" value={selectedPatient.insuranceCompany} />
                  <DetailRow label="Typ" value={selectedPatient.insuranceType === "government" ? de.insurance.government : de.insurance.private} />
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Termin</Text>
                  <DetailRow label={de.common.date} value={selectedPatient.date} />
                  <DetailRow label="Zeitfenster" value={selectedPatient.selectedSlot} />
                  <DetailRow label={de.patients.dueDate} value={selectedPatient.expectedDeliveryDate} />
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>{de.common.address}</Text>
                  <Text style={styles.addressText}>
                    {selectedPatient.selectedAddressDetails.address}
                  </Text>
                </View>

                {selectedPatient.clientStatus === "converted" && (
                  <View style={styles.actionSection}>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={navigateToAppointments}
                    >
                      <Text style={styles.actionBtnText}>Termine ansehen & verwalten</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            )}

            <View style={{ marginTop: SPACING.lg }}>
              <TouchableOpacity onPress={closeDetails} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>{de.actions.close}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// -------------------- Helper Components --------------------
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}:</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

// -------------------- Styles --------------------
const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },

  header: {
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  filterContainer: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterBtn: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.backgroundGray,
    marginRight: SPACING.sm,
  },
  filterBtnActive: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: COLORS.background,
  },

  patientCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    ...SHADOWS.sm,
  },
  patientName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  patientEmail: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  patientPhone: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  patientDate: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "600",
  },

  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.xl,
  },
  modalCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    width: "100%",
    maxWidth: 500,
    ...SHADOWS.lg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.text,
  },

  detailSection: {
    marginBottom: SPACING.lg,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.md,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
    width: 120,
  },
  detailValue: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
  addressText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },

  actionSection: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  actionBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: "center",
  },
  actionBtnText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: "700",
  },

  closeBtn: {
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    alignItems: "center",
    backgroundColor: COLORS.backgroundGray,
  },
  closeBtnText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "700",
  },
});