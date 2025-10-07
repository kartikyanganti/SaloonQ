// cust_queue.tsx
import ToastContainer, { Toast } from '@/components/ToastContainer';
import { UserData, UserStorage } from "@/utils/UserStorage";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { showActionToast } from "@/components/GlobalActionToast";
import {
  Alert,
  Dimensions,
  Modal,
  Pressable,
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
const db = getFirestore(); // Modular Firestore instance

export default function CustomerQueue() {
  const [barberPhone, setBarberPhone] = useState("");
  const [barberData, setBarberData] = useState<BarberData | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [joined, setJoined] = useState(false);
  const [customers, setCustomers] = useState<QueueCustomer[]>([]);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const maskPhone = (phone: string): string => {
    if (phone.length < 4) return phone;
    const first2 = phone.substring(0, 2);
    const last2 = phone.substring(phone.length - 2);
    const middle = "X".repeat(phone.length - 4);
    return `${first2}${middle}${last2}`;
  };

  useFocusEffect(
    useCallback(() => {
      let unsubscribe: (() => void) | null = null;

      const loadInfo = async () => {
        try {
          const user = await UserStorage.getUserData();
          if (!user) {
            Alert.alert("Error", "Please login first");
            return;
          }
          setUserData(user);

          const barberUID = await AsyncStorage.getItem("selectedBarberUID");
          if (!barberUID) {
            Alert.alert("Error", "No barber selected");
            return;
          }
          setBarberPhone(barberUID);

          console.log(`📋 Loading barber data for UID: ${barberUID}`);

          const barberDocRef = doc(collection(db, "barber"), barberUID);
          const barberSnap = await getDoc(barberDocRef);

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
            Alert.alert("Error", "Barber not found");
            return;
          }

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
          Alert.alert("Error", "Failed to load queue information");
        }
      };

      loadInfo();

      return () => {
        if (unsubscribe) unsubscribe();
      };
    }, [])
  );

  const handleJoinQueue = () => {
    if (!barberData?.servicesPro?.length) {
      Alert.alert("No Services", "This barber has no services available");
      return;
    }
    setSelectedServices([]);
    setShowServiceModal(true);
  };

  const confirmJoinQueue = async () => {
    if (!userData || !barberPhone || selectedServices.length === 0) {
      Toast.info("Please select at least one service");
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
          Toast.info("You're already in the queue");
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
    Alert.alert("Exit Queue", "Are you sure you want to leave the queue?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Yes, Leave",
        style: "destructive",
        onPress: async () => {
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
        }
      }
    ]);
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.loadingText}>Loading queue...</Text>
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
        {/* Back button */}
        <Pressable onPress={() => router.replace("/customer_home")} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>

        {/* Titles */}
        <View style={styles.titleWrapper}>
          <Text style={styles.storeName}>{barberData.storeName}</Text>
          <Text style={styles.barberName}>{barberData.fullName}</Text>
        </View>
      </View>


      <Text style={styles.queueTitle}>Queue of {customers.length} customers</Text>

      <View style={styles.queueWrapper}>
        <ScrollView style={styles.queueContainer}>
          {customers.length === 0 ? (
            <View style={styles.emptyQueue}>
              <Text style={styles.emptyText}>No customers in queue</Text>
            </View>
          ) : (
            customers.map((customer, index) => (
              <View 
                key={customer.phone} 
                style={[
                  styles.customerCard,
                  // Highlight user's own card with light yellow border
                  customer.phone === userData?.phone && styles.userCard
                ]}
              >
                <View style={styles.customerRow}>
                  <View style={styles.customerInfo}>
                    <Text style={styles.positionText}>#{index + 1}</Text>
                    <Text style={styles.customerName}>{customer.name}</Text>
                    <Text style={styles.customerPhone}>
                      {maskPhone(customer.phone)}
                    </Text>
                  </View>
                  <View style={styles.servicesContainer}>
                    {customer.services.map((service, idx) => (
                      <View key={idx} style={styles.serviceChip}>
                        <Text style={styles.serviceChipText}>{service}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>



      <View style={styles.actionContainer}>
        {!joined ? (
          <View>
            <View style={{ alignItems: "center", marginVertical: 8 }}>
              <Text style={styles.tokenText}>Tap Join to enter queue</Text>
            </View>
            <TouchableOpacity
              style={styles.joinButton}
              onPress={handleJoinQueue}
            >
              <Text style={styles.joinButtonText}>Join Queue</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <View style={{ alignItems: "center", marginVertical: 8 }}>
              {joined && (
                <Text style={styles.tokenText}>Your Position: #{getUserPosition()}</Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.exitButton}
              onPress={handleExitQueue}
            >
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
            <Text style={styles.modalSubtitle}>
              Choose the services you need
            </Text>

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
                    <Text style={styles.checkMark}>✓</Text>
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
                <Text style={styles.confirmButtonText}>Join Queue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <ToastContainer />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0f",
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 18,
    color: "#9aa0a6",
    fontWeight: "600",
    letterSpacing: 1,
  },
  header: {
    backgroundColor: "rgba(18, 18, 22, 0.95)",
    padding: 16,
    alignItems: "center",
    borderBottomWidth: 1.5,
    borderBottomColor: "rgba(255,255,255,0.08)",
    elevation: 20,
    shadowColor: "#9a9a9a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    position: "relative", // allow absolute children
  },

  backButton: {
    position: "absolute",
    left: 16,
    top: "50%",
    transform: [{ translateY: -12 }], // vertically center
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: 8,
    borderRadius: 20,
  },

  titleWrapper: {
    alignItems: "center",
  },


  titleContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },

  storeName: {
    fontSize: 30,
    fontWeight: "800",
    color: "#ebfb70",
    letterSpacing: 0.5,
  },

  barberName: {
    fontSize: 22,
    color: "#ffffff",
    fontWeight: "600",
  },

  waitingCount: {
    fontSize: 12,
    color: "#9aa0a6",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tokenText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#e2e3ddff",
    letterSpacing: 0.5,
    textAlign: "center",
  },

  queueTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffff",
    textAlign: "center",
    marginTop: 10,
  },
  queueWrapper: {
    flex: 1,
    margin: 16,
    borderRadius: 20,
    backgroundColor: "rgba(18, 18, 22, 0.95)",
    elevation: 10,
    shadowColor: "#9a9a9a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  queueContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  emptyQueue: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    color: "#9aa0a6",
    textAlign: "center",
    fontWeight: "600",
    letterSpacing: 0.5,
    lineHeight: 24,
  },
  customerCard: {
    borderRadius: 20,
    marginBottom: 12,
    backgroundColor: "rgba(18, 18, 22, 0.95)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.08)",
  },
  // New style for user's own card with light yellow border
  userCard: {
    borderColor: "#FFEB3B", // Light yellow border
    backgroundColor: "rgba(255, 235, 59, 0.05)", // Subtle yellow background
  },
  customerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
  },
  customerInfo: {
    flex: 1,
    marginRight: 12,
  },
  positionText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#ebfb70",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  customerName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  customerPhone: {
    fontSize: 12,
    color: "#9aa0a6",
    fontWeight: "500",
  },
  servicesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    maxWidth: width * 0.4,
  },
  serviceChip: {
    backgroundColor: "rgba(235, 251, 112, 0.2)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    margin: 2,
    borderWidth: 1,
    borderColor: "rgba(235, 251, 112, 0.3)",
  },
  serviceChipText: {
    fontSize: 9,
    color: "#ebfb70",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  actionContainer: {
    paddingHorizontal: 16,

    backgroundColor: "rgba(18, 18, 22, 0.95)",
    borderTopWidth: 1.5,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  joinButton: {
    backgroundColor: "#ebfb70",
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    elevation: 8,
    shadowColor: "#ebfb70",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0a0a0f",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  exitButton: {
    backgroundColor: "rgba(244, 67, 54, 0.2)",
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#F44336",
    elevation: 8,
  },
  exitButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#F44336",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "rgba(18, 18, 22, 0.98)",
    borderRadius: 28,
    padding: 24,
    width: width * 0.9,
    maxHeight: "80%",
    elevation: 20,
    shadowColor: "#9a9a9a",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.5,
    shadowRadius: 32,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.08)",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
    color: "#ebfb70",
    letterSpacing: 1,
  },
  modalSubtitle: {
    fontSize: 16,
    textAlign: "center",
    color: "#9aa0a6",
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
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 12,
    backgroundColor: "rgba(255, 255, 255, 0.02)",
  },
  selectedServiceOption: {
    borderColor: "#ebfb70",
    backgroundColor: "rgba(235, 251, 112, 0.1)",
  },
  serviceOptionText: {
    fontSize: 16,
    color: "#ffffff",
    flex: 1,
    fontWeight: "600",
  },
  selectedServiceText: {
    color: "#ebfb70",
    fontWeight: "700",
  },
  checkMark: {
    fontSize: 18,
    color: "#ebfb70",
    fontWeight: "800",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.1)",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#9aa0a6",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  confirmButton: {
    flex: 1,
    backgroundColor: "#ebfb70",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    elevation: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0a0a0f",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});