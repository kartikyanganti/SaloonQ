import NetworkMonitor from "@/components/NetworkMonitor";
import { Stack } from "expo-router";
import React from "react";
import GlobalActionToast from "../components/GlobalActionToast";
import ToastContainer from "../components/ToastContainer";

export default function StackLayout() {
  return (
    <NetworkMonitor>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
      </Stack>

      {/* Global Toast Container - must be at root level */}
      <ToastContainer />

      {/* Global Action Toast */}
      <GlobalActionToast />
    </NetworkMonitor>
  );
}