import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export interface ActionToastProps {
  message: string;
  duration?: number; // ms
  onConfirm?: () => void;
  onClose?: () => void;
}

const ActionToast: React.FC<ActionToastProps> = ({
  message,
  duration = 5000,
  onConfirm,
  onClose,
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(200)).current;
  const progressLeft = useRef(new Animated.Value(0)).current;
  const progressRight = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        tension: 65,
        friction: 9,
        useNativeDriver: true,
      }),
    ]).start();

    // Progress bar animates from center (50%) to both ends (0% and 100%)
    Animated.parallel([
      Animated.timing(progressLeft, {
        toValue: 50,
        duration,
        useNativeDriver: false,
      }),
      Animated.timing(progressRight, {
        toValue: 50,
        duration,
        useNativeDriver: false,
      }),
    ]).start(() => {
      handleClose();
    });
  }, []);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 200,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose?.();
    });
  };

  return (
    <Animated.View
      style={[
        styles.toastWrapper,
        { opacity, transform: [{ translateY }] },
      ]}
    >
      <View style={styles.toast}>
        {/* Left side indicator - 0-5% */}
        <View style={styles.sideIndicator} />

        {/* Message area - 5-70% */}
        <View style={styles.messageContainer}>
          <Text style={styles.message}>{message}</Text>
        </View>

        {/* Close button container - 66-85% */}
        <View style={styles.buttonContainer}>
          <Pressable style={styles.closeButton} onPress={handleClose}>
            <Ionicons name="close" size={20} color="#ef4444" />
          </Pressable>
        </View>

        {/* Confirm button container - 85-100% */}
        {onConfirm && (
          <View style={styles.buttonContainer}>
            <Pressable style={styles.confirmButton} onPress={onConfirm}>
              <Ionicons name="checkmark" size={20} color="#22c55e" />
            </Pressable>
          </View>
        )}

        {/* Progress bar from center to both sides */}
        <View style={styles.progressContainer}>
          <Animated.View
            style={[
              styles.progressBarLeft,
              {
                width: progressLeft.interpolate({
                  inputRange: [0, 50],
                  outputRange: ["0%", "50%"],
                }),
              },
            ]}
          />
          <Animated.View
            style={[
              styles.progressBarRight,
              {
                width: progressRight.interpolate({
                  inputRange: [0, 50],
                  outputRange: ["0%", "50%"],
                }),
              },
            ]}
          />
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toastWrapper: {
    position: "absolute",
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 9999,
  },
  toast: {
    flexDirection: "row",
    borderRadius: 16,
    height: 80,
    backgroundColor: "#2a2a2a",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 16,
    width: "90%",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#848484ff",
  },
  sideIndicator: {
    width: "5%",
    height: "100%",
    backgroundColor: "#3b82f6",
  },
  messageContainer: {
    flex: 1,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  message: {
    color: "#d1d1d1ff",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  buttonContainer: {
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#454545",
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
  },
  confirmButton: {
    width: 50,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#454545",
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    marginRight: 6,
  },
  progressContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  progressBarLeft: {
    height: 4,
    backgroundColor: "#2563eb",
    borderRadius: -1,
  },
  progressBarRight: {
    height: 4,
    backgroundColor: "#2563eb",
    borderRadius: -1,
  },
});

export default ActionToast;