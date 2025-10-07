import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Modular imports (web-style API)
import { getApp } from '@react-native-firebase/app';
import {
  doc,
  getFirestore,
  onSnapshot,
  runTransaction,
} from '@react-native-firebase/firestore';

import { showActionToast } from "@/components/GlobalActionToast";
import { Toast } from '@/components/ToastContainer';
import { BarberData, BarberStorage } from '@/utils/BarberStorage';

type Customer = {
  name: string;
  phone: string;
  email?: string;
  joinedAt: string;
  service?: string;
  services?: string[];
};

export default function BarberQueue() {
  const [barberData, setBarberData] = useState<BarberData | null>(null);
  const [queue, setQueue] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const db = getFirestore(getApp());

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const init = async () => {
      try {
        const data = await BarberStorage.getBarberData();
        if (!data) {
          setLoading(false);
          return;
        }

        setBarberData(data);

        const qDocRef = doc(db, "queue", data.uid);

        unsubscribe = onSnapshot(qDocRef, (snap) => {
          if (snap.exists()) {
            const docData = snap.data() as { customers?: Customer[] };
            let arr = docData.customers || [];

            // Sort by joinedAt ascending
            arr = arr.sort(
              (a, b) =>
                new Date(a.joinedAt).getTime() -
                new Date(b.joinedAt).getTime()
            );

            setQueue(arr);
          } else {
            setQueue([]);
          }
          setLoading(false);
        });
      } catch (error) {
        console.error("Error initializing queue:", error);
        setLoading(false);
      }
    };

    init();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleRemove = (phoneToRemove: string, customerName: string) => {
    if (!barberData) return;

    showActionToast({
      message: `Remove ${customerName} from queue?`,
      onConfirm: async () => {
        try {
          const qDocRef = doc(db, "queue", barberData.uid);
          await runTransaction(db, async (tx) => {
            const snap = await tx.get(qDocRef);
            if (!snap.exists()) return;
            const data = snap.data() as { customers?: Customer[] };
            const arr = (data.customers || []).filter(
              (c) => c.phone !== phoneToRemove
            );
            tx.update(qDocRef, { customers: arr });
          });
          Toast.success(`${customerName} removed successfully`);
        } catch (err) {
          console.error("Error removing customer:", err);
          Toast.error("Failed to remove customer. Please try again.");
        }
      },
    });
  };

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    
    if (isToday) {
      return `Today, ${d.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    }
    
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  };

  const getWaitTime = (joinedAt: string) => {
    const joinTime = new Date(joinedAt);
    const now = new Date();
    const diffMs = now.getTime() - joinTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) {
      return `${diffMins}m`;
    }
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  const getCustomerServices = (customer: Customer): string[] => {
    if (customer.services && customer.services.length > 0) {
      return customer.services;
    }
    if (customer.service) {
      return [customer.service];
    }
    return [];
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#171717ff" />
          <Text style={styles.loadingText}>Loading queue...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {barberData?.storeName || "Queue"}
        </Text>
        <View style={styles.queueStats}>
          <View style={styles.statItem}>
            <Ionicons name="people" size={20} color="#000000ff" />
            <Text style={styles.statText}>{queue.length} waiting</Text>
          </View>
        </View>
      </View>

      {queue.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="checkmark-circle" size={64} color="#4CAF50" />
          <Text style={styles.emptyTitle}>Queue is Empty</Text>
          <Text style={styles.emptyText}>
            No customers waiting. Ready for the next one!
          </Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {queue.map((customer, index) => {
            const services = getCustomerServices(customer);
            
            return (
              <View 
                key={customer.phone} 
                style={styles.customerCardWrapper}
              >
                {/* Card Content with Position Badge and Remove Button */}
                <View style={[
                  styles.customerCard,
                  index === 0 && styles.currentCustomerCard
                ]}>
                  {/* Position Number - Top-left corner */}
                  <View style={styles.positionBadgeCorner}>
                    <Text style={styles.positionNumberText}>
                      {index + 1}
                    </Text>
                  </View>

                  {/* Left side - Customer Details (60%) */}
                  <View style={styles.customerDetailsSection}>
                    {/* Customer Name */}
                    <Text style={styles.customerName}>{customer.name}</Text>
                    
                    {/* Phone Number */}
                    <View style={styles.detailRow}>
                      <Ionicons name="call" size={16} color="#000000ff" />
                      <Text style={styles.detailText}>{customer.phone}</Text>
                    </View>

                    {/* Divider */}
                    <View style={styles.divider} />

                    {/* Waiting Time */}
                    <View style={styles.timeRow}>
                      <Ionicons name="time-outline" size={16} color="#000000ff" />
                      <Text style={styles.timeValue}>{getWaitTime(customer.joinedAt)}</Text>
                    </View>

                    {/* Joined Time */}
                    <View style={styles.timeRow}>
                      <Ionicons name="calendar-outline" size={16} color="#000000ff" />
                      <Text style={styles.timeLabel}>Joined:</Text>
                      <Text style={styles.timeValue}>{formatDateTime(customer.joinedAt)}</Text>
                    </View>
                  </View>

                  {/* Middle section - Services (25%) */}
                  <View style={styles.servicesSection}>
                    <ScrollView 
                      style={styles.servicesScrollView}
                      showsVerticalScrollIndicator={false}
                      nestedScrollEnabled={true}
                    >
                      {services.length > 0 ? (
                        services.map((service, idx) => (
                          <View key={idx} style={styles.serviceChip}>
                            <Text style={styles.serviceText} numberOfLines={1}>
                              {service}
                            </Text>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.noServiceText}>No services</Text>
                      )}
                    </ScrollView>
                  </View>

                  {/* Right side - Remove Button (15%) */}
                  <TouchableOpacity
                    style={styles.removeButtonSection}
                    onPress={() => handleRemove(customer.phone, customer.name)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={24} color="#1a1a1aff" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f4f8",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#64748b",
    fontWeight: "600",
  },

  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomColor: "#d1d5db",
    borderBottomWidth: 1.5,
    backgroundColor: "#ffffff",
    elevation: 2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1e40af",
    letterSpacing: 1,
    textAlign: "center",
    marginBottom: 6,
  },
  queueStats: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 24,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e40af",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1f2937",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 22,
  },

  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 100,
  },

  // Card wrapper
  customerCardWrapper: {
    marginBottom: 14,
  },

  // Main card container
  customerCard: {
    position: "relative",
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1.5,
    borderColor: "#d1d5db",
    minHeight: 140,
  },
  currentCustomerCard: {
    borderColor: "#2563eb",
    borderWidth: 3,
    elevation: 8,
    shadowOpacity: 0.15,
  },

  // Position number in top-left corner
  positionBadgeCorner: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 30,
    height: 30,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
    borderBottomRightRadius: 16,
    zIndex: 5,
  },
  positionNumberText: {
    fontSize: 24,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: 0,
  },

  // Left section (60%) - Customer details
  customerDetailsSection: {
    flex: 0.6,
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 44,
    paddingRight: 8,
  },

  customerName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1f2937",
    marginBottom: 6,
    letterSpacing: 0.3,
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  detailText: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "500",
    flex: 1,
  },

  // Divider line
  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 8,
  },

  // Time rows (waiting & joined)
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  timeLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
  },
  timeValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    flex: 1,
  },

  // Middle section (25%) - Services
  servicesSection: {
    flex: 0.25,
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: "#f9fafb",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#e5e7eb",
  },
  servicesSectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 8,
    textAlign: "center",
  },
  servicesScrollView: {
    flex: 1,
  },
  serviceChip: {
    backgroundColor: "#dbeafe",
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#93c5fd",
  },
  serviceText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1e40af",
    textAlign: "center",
  },
  noServiceText: {
    fontSize: 11,
    color: "#9ca3af",
    textAlign: "center",
    fontStyle: "italic",
  },

  // Right section (15%) - Remove button
  removeButtonSection: {
    flex: 0.15,
    backgroundColor: "#f34f4fd7",
    justifyContent: "center",
    alignItems: "center",
  },
});