//signUp Screen
import { TermsModal } from "@/Terms/TermsModal";
import { getApp } from "@react-native-firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
} from "@react-native-firebase/auth";
import {
  doc,
  getDoc,
  getFirestore,
  setDoc
} from "@react-native-firebase/firestore";

import MyInput from "@/components/MyInput";
import { Toast } from "@/components/ToastContainer";
import { UserData, UserStorage } from "@/utils/UserStorage";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

// 🔥 initialize once from native app
const app = getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export default function SignUp() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const validateSignupForm = () => {
    if (!fullName.trim()) {
      Toast.error("Please enter your full name");
      return false;
    }
    if (!email.trim()) {
      Toast.error("Please enter your email address");
      return false;
    }
    if (!phone.trim()) {
      Toast.error("Please enter your phone number");
      return false;
    }
    else if (!/^\d{10}$/.test(phone.trim())) {
      Toast.error("Phone number must be 10 digits");
      return false;
    }
    if (!password.trim()) {
      Toast.error("Please enter a password");
      return false;
    }
    if (!confirmPassword.trim()) {
      Toast.error("Please confirm your password");
      return false;
    }
    if (password !== confirmPassword) {
      Toast.error("Passwords don't match");
      return false;
    }
    if (!termsAccepted) {
      Toast.error("Please accept the Terms & Conditions and Privacy Policy");
      return false;
    }
    return true;
  };

  const saveUserToStorage = async (uid: string, email: string, fullName: string, phone: string) => {
    try {
      const userData: UserData = { uid, email, fullName, phone };
      await UserStorage.saveUserData(userData);
      console.log("✅ User data saved to AsyncStorage successfully");
    } catch (error) {
      console.error("❌ Failed to save user data:", error);
    }
  };

  const handleEmailSignup = async () => {
    try {
      setBusy(true);

      if (!validateSignupForm()) {
        setBusy(false);
        return;
      }

      // 🔍 Check if phone already exists (modular API)
      const phoneDocRef = doc(db, "phoneToMail", phone);
      const phoneDoc = await getDoc(phoneDocRef);

      if (phoneDoc.exists()) {
        Toast.error("This phone number is already registered. Please login instead.");
        setBusy(false);
        return;
      }

      // 👤 Create Firebase user (modular API)
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // 📝 Save user in Firestore (modular API)
      await setDoc(doc(db, "users", uid), {
        fullName,
        email,
        phone,
      });

      // 📱 Save phone → email mapping (modular API)
      await setDoc(doc(db, "phoneToMail", phone), {
        email,
      });

      // 💾 Save in AsyncStorage
      await saveUserToStorage(uid, email, fullName, phone);

      Toast.success("Account created successfully!");
      router.replace("/customer_home");
    } catch (err: any) {
      if (err?.code === "auth/email-already-in-use") {
        Toast.error("Account already exists, please login");
      }
      else if (
        err?.code === "auth/network-request-failed" ||
        err?.code === "unavailable" ||
        err?.code === "firebase/unavailable" ||
        err?.code === "firestore/unavailable"
      ) {
        Toast.error("No internet connection. Please check your network.");
      }
      else if (err?.code === "auth/missing-password") {
        Toast.error("Please enter a password.");
      }
      else if (err?.code === "auth/weak-password") {
        Toast.error("Password is too weak. Must be at least 6 characters.");
      }
      else if (err?.code === "auth/invalid-email") {
        Toast.error("Enter correct and valid email address");
      }
      else {
        Toast.error(err?.message || "Unknown error occurred");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0f" />

      <View style={styles.card}>
        <Text style={styles.title}>SaloonQ</Text>
        <Text style={styles.subtitle}>Create Account</Text>

        <View style={styles.inputGroup}>
          <MyInput placeholder="Full Name" value={fullName} onChangeText={setFullName} icon="person-outline" />
          <MyInput placeholder="Email Address" value={email} onChangeText={setEmail} keyboardType="email-address" icon="mail-outline" />
          <MyInput placeholder="Phone Number" value={phone} onChangeText={setPhone} keyboardType="numeric" icon="call-outline" />
          <MyInput placeholder="Password" value={password} onChangeText={setPassword} icon="lock-closed-outline" secureTextEntry />
          <MyInput placeholder="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} icon="lock-closed-outline" />
        </View>

        {/* Terms & Conditions Checkbox */}
        <View style={styles.termsContainer}>
          <Pressable
            style={styles.checkbox}
            onPress={() => setTermsAccepted(!termsAccepted)}
          >
            {termsAccepted && (
              <Ionicons name="checkmark" size={18} color="#2563eb" />
            )}
          </Pressable>
          <Text style={styles.termsText}>
            I agree to the{" "}
            <Text
              style={styles.termsLink}
              onPress={() => setShowTermsModal(true)}
            >
              Terms & Conditions and Privacy Policy
            </Text>
          </Text>
        </View>

        <Pressable style={styles.createButton} onPress={handleEmailSignup} disabled={busy}>
          {busy ? <ActivityIndicator color="#000" size="small" /> : <Text style={styles.createButtonText}>Create Account</Text>}
        </Pressable>

        <Pressable style={styles.loginButton} onPress={() => router.push("/login")}>
          <Text style={styles.loginText}>Already have an account? Login</Text>
        </Pressable>
      </View>

      {/* Terms Modal */}
      <TermsModal
        visible={showTermsModal}
        onClose={() => setShowTermsModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#cececeff",
    alignItems: "center",
    justifyContent: "center",
    padding: 16
  },
  card: {
    width: Math.min(width - 32, 400),
    padding: 20,
    borderRadius: 28,
    backgroundColor: "#ffffff",
    elevation: 10,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    borderWidth: 1.5,
    borderColor: "#e8edf2",
  },
  title: {
    color: "#1a1d29",
    fontSize: 32,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 4
  },
  subtitle: {
    color: "#64748b",
    fontSize: 20,
    textAlign: "center",
    marginBottom: 16
  },
  inputGroup: {
    gap: 14,
    marginBottom: 14
  },
  termsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    marginHorizontal: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: "#cbd5e1",
    borderRadius: 6,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: "#475569",
    lineHeight: 20,
  },
  termsLink: {
    color: "#2563eb",
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  createButton: {
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    backgroundColor: "#2563eb",
    elevation: 4,
    marginHorizontal: 10,
    shadowColor: "#000000ff",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderColor: "#e4e4e4ff",
    borderWidth: 1,
  },
  createButtonText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0.8
  },
  loginText: {
    color: "#475569",
    fontSize: 16,
    fontWeight: "600",
  },
  loginButton: {
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderColor: "#cbd5e1",
    borderWidth: 1.5,
    elevation: 2,
    marginHorizontal: 10,
    backgroundColor: "#ffffff",
  }
});