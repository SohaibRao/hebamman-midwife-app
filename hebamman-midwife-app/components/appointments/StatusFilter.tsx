// components/appointments/StatusFilter.tsx
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const COLORS = {
  bg: "#F6F8F7",
  card: "#FFFFFF",
  text: "#1D1D1F",
  dim: "#5C6B63",
  accent: "#2E5A49",
  line: "#E5E7EB",
};

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
      <Text style={styles.title}>Filter by Status</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.buttonRow}>
          <FilterButton
            label={`All (${statusCounts.all})`}
            isActive={selectedFilter === "all"}
            onPress={() => onFilterChange("all")}
          />
          <FilterButton
            label={`Active (${statusCounts.active})`}
            isActive={selectedFilter === "active"}
            onPress={() => onFilterChange("active")}
          />
          <FilterButton
            label={`Pending (${statusCounts.pending})`}
            isActive={selectedFilter === "pending"}
            onPress={() => onFilterChange("pending")}
          />
          <FilterButton
            label={`Cancelled (${statusCounts.cancelled})`}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.card,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.dim,
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  filterButtonActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.dim,
  },
  filterButtonTextActive: {
    color: "white",
  },
});