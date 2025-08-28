import React, { useMemo, useState } from "react";
import { Dimensions, View, StyleSheet, Text , TouchableOpacity } from "react-native";
import { Calendar } from "react-native-big-calendar";
// Note: Avoid importing CalendarEvent as a type due to conflicts
import { Appointment, COLORS, codeColor, formatTime } from "./types";
import { addMonths, format, isSameMonth, startOfMonth } from "date-fns";

// We extend the event shape with our own payload
type RNEvent = {
  title: string;
  start: Date;
  end: Date;
  data: Appointment;
};
export default function AppointmentCalendar({
  appointments,
  onPressEvent,
  style,
}: {
  appointments: Appointment[];
  onPressEvent: (a: Appointment) => void;
  style?: any;
}) {
  const [current, setCurrent] = useState<Date>(startOfMonth(new Date()));
  const screenH = Dimensions.get("window").height;
  const height = Math.max(460, screenH - 260); // tall enough for tapping

  const events = useMemo<RNEvent[]>(() => {
    return appointments.map((a) => ({
      title: `${a.serviceCode} - ${a.patientShort}`,
      start: new Date(a.startISO),
      end: new Date(a.endISO),
      data: a,
    }));
  }, [appointments]);

  const handleChangeDate = (d: any) => {
    // Some versions pass [start, end], others pass Date
    const next = Array.isArray(d) ? startOfMonth(d[0]) : startOfMonth(d);
    if (!isSameMonth(current, next)) {
      setCurrent(next); // ✅ only update when month actually changes
    }
  };

  return (
    <View style={[{ flex: 1 }, style]}>
      {/* Month header with navigation */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => setCurrent((c) => addMonths(c, -1))} style={styles.navBtn}>
          <Text style={styles.navText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{format(current, "MMMM yyyy")}</Text>
        <TouchableOpacity onPress={() => setCurrent((c) => addMonths(c, 1))} style={styles.navBtn}>
          <Text style={styles.navText}>›</Text>
        </TouchableOpacity>
      </View>

      <Calendar
        height={height}
        date={current}
        events={events}
        mode="month"
        weekStartsOn={1}
        swipeEnabled
        // Improve tap targets / stacking
        maxVisibleEventCount={3}
        eventMinHeightForMonthView={22}
        eventCellStyle={() => ({ borderRadius: 6 })}
        renderEvent={(e: any) => {
          const ev = e as RNEvent;
          return (
            <View style={[styles.event, { backgroundColor: codeColor(ev.data.serviceCode) }]}>
              <Text style={styles.eventText}>
                {ev.data.serviceCode} • {formatTime(ev.data.startISO)} • {ev.data.patientShort}
              </Text>
            </View>
          );
        }}
        onPressEvent={(e: any) => onPressEvent((e as RNEvent).data)}
        onChangeDate={handleChangeDate}  // ✅ guarded against loops
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    paddingTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  monthLabel: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E7ECEA",
  },
  navText: { fontSize: 20, fontWeight: "900", color: COLORS.text },

  event: { paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6 },
  eventText: { color: "white", fontWeight: "700", fontSize: 10 },
});