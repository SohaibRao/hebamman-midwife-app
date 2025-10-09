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

// -------------------- Theme --------------------
const COLORS = {
  bg: "#F6F8F7",
  card: "#FFFFFF",
  text: "#1D1D1F",
  dim: "#5C6B63",
  accent: "#2E5A49",
  sage: "#7F9086",
  amber: "#EAB308",
  green: "#22C55E",
  red: "#EF4444",
  blue: "#3B82F6",
  line: "#E5E7EB",
};

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
  status: "pending" | "converted" | "cancelled";
  createdAt: string;
};

type FilterType = "all" | "pending" | "converted" | "cancelled";

// Helper functions for status styling
const getStatusBadgeStyle = (status: string) => {
  return {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor:
      status === "converted"
        ? "#D1FAE5"
        : status === "pending"
        ? "#FEF3C7"
        : "#FEE2E2",
  };
};

const getStatusTextStyle = (status: string) => {
  return {
    fontSize: 11,
    fontWeight: "700" as const,
    color:
      status === "converted"
        ? "#065F46"
        : status === "pending"
        ? "#92400E"
        : "#991B1B",
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

  // Filter patients
  const filteredPatients = useMemo(() => {
    if (filter === "all") return patients;
    return patients.filter(p => p.status === filter);
  }, [patients, filter]);

  // Get counts
  const counts = useMemo(() => {
    return {
      all: patients.length,
      pending: patients.filter(p => p.status === "pending").length,
      converted: patients.filter(p => p.status === "converted").length,
      cancelled: patients.filter(p => p.status === "cancelled").length,
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
      <View style={[styles.center, { flex: 1, backgroundColor: COLORS.bg }]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={{ marginTop: 8, color: COLORS.dim }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Patients</Text>
        <Text style={styles.subtitle}>{counts.all} total patients</Text>
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            onPress={() => setFilter("all")}
            style={[styles.filterBtn, filter === "all" && styles.filterBtnActive]}
          >
            <Text style={[styles.filterText, filter === "all" && styles.filterTextActive]}>
              All ({counts.all})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => setFilter("pending")}
            style={[styles.filterBtn, filter === "pending" && styles.filterBtnActive]}
          >
            <Text style={[styles.filterText, filter === "pending" && styles.filterTextActive]}>
              Pending ({counts.pending})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => setFilter("converted")}
            style={[styles.filterBtn, filter === "converted" && styles.filterBtnActive]}
          >
            <Text style={[styles.filterText, filter === "converted" && styles.filterTextActive]}>
              Converted ({counts.converted})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => setFilter("cancelled")}
            style={[styles.filterBtn, filter === "cancelled" && styles.filterBtnActive]}
          >
            <Text style={[styles.filterText, filter === "cancelled" && styles.filterTextActive]}>
              Cancelled ({counts.cancelled})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Error */}
      {error && (
        <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
          <Text style={{ color: COLORS.red }}>{error}</Text>
        </View>
      )}

      {/* List */}
      {loading ? (
        <View style={[styles.center, { padding: 20 }]}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      ) : (
        <FlatList
          data={filteredPatients}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          ListEmptyComponent={
            <View style={[styles.center, { padding: 24 }]}>
              <Text style={{ color: COLORS.dim, textAlign: "center" }}>
                No {filter !== "all" ? filter : ""} patients found
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
                  Booked: {item.date} • {item.selectedSlot}
                </Text>
              </View>
              
              <View style={getStatusBadgeStyle(item.status)}>
                <Text style={getStatusTextStyle(item.status)}>
                  {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
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
              <Text style={styles.modalTitle}>Patient Details</Text>
              <TouchableOpacity onPress={closeDetails}>
                <Text style={{ fontSize: 24, color: COLORS.dim, fontWeight: "800" }}>×</Text>
              </TouchableOpacity>
            </View>

            {selectedPatient && (
              <ScrollView style={{ maxHeight: 500 }}>
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Personal Information</Text>
                  <DetailRow label="Name" value={selectedPatient.fullName} />
                  <DetailRow label="Email" value={selectedPatient.email} />
                  <DetailRow label="Phone" value={selectedPatient.phoneNumber} />
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status:</Text>
                    <View style={getStatusBadgeStyle(selectedPatient.status)}>
                      <Text style={getStatusTextStyle(selectedPatient.status)}>
                        {selectedPatient.status}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Insurance</Text>
                  <DetailRow label="Number" value={selectedPatient.insuranceNumber} />
                  <DetailRow label="Company" value={selectedPatient.insuranceCompany} />
                  <DetailRow label="Type" value={selectedPatient.insuranceType} />
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Appointment</Text>
                  <DetailRow label="Date" value={selectedPatient.date} />
                  <DetailRow label="Slot" value={selectedPatient.selectedSlot} />
                  <DetailRow label="Expected Delivery" value={selectedPatient.expectedDeliveryDate} />
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Address</Text>
                  <Text style={styles.addressText}>
                    {selectedPatient.selectedAddressDetails.address}
                  </Text>
                </View>

                {selectedPatient.status === "converted" && (
                  <View style={styles.actionSection}>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={navigateToAppointments}
                    >
                      <Text style={styles.actionBtnText}>View & Manage Appointments</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            )}

            <View style={{ marginTop: 16 }}>
              <TouchableOpacity onPress={closeDetails} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>Close</Text>
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
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.dim,
    marginTop: 4,
  },

  filterContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.bg,
    marginRight: 8,
  },
  filterBtnActive: {
    backgroundColor: COLORS.accent,
  },
  filterText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dim,
  },
  filterTextActive: {
    color: COLORS.card,
  },

  patientCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  patientName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  patientEmail: {
    fontSize: 13,
    color: COLORS.dim,
    marginBottom: 2,
  },
  patientPhone: {
    fontSize: 13,
    color: COLORS.dim,
    marginBottom: 4,
  },
  patientDate: {
    fontSize: 12,
    color: COLORS.sage,
    fontWeight: "600",
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 500,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.text,
  },

  detailSection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.dim,
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
    marginTop: 8,
    marginBottom: 16,
  },
  actionBtn: {
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  actionBtnText: {
    color: COLORS.card,
    fontSize: 16,
    fontWeight: "700",
  },

  closeBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: COLORS.bg,
  },
  closeBtnText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "700",
  },
});