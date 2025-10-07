import { Toast } from '@/components/ToastContainer';
import { firestore } from "@/firebase";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, onSnapshot } from "@react-native-firebase/firestore";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { FlatList, Linking, Pressable, StyleSheet, TextInput, View } from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

type Barber = {
  uid: string;
  phone: string;
  fullName: string;
  storeName: string;
  status: string;
  location?: string;
  servicesPro?: string[];
};

export default function CustomerHome() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useFocusEffect(
    useCallback(() => {
      const clearSelectedBarber = async () => {
        try {
          await AsyncStorage.multiRemove([
            "selectedBarberUID",
            "selectedBarberPhone",
            "selectedBarberStoreName",
            "selectedBarberFullName",
          ]);
          console.log("Previous barber selection cleared");
        } catch (error) {
          console.error("Error clearing barber selection:", error);
        }
      };
      clearSelectedBarber();
    }, [])
  );

  useEffect(() => {
    const barbersCollection = collection(firestore, "barber");

    const unsubscribe = onSnapshot(
      barbersCollection,
      (snapshot) => {
        const barberList: Barber[] = snapshot.docs.map((doc: any) => {
          const data = doc.data();
          return {
            uid: doc.id,
            phone: data.phone || "No phone",
            fullName: data.fullName || "Unknown Name",
            storeName: data.storeName || "Unknown Store",
            status: data.status || "closed",
            location: data.location || "",
            servicesPro: Array.isArray(data.servicesPro) ? data.servicesPro : [],
          };
        });

        console.log(`Loaded ${barberList.length} barbers from Firestore`);
        setBarbers(barberList);
      },
      (error) => {
        console.error("Error fetching barbers:", error);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleSelect = async (barber: Barber) => {
    const hasServices = barber.servicesPro && barber.servicesPro.length > 0;

    if (!hasServices) {
      Toast.info(`${barber.storeName} has no services`);
      return;
    }

    try {
      await AsyncStorage.multiRemove([
        "selectedBarberUID",
        "selectedBarberPhone",
        "selectedBarberStoreName",
        "selectedBarberFullName",
      ]);

      await AsyncStorage.multiSet([
        ["selectedBarberUID", barber.uid],
        ["selectedBarberPhone", barber.phone],
        ["selectedBarberStoreName", barber.storeName],
        ["selectedBarberFullName", barber.fullName],
      ]);

      console.log(`Selected barber: ${barber.fullName} (UID: ${barber.uid})`);
      router.replace("./cust_queue");
    } catch (error) {
      console.error("Error selecting barber:", error);
      Toast.error("Failed to select barber");
    }
  };

  const openLocation = (location: string) => {
    if (!location) {
      Toast.error("Location not available");
      return;
    }

    Linking.openURL(location)
      .catch(() => {
        Toast.error("Could not open maps");
      });
  };

  // Filter barbers based on search query
  const filteredBarbers = barbers.filter((barber) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    
    return (
      barber.storeName.toLowerCase().includes(query) ||
      barber.fullName.toLowerCase().includes(query)
    );
  });

  const renderItem = ({ item }: { item: Barber }) => {
    const isOpen = item.status.toLowerCase() === "open";
    const hasServices = item.servicesPro && item.servicesPro.length > 0;
    const statusColor = isOpen ? "#2195f4ff" : "#ef4444";
    
    // Sort services by length (shorter first) and show max 5
    const maxServices = 5;
    const sortedServices = item.servicesPro 
      ? [...item.servicesPro].sort((a, b) => a.length - b.length)
      : [];
    const visibleServices = sortedServices.slice(0, maxServices);
    const remainingCount = sortedServices.length - maxServices;

    return (
      <Pressable
        onPress={() => handleSelect(item)}
        style={({ pressed }) => [
          styles.card,
          pressed && styles.cardPressed,
        ]}
      >
        {/* Status Color Indicator */}
        <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />

        {/* Card Content */}
        <View style={styles.cardContent}>
          {/* Left Side - Barber Info (60%) */}
          <View style={styles.barberInfo}>
            {/* Store Name with Icon */}
            <View style={styles.infoRow}>
              <Ionicons name="storefront" size={20} color="#000000" />
              <Text style={styles.storeName} numberOfLines={1}>{item.storeName}</Text>
            </View>

            {/* Barber Name with Icon */}
            <View style={styles.infoRow}>
              <Ionicons name="person" size={18} color="#475569" />
              <Text style={styles.barberName} numberOfLines={1}>{item.fullName}</Text>
            </View>

            {/* Location Button */}
            {item.location && (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  openLocation(item.location!);
                }}
                style={styles.locationButton}
              >
                <Ionicons name="location" size={14} color="#2563eb" />
                <Text style={styles.locationText}>View on Maps</Text>
              </Pressable>
            )}
          </View>

          {/* Right Side - Services (40%) */}
          <View style={styles.servicesContainer}>
            {hasServices ? (
              <>
                {visibleServices.map((service, index) => (
                  <View key={index} style={styles.serviceBadge}>
                    <Text style={styles.serviceBadgeText} numberOfLines={1}>{service}</Text>
                  </View>
                ))}
                {remainingCount > 0 && (
                  <View style={styles.moreBadge}>
                    <Text style={styles.moreBadgeText}>+{remainingCount}</Text>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.noServiceBadge}>
                <Text style={styles.noServiceText}>None</Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container} >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Barbers</Text>
      </View>
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by store or barber name..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery("")} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color="#64748b" />
          </Pressable>
        )}
      </View>

      {filteredBarbers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {searchQuery ? "No barbers found matching your search" : "No barbers available"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredBarbers}
          renderItem={renderItem}
          keyExtractor={(item) => item.uid}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },
  header: {
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: "#ffffff",
    elevation: 10,
    borderWidth:1.5,
    borderColor:"#e2e8f0",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#000000ff",
    letterSpacing: 1,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    marginHorizontal: "10%",
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    elevation: 2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1e293b",
    fontWeight: "500",
  },
  clearButton: {
    padding: 4,
  },
  list: {
    padding: 16,
    paddingBottom: 50,
    marginHorizontal: 14,
    borderColor: "#cbd5e1",
    borderWidth: 1,
    borderRadius: 16,
    elevation: 3,
    backgroundColor: "#f4f8ffff",
  },
  card: {
    flexDirection: "row",
    borderRadius: 16,
    marginBottom: 14,
    backgroundColor: "#ffffff",
    overflow: "hidden",
    elevation: 1,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    minHeight: 130,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
    elevation: 3,
  },
  statusIndicator: {
    width: "4%",
    shadowColor: "#000000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  cardContent: {
    flex: 1,
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#fafafa",
    gap: 12,
  },
  barberInfo: {
    width: "60%",
    justifyContent: "center",
    gap: 6,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  storeName: {
    fontSize: 18,
    fontWeight: "900",
    color: "#000000",
    letterSpacing: 0.3,
    flex: 1,
  },
  barberName: {
    fontSize: 15,
    color: "#475569",
    fontWeight: "700",
    flex: 1,
  },
  locationButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: "#eff6ff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    alignSelf: "flex-start",
    marginTop: 2,
  },
  locationText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563eb",
    letterSpacing: 0.3,
  },
  servicesContainer: {
    width: "40%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    alignContent: "center",
    gap: 5,
  },
  serviceBadge: {
    backgroundColor: "#dbeafe",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#93c5fd",
  },
  serviceBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#1e40af",
    textTransform: "uppercase",
    letterSpacing: 0.2,
  },
  moreBadge: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#fcd34d",
  },
  moreBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#92400e",
    letterSpacing: 0.2,
  },
  noServiceBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  noServiceText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    color: "#64748b",
    textAlign: "center",
    fontWeight: "600",
  },
});