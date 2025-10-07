import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const { width, height } = Dimensions.get("window");

interface TermsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function TermsModal({ visible, onClose }: TermsModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Terms & Privacy Policy</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={20} color="#1a1d29" />
            </Pressable>
          </View>

          {/* Scrollable Content */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
          >
            <Text style={styles.heading}>SaloonQ User Agreement & Privacy Policy</Text>
            
            <Text style={styles.metaInfo}>
              Developer: Kartik Yanganti | Country: India | App: SaloonQ | Effective: October 2025
            </Text>

            <Text style={styles.sectionTitle}>1. Ownership</Text>
            <Text style={styles.paragraph}>
              The <Text style={styles.italic}>SaloonQ</Text> application ("App") is
              developed and owned by <Text style={styles.bold}>Kartik Yanganti</Text>.
              All rights to the app, its design, content, and features remain the
              property of the developer.
            </Text>

            <Text style={styles.sectionTitle}>2. Data Collection</Text>
            <Text style={styles.paragraph}>
              To use this app, users are required to provide basic information including:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletPoint}>• Name</Text>
              <Text style={styles.bulletPoint}>• Phone Number</Text>
              <Text style={styles.bulletPoint}>• Email Address</Text>
              <Text style={styles.bulletPoint}>• Password</Text>
            </View>
            <Text style={styles.paragraph}>
              This data is collected and securely stored in{" "}
              <Text style={styles.bold}>Firebase (Google Cloud)</Text> to allow users to
              log in, manage queues, and display relevant salon-related information.
            </Text>

            <Text style={styles.sectionTitle}>3. Public Information</Text>
            <Text style={styles.paragraph}>
              When a customer joins a barber's queue:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletPoint}>
                • The <Text style={styles.bold}>customer's name</Text> may be visible to
                other users in that queue.
              </Text>
              <Text style={styles.bulletPoint}>
                • The <Text style={styles.bold}>token/position number</Text> is visible
                only to the joined customer and the respective barber.
              </Text>
            </View>
            <Text style={styles.paragraph}>
              No other personal details (like phone or email) are publicly shown.
            </Text>

            <Text style={styles.sectionTitle}>4. Use of Data</Text>
            <Text style={styles.paragraph}>
              The collected data is used <Text style={styles.bold}>only for app
              functionality</Text> — such as user login, queue display, and communication
              within the app. The developer{" "}
              <Text style={styles.bold}>does not sell, share, or misuse</Text> any user
              information.
            </Text>

            <Text style={styles.sectionTitle}>5. Security</Text>
            <Text style={styles.paragraph}>
              All user data is stored securely in Firebase and handled with reasonable
              protection measures. However, users understand that no online platform is
              completely risk-free.
            </Text>

            <Text style={styles.sectionTitle}>6. User Consent</Text>
            <Text style={styles.paragraph}>
              By creating an account or using the app, you{" "}
              <Text style={styles.bold}>consent to the collection and use</Text> of your
              data as described in this policy.
            </Text>

            <Text style={styles.sectionTitle}>7. Updates</Text>
            <Text style={styles.paragraph}>
              The developer may update this policy or the app at any time. Continued use
              means you agree to any updated terms.
            </Text>

            <Text style={styles.sectionTitle}>8. Contact</Text>
            <Text style={styles.paragraph}>
              For any concerns, corrections, or deletion requests, contact:
            </Text>
            <Text style={styles.contactEmail}>📧 kartikyanganti1@gmail.com</Text>

            <Text style={styles.copyright}>
              © 2025 Kartik Yanganti. All rights reserved.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: Math.min(width - 40, 500),
    height: height * 0.85,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    overflow: "hidden",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#2563eb",
    borderBottomWidth: 1,
    borderBottomColor: "#1d4ed8",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
    flex: 1,
  },
  closeButton: {
    padding: 4,
    backgroundColor: "#ffffff",
    borderRadius: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 20,
  },
  heading: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1a1d29",
    textAlign: "center",
    marginBottom: 12,
  },
  metaInfo: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1a1d29",
    marginTop: 18,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 15,
    color: "#475569",
    lineHeight: 24,
    marginBottom: 12,
    textAlign: "justify",
  },
  bulletList: {
    marginLeft: 10,
    marginBottom: 12,
  },
  bulletPoint: {
    fontSize: 15,
    color: "#475569",
    lineHeight: 24,
    marginBottom: 6,
  },
  bold: {
    fontWeight: "700",
    color: "#1a1d29",
  },
  italic: {
    fontStyle: "italic",
  },
  contactEmail: {
    fontSize: 15,
    color: "#2563eb",
    fontWeight: "600",
    marginTop: 8,
    marginBottom: 20,
  },
  copyright: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    marginTop: 30,
    marginBottom: 10,
    fontStyle: "italic",
  },
});

export { TermsModal };
