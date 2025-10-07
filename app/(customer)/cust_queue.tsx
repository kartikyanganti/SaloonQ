// cust_queue.tsx
import { showActionToast } from "@/components/GlobalActionToast";
import { Toast } from '@/components/ToastContainer';
import { UserData, UserStorage } from "@/utils/UserStorage";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ✅ Modular Native Firebase
import { collection, doc, getDoc, getFirestore, onSnapshot, setDoc, updateDoc } from "@react-native-firebase/firestore";

interface QueueCustomer {
  name: string;
  phone: string;
  services: string[];
  joinedAt: string;
}

interface BarberData {
  fullName: string;
  storeName: string;
  servicesPro: string[];
  status: string;
}

const { width } = Dimensions.get("window");
const db = getFirestore();

// Skeleton Card Component
const SkeletonCard = () => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  return (
    <View style={styles.skeletonCardWrapper}>
      <View style={styles.skeletonCard}>
        <View style={styles.leftSection}>
          <Animated.View style={[styles.skeletonPositionBadge, { opacity }]} />
          <View style={styles.customerDetails}>
            <Animated.View style={[styles.skeletonName, { opacity }]} />
            <Animated.View style={[styles.skeletonPhone, { opacity }]} />
            <View style={styles.divider} />
            <Animated.View style={[styles.skeletonTime, { opacity }]} />
            <Animated.View style={[styles.skeletonTime, { opacity }]} />
          </View>
        </View>
        <View style={styles.rightSection}>
          <Animated.View style={[styles.skeletonService, { opacity }]} />
          <Animated.View style={[styles.skeletonService, { opacity }]} />
        </View>
      </View>
    </View>
  );
};

export default function CustomerQueue() {
  const [barberPhone, setBarberPhone] = useState("");
  const [barberData, setBarberData] = useState<BarberData | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [joined, setJoined] = useState(false);
  const [customers, setCustomers] = useState<QueueCustomer[]>([]);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const formatTime = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const calculateWaitTime = (joinedAt: string): string => {
    const now = new Date().getTime();
    const joined = new Date(joinedAt).getTime();
    const diffMs = now - joined;

    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  };

  const formatPhoneNumber = (phone: string): string => {
    if (phone.length < 6) return phone;
    const first4 = phone.substring(0, 4);
    const last2 = phone.substring(phone.length - 2);
    return `${first4}XXX${last2}`;
  };

  useFocusEffect(
    useCallback(() => {
      let unsubscribe: (() => void) | null = null;
      let barberUnsubscribe: (() => void) | null = null;

      const loadInfo = async () => {
        try {
          const user = await UserStorage.getUserData();
          if (!user) {
            Toast.error("Please login first");
            setLoading(false);
            return;
          }
          setUserData(user);

          const barberUID = await AsyncStorage.getItem("selectedBarberUID");
          if (!barberUID) {
            Toast.error("No barber selected");
            setLoading(false);
            return;
          }
          
          setLoading(true);
          setBarberData(null);
          setCustomers([]);
          setJoined(false);
          setBarberPhone(barberUID);

          const barberDocRef = doc(collection(db, "barber"), barberUID);
          
          barberUnsubscribe = onSnapshot(barberDocRef, (barberSnap) => {
            if (barberSnap.exists()) {
              const data = (barberSnap.data() || {}) as Partial<BarberData>;
              const barberInfo: BarberData = {
                fullName: data.fullName || "Unknown Barber",
                storeName: data.storeName || "Unknown Store",
                servicesPro: Array.isArray(data.servicesPro) ? data.servicesPro : [],
                status: data.status || "closed"
              };
              setBarberData(barberInfo);
            } else {
              Toast.error("Barber not found");
              setLoading(false);
            }
          });

          const queueDocRef = doc(collection(db, "queue"), barberUID);
          unsubscribe = onSnapshot(queueDocRef, (snap) => {
            if (snap.exists()) {
              const queueData = snap.data() || {};
              const rawCustomers = queueData.customers || [];

              const sanitizedCustomers: QueueCustomer[] = rawCustomers.map((customer: any) => ({
                name: customer.name || "Unknown Customer",
                phone: customer.phone || "No phone",
                services: Array.isArray(customer.services) ? customer.services : [],
                joinedAt: customer.joinedAt || new Date().toISOString()
              }));

              setCustomers(sanitizedCustomers);
              const isUserInQueue = sanitizedCustomers.some(
                (customer) => customer.phone === user.phone
              );
              setJoined(isUserInQueue);
            } else {
              setCustomers([]);
              setJoined(false);
            }
            setLoading(false);
          });
        } catch (error) {
          console.error("❌ Error loading queue info:", error);
          setLoading(false);
          Toast.error("Failed to load queue information");
        }
      };

      loadInfo();

      return () => {
        if (unsubscribe) unsubscribe();
        if (barberUnsubscribe) barberUnsubscribe();
      };
    }, [])
  );

  const handleJoinQueue = () => {
    if (!barberData) return;

    const isQueueOpen = barberData.status.toLowerCase() === "open";
    
    if (!isQueueOpen) {
      Toast.error("Queue is closed. Cannot join at this time.");
      return;
    }

    if (!barberData?.servicesPro?.length) {
      Toast.error("This barber has no services available");
      return;
    }
    
    setSelectedServices([]);
    setShowServiceModal(true);
  };

  const confirmJoinQueue = async () => {
    if (!userData || !barberPhone || selectedServices.length === 0) {
      Toast.error("Please select at least one service");
      return;
    }

    if (!barberData || barberData.status.toLowerCase() !== "open") {
      Toast.error("Queue is closed. Cannot join at this time.");
      setShowServiceModal(false);
      return;
    }

    try {
      const queueDocRef = doc(collection(db, "queue"), barberPhone);
      const queueSnap = await getDoc(queueDocRef);

      const newCustomer: QueueCustomer = {
        name: userData.fullName,
        phone: userData.phone,
        services: selectedServices,
        joinedAt: new Date().toISOString()
      };

      if (queueSnap.exists()) {
        const currentCustomers = (queueSnap.data() as { customers?: QueueCustomer[] })?.customers || [];
        const alreadyExists = currentCustomers.some(
          (customer: QueueCustomer) => customer.phone === userData.phone
        );

        if (!alreadyExists) {
          await updateDoc(queueDocRef, {
            customers: [...currentCustomers, newCustomer]
          });
        } else {
          Toast.error("You're already in the queue");
          setShowServiceModal(false);
          return;
        }
      } else {
        await setDoc(queueDocRef, {
          customers: [newCustomer],
          barberUID: barberPhone,
          createdAt: new Date().toISOString()
        });
      }

      setShowServiceModal(false);
      Toast.success("You've joined the queue!");
    } catch (error) {
      console.error("❌ Error joining queue:", error);
      Toast.error("Failed to join queue. Please try again.");
    }
  };

  const handleExitQueue = () => {
    showActionToast({
      message: "Exit from queue?",
      onConfirm: async () => {
        try {
          const queueDocRef = doc(collection(db, "queue"), barberPhone);
          const queueSnap = await getDoc(queueDocRef);

          if (queueSnap.exists()) {
            const queueData = queueSnap.data() as { customers?: QueueCustomer[] } || {};
            const currentCustomers = queueData.customers || [];
            const updatedCustomers = currentCustomers.filter(
              (customer: QueueCustomer) => customer.phone !== userData?.phone
            );

            await updateDoc(queueDocRef, { customers: updatedCustomers });
            Toast.success("You've left the queue");
          }
        } catch (error) {
          console.error("Error leaving queue:", error);
          Toast.error("Failed to leave queue");
        }
      },
    });
  };

  const toggleService = (service: string) => {
    setSelectedServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
    );
  };

  const getUserPosition = (): number => {
    if (!userData) return -1;
    return customers.findIndex((customer) => customer.phone === userData.phone) + 1;
  };

  const isQueueOpen = barberData?.status.toLowerCase() === "open";

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleWrapper}>
            <Animated.View style={styles.skeletonStoreName} />
            <Animated.View style={styles.skeletonBarberName} />
          </View>
        </View>
        <View style={styles.queueHeader}>
          <Animated.View style={styles.skeletonQueueStats} />
        </View>
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </ScrollView>
        <View style={styles.actionContainer}>
          <Animated.View style={styles.skeletonButton} />
        </View>
      </SafeAreaView>
    );
  }

  if (!barberData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.loadingText}>Barber information not available</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace("/customer_home")} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#454545" />
        </TouchableOpacity>
        <View style={styles.titleWrapper}>
          <Text style={styles.storeName}>{barberData.storeName}</Text>
          <Text style={styles.barberName}>{barberData.fullName}</Text>
        </View>
      </View>

      <View style={styles.queueHeader}>
        <View style={styles.queueStats}>
          <Ionicons name="people" size={20} color="#454545" />
          <Text style={styles.queueStatsText}>{customers.length} waiting</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: isQueueOpen ? "#dcfce7" : "#fee2e2" }]}>
          <View style={[styles.statusDot, { backgroundColor: isQueueOpen ? "#22c55e" : "#ef4444" }]} />
          <Text style={[styles.statusText, { color: isQueueOpen ? "#166534" : "#991b1b" }]}>
            {isQueueOpen ? "Queue Open" : "Queue Closed"}
          </Text>
        </View>
      </View>

      {!isQueueOpen && (
        <View style={styles.closedWarningContainer}>
          <Ionicons name="alert-circle" size={32} color="#dc2626" />
          <Text style={styles.closedWarningTitle}>Queue is Currently Closed</Text>
          </View>
      )}

      {customers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="checkmark-circle" size={64} color="#4CAF50" />
          <Text style={styles.emptyTitle}>Queue is Empty</Text>
          <Text style={styles.emptyText}>
            {isQueueOpen ? "Be the first to join!" : "Queue is closed"}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {customers.map((customer, index) => (
            <View key={customer.phone} style={styles.customerCardWrapper}>
              <View style={[
                styles.customerCard,
                customer.phone === userData?.phone && styles.userCard
              ]}>
                <View style={styles.leftSection}>
                  <View style={[
                    styles.positionBadge,
                    customer.phone === userData?.phone && styles.userPositionBadge
                  ]}>
                    <Text style={[
                      styles.positionText,
                      customer.phone === userData?.phone && styles.userPositionText
                    ]}>
                      {index + 1}
                    </Text>
                  </View>
                  <View style={styles.customerDetails}>
                    <View style={styles.nameWithBadge}>
                      {index === 0 && (
                        <View style={styles.nowBadge}>
                          <Text style={styles.nowBadgeText}>NOW</Text>
                        </View>
                      )}
                      <Text style={styles.customerName}>{customer.name}</Text>
                    </View>
                    <Text style={styles.phoneText}>{formatPhoneNumber(customer.phone)}</Text>
                    <View style={styles.divider} />
                    <View style={styles.timeRow}>
                      <Ionicons name="time-outline" size={16} color="#454545" />
                      <Text style={styles.timeLabel}>Waiting:</Text>
                      <Text style={styles.timeValue}>{calculateWaitTime(customer.joinedAt)}</Text>
                    </View>
                    <View style={styles.timeRow}>
                      <Ionicons name="calendar-outline" size={16} color="#454545" />
                      <Text style={styles.timeLabel}>Joined:</Text>
                      <Text style={styles.timeValue}>{formatTime(customer.joinedAt)}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.rightSection}>
                  {customer.services.map((service, idx) => (
                    <View key={idx} style={styles.serviceChip}>
                      <Text style={styles.serviceChipText}>{service}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <View style={styles.actionContainer}>
        {!joined ? (
          <View>
            <Text style={styles.actionHint}>
              {isQueueOpen ? "Tap to enter the queue" : "Queue is closed"}
            </Text>
            <TouchableOpacity
              style={[styles.joinButton, !isQueueOpen && styles.disabledButton]}
              onPress={handleJoinQueue}
              disabled={!isQueueOpen}
            >
              <Ionicons name="add-circle-outline" size={20} color={isQueueOpen ? "#0a0a0f" : "#9ca3af"} />
              <Text style={[styles.joinButtonText, !isQueueOpen && styles.disabledButtonText]}>Join Queue</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Text style={styles.actionHint}>Your Position: {getUserPosition()}</Text>
            <TouchableOpacity
              style={styles.exitButton}
              onPress={handleExitQueue}
            >
              <Ionicons name="exit-outline" size={20} color="#F44336" />
              <Text style={styles.exitButtonText}>Exit Queue</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Modal
        visible={showServiceModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowServiceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Services</Text>
            <Text style={styles.modalSubtitle}>Choose the services you need</Text>
            <ScrollView style={styles.servicesScrollView}>
              {barberData.servicesPro.map((service, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.serviceOption,
                    selectedServices.includes(service) && styles.selectedServiceOption
                  ]}
                  onPress={() => toggleService(service)}
                >
                  <Text
                    style={[
                      styles.serviceOptionText,
                      selectedServices.includes(service) && styles.selectedServiceText
                    ]}
                  >
                    {service}
                  </Text>
                  {selectedServices.includes(service) && (
                    <Ionicons name="checkmark-circle" size={24} color="#454545ff" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowServiceModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={confirmJoinQueue}
              >
                <Text style={styles.confirmButtonText}>Join</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 18,
    color: "#64748b",
    fontWeight: "600",
  },
  skeletonStoreName: {
    width: 180,
    height: 28,
    backgroundColor: "#e2e8f0",
    borderRadius: 8,
    marginBottom: 8,
  },
  skeletonBarberName: {
    width: 120,
    height: 16,
    backgroundColor: "#f1f5f9",
    borderRadius: 6,
  },
  skeletonQueueStats: {
    width: 100,
    height: 20,
    backgroundColor: "#dbeafe",
    borderRadius: 8,
  },
  skeletonCardWrapper: {
    marginBottom: 14,
  },
  skeletonCard: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#e8edf2",
    elevation: 4,
  },
  skeletonPositionBadge: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 35,
    height: 35,
    backgroundColor: "#e2e8f0",
    borderBottomRightRadius: 16,
  },
  skeletonName: {
    width: 140,
    height: 20,
    backgroundColor: "#e2e8f0",
    borderRadius: 6,
    marginBottom: 8,
  },
  skeletonPhone: {
    width: 90,
    height: 12,
    backgroundColor: "#f1f5f9",
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonTime: {
    width: 110,
    height: 14,
    backgroundColor: "#dbeafe",
    borderRadius: 4,
    marginBottom: 6,
  },
  skeletonService: {
    width: "80%",
    height: 24,
    backgroundColor: "#dbeafe",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  skeletonButton: {
    width: "100%",
    height: 48,
    backgroundColor: "#dbeafe",
    borderRadius: 12,
  },
 header: {
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#ffffff",
    elevation: 6,
    borderWidth:1.5,
    borderColor:"#e2e8f0",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backButton: {
    position: "absolute",
    left: 16,
    top: "50%",
    transform: [{ translateY: -12 }],
    backgroundColor: "#eff6ff",
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  titleWrapper: {
    alignItems: "center",
  },
  storeName: {
    fontSize: 28,
    fontWeight: "800",
    color: "#3c3c3cff",
    letterSpacing: 1,
    marginBottom: 4,
  },
  barberName: {
    fontSize: 16,
    color: "#4d4d4dff",
    fontWeight: "600",
  },
queueHeader: {
  flexDirection: "row",  
  paddingTop: 12,
  alignItems: "center",  
  justifyContent: "center",
  gap:10, 
},

  queueStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  queueStatsText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#060606ff",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  closedWarningContainer: {
    backgroundColor: "#fef2f2",
    borderWidth: 2,
    borderColor: "#fecaca",
    borderRadius: 12,
    padding: 6,
    marginHorizontal: 16,
    marginVertical: 12,
    alignItems: "center",
    elevation: 2,
  },
  closedWarningTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#dc2626",
    margin:6,
    textAlign: "center",
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
    color: "#1a1d29",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  customerCardWrapper: {
    marginBottom: 14,
  },
  customerCard: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#e8edf2",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  userCard: {
    borderColor: "#2563eb",
    borderWidth: 3,
    elevation: 2,
    shadowColor:"#000000ff",
  },
  leftSection: {
    width: "65%",
    position: "relative",
  },
  rightSection: {
    width: "35%",
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 8,
  },
  positionBadge: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 35,
    height: 35,
    backgroundColor: "#1e293b",
    justifyContent: "center",
    alignItems: "center",
    borderBottomRightRadius: 16,
    zIndex: 5,
  },
  userPositionBadge: {
    backgroundColor: "#2563eb",
  },
  positionText: {
    fontSize: 24,
    fontWeight: "900",
    color: "#ffffff",
  },
  userPositionText: {
    color: "#ffffff",
  },
  customerDetails: {
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 64,
    paddingRight: 12,
  },
  nameWithBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  nowBadge: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    elevation: 3,
  },
  nowBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: 0.3,
  },
  customerName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1a1d29",
    letterSpacing: 0.3,
  },
  phoneText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 8,
  },
  serviceChip: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    alignSelf: "flex-start",
  },
  serviceChipText: {
    fontSize: 12,
    color: "#002982ff",
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#e8edf2",
    marginVertical: 8,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  timeLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
  },
  timeValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1a1d29",
  },
  actionContainer: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e8edf2",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 8,
  },
  actionHint: {
    fontSize: 16,
    fontWeight: "700",
    color: "#64748b",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  joinButton: {
    flexDirection: "row",
    backgroundColor: "#2563eb",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    elevation: 2,
    borderWidth: 0.7,
    borderColor: "#a0a0a0ff",
    shadowColor: "#525252ff",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  disabledButton: {
    backgroundColor: "#e5e7eb",
    elevation: 0,
    shadowOpacity: 0,
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  disabledButtonText: {
    color: "#9ca3af",
  },
  exitButton: {
    flexDirection: "row",
    backgroundColor: "#f59494ff",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 0.5,
    elevation: 3,
    borderColor: "#878787ff",
  },
  exitButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffffff",
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: width * 0.9,
    maxWidth: 400,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 28,
    elevation: 15,
    borderWidth: 1.5,
    borderColor: "#e8edf2",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2563eb",
    marginBottom: 8,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: "center",
    color: "#64748b",
    marginBottom: 20,
    fontWeight: "500",
  },
  servicesScrollView: {
    maxHeight: 300,
    marginBottom: 20,
  },
  serviceOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#e8edf2",
    marginBottom: 10,
    backgroundColor: "#f8fafc",
  },
  selectedServiceOption: {
    borderColor: "#2563eb",
    backgroundColor: "#eff6ff",
  },
  serviceOptionText: {
    fontSize: 16,
    color: "#1a1d29",
    flex: 1,
    fontWeight: "600",
  },
  selectedServiceText: {
    color: "#2563eb",
    fontWeight: "700",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.5,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: "#2563eb",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    elevation: 6,
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: 0.5,
  },
});