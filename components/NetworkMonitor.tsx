import { Ionicons } from "@expo/vector-icons";
import NetInfo from "@react-native-community/netinfo";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  View,
} from "react-native";

interface NetworkMonitorProps {
  children: React.ReactNode;
}

const NetworkMonitor: React.FC<NetworkMonitorProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = state.isConnected && state.isInternetReachable !== false;
      setIsConnected(connected);
      
      if (!connected) {
        // Show overlay
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      } else if (connected && isConnected === false) {
        // Hide overlay (only if previously disconnected)
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    });

    return () => unsubscribe();
  }, [isConnected]);

  return (
    <>
      {children}
      
      {/* Blocking Overlay when offline */}
      {isConnected === false && (
        <Animated.View
          style={[
            styles.overlay,
            { opacity: fadeAnim },
          ]}
          pointerEvents="auto"
        >
          <View style={styles.blockingLayer}>
            <View style={styles.content}>
              <View style={styles.iconContainer}>
                <Ionicons name="cloud-offline-outline" size={80} color="#ffffffff" />
              </View>
              
              <Text style={styles.title}>No Internet Connection</Text>
              <Text style={styles.message}>
                Please check your internet connection and try again
              </Text>
              
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#ef4444" />
                <Text style={styles.loaderText}>Waiting for connection...</Text>
              </View>
            </View>
          </View>
        </Animated.View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
  },
  blockingLayer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  content: {
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
  },
  iconContainer: {
    marginBottom: 24,
    backgroundColor: "rgba(255, 0, 0, 0.53)",
    borderRadius: 100,
    padding: 30,
  },
  title: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 12,
  },
  message: {
    color: "#d1d5db",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  loaderContainer: {
    alignItems: "center",
    gap: 16,
  },
  loaderText: {
    color: "#9ca3af",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default NetworkMonitor;