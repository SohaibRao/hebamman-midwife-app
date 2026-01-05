// components/appointments/StatusFilter.tsx
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS, SPACING, BORDER_RADIUS } from "@/constants/theme";
import de from "@/constants/i18n";

type StatusCounts = {
  all: number;
  active: number;
  pending: number;
  cancelled: number;
};

type Props = {
  selectedFilter: string;
  statusCounts: StatusCounts;
  onFilterChange: (filter: string) => void;
};

export default function StatusFilter({
  selectedFilter,
  statusCounts,
  onFilterChange,
}: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{de.appointments.filter.all}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.buttonRow}>
          <FilterButton
            label={`${de.appointments.filter.all} (${statusCounts.all})`}
            isActive={selectedFilter === "all"}
            onPress={() => onFilterChange("all")}
          />
          <FilterButton
            label={`${de.appointments.filter.active} (${statusCounts.active})`}
            isActive={selectedFilter === "active"}
            onPress={() => onFilterChange("active")}
          />
          <FilterButton
            label={`${de.appointments.filter.pending} (${statusCounts.pending})`}
            isActive={selectedFilter === "pending"}
            onPress={() => onFilterChange("pending")}
          />
          <FilterButton
            label={`${de.appointments.filter.cancelled} (${statusCounts.cancelled})`}
            isActive={selectedFilter === "cancelled"}
            onPress={() => onFilterChange("cancelled")}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function FilterButton({
  label,
  isActive,
  onPress,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.filterButton, isActive && styles.filterButtonActive]}
    >
      <Text style={[styles.filterButtonText, isActive && styles.filterButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.card,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  buttonRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  filterButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.backgroundGray,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  filterButtonTextActive: {
    color: COLORS.background,
  },
});