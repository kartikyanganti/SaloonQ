// barberAuth.tsx
import MyInput from "@/components/MyInput";
import { Toast } from '@/components/ToastContainer';
import { firestore } from "@/firebase";
import { BarberStorage } from "@/utils/BarberStorage";
import {
  getAuth,
  signInWithEmailAndPassword,
} from "@react-native-firebase/auth";
import { collection, doc, getDoc } from "@react-native-firebase/firestore";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

// TypeScript interfaces for better type safety
interface PhoneToEmailDoc {
  email: string;
}

interface BarberDoc {
  uid: string;
  email: string;
  fullName: string;
  phone: string;
  storeName: string;
  servicesPro: string[];
  status: string;
}

export default function BarberLoginModal() {
  // Get auth instance
  const auth = getAuth();

  // Login mode state
  const [loginMethod, setLoginMethod] = useState<"email" | "phone">("email");
  const [loginInput, setLoginInput] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [busy, setBusy] = useState(false);

  // Animation values
  const slideAnim = useRef(new Animated.Value(0)).current; // 0 for email, 1 for phone
  const inputFadeAnim = useRef(new Animated.Value(1)).current;

  // Animate when login method changes
  useEffect(() => {
    // Smooth slide animation
    Animated.timing(slideAnim, {
      toValue: loginMethod === "email" ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();

    // Subtle fade animation for input transition
    Animated.sequence([
      Animated.timing(inputFadeAnim, {
        toValue: 0.7,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(inputFadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [loginMethod, slideAnim, inputFadeAnim]);

  // Validation function
  const validateLoginForm = () => {
    if (!loginInput.trim()) {
      Toast.error(`Please enter your ${loginMethod === "email" ? "email address" : "phone number"}`);
      return false;
    }
    if (!loginPassword.trim()) {
      Toast.error("Please enter your password");
      return false;
    }
    return true;
  };

  // Handle Barber Login
  const handleBarberLogin = async () => {
    try {
      setBusy(true);

      // Validate login form
      if (!validateLoginForm()) {
        return;
      }

      let emailToUse = loginInput;
      let phoneExists = false;

      // If using phone login, fetch email first
      if (loginMethod === "phone") {
        const phoneToMailCollection = collection(firestore, "phoneToMail");
        const phoneDocRef = doc(phoneToMailCollection, loginInput);
        const phoneSnap = await getDoc(phoneDocRef);

        if (!phoneSnap.exists()) {
          // Phone number not found
          Toast.error("Barber account not found");
          return;
        }

        emailToUse = (phoneSnap.data() as PhoneToEmailDoc)?.email;
        phoneExists = true;
        console.log("✅ Found email for phone:", emailToUse);
      }

      // Attempt login with email and password
      try {
        const userCredential = await signInWithEmailAndPassword(auth, emailToUse, loginPassword);
        const uid = userCredential.user.uid;

        // Check if barber data exists in Firestore and save using BarberStorage
        const barberData = await BarberStorage.fetchAndSaveBarberData(uid);

        if (!barberData) {
          // Barber authenticated but no profile data
          Toast.error("Barber profile not found");
          return;
        }

        console.log("✅ Barber login successful:", uid);
        Toast.success("Login successful!");
        
        // Small delay to show success toast before navigation
        setTimeout(() => {
          router.replace("/barber_home");
        }, 500);

      } catch (authError: any) {
        // Handle different auth errors
        if (authError?.code === "auth/invalid-credential") {
          // For phone login, if phone exists but credentials are wrong, it's a password issue
          if (loginMethod === "phone" && phoneExists) {
            Toast.error("Incorrect password");
          } else {
            // For email login or phone not found
            Toast.error("Invalid credentials");
          }
          return;
        } else if (authError?.code === "auth/user-not-found" ||
          authError?.code === "auth/invalid-email") {
          Toast.error("Barber account not found");
          return;
        } else if (authError?.code === "auth/wrong-password") {
          Toast.error("Incorrect password");
          return;
        } else {
          throw authError; // Re-throw other errors
        }
      }

    } catch (err: any) {
      console.error("Barber Login Error:", err);
      Toast.error(err?.message || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  const renderLoginForm = () => (
    <View style={styles.inputGroup}>
      {/* Animated Toggle Container */}
      <View style={styles.toggleContainer}>
        {/* Animated sliding background */}
        <Animated.View
          style={[
            styles.slidingToggleBackground,
            {
              left: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['3%', '50%'],
              }),
              width: '50%',
            },
          ]}
        />

        <Pressable
          style={styles.toggleButton}
          onPress={() => setLoginMethod("email")}
        >
          <Animated.Text style={[
            styles.toggleText,
            {
              color: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['#000000', '#9aa0a6'],
              }),
            }
          ]}>
            <Text style={{
              fontWeight: loginMethod === "email" ? '700' : '600'
            }}>
              Email
            </Text>
          </Animated.Text>
        </Pressable>

        <Pressable
          style={styles.toggleButton}
          onPress={() => setLoginMethod("phone")}
        >
          <Animated.Text style={[
            styles.toggleText,
            {
              color: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['#9aa0a6', '#000000'],
              }),
            }
          ]}>
            <Text style={{
              fontWeight: loginMethod === "phone" ? '700' : '600'
            }}>
              Phone
            </Text>
          </Animated.Text>
        </Pressable>
      </View>

      {/* Animated Input Container */}
      <Animated.View style={{ opacity: inputFadeAnim, gap: 14 }}>
        <MyInput
          placeholder={loginMethod === "email" ? "Email Address" : "Phone Number"}
          value={loginInput}
          onChangeText={setLoginInput}
          keyboardType={loginMethod === "email" ? "email-address" : "numeric"}
          icon={loginMethod === "email" ? "mail-outline" : "call-outline"}
        />
        <MyInput
          placeholder="Password"
          value={loginPassword}
          onChangeText={setLoginPassword}
          icon="lock-closed-outline"
          secureTextEntry={true}
        />
      </Animated.View>
    </View>
  );

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0f" />

      <View style={styles.card}>
        <Text style={styles.title}>Barber Login</Text>
        <Text style={styles.subtitle}>Sign in to your barber account</Text>

        {/* Form */}
        {renderLoginForm()}

        {/* Login Button */}
        <Pressable
          style={styles.loginButton}
          onPress={handleBarberLogin}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <Text style={styles.loginButtonText}>Login</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#4775ff31",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  card: {
    width: Math.min(width - 32, 400),
    padding: 24,
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
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    color: "#64748b",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
  },
  inputGroup: {
    gap: 14,
    marginBottom: 24,
  },
  // Enhanced animated toggle styles
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    padding: 4,
    marginBottom: 8,
    position: "relative",
  },
  slidingToggleBackground: {
    position: "absolute",
    top: 4,
    bottom: 4,
    backgroundColor: "#ffffff",
    borderRadius: 8,
    zIndex: 1,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  toggleText: {
    fontSize: 16,
  },
  loginButton: {
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    backgroundColor: "#2563eb",
    elevation: 3,
    borderWidth:1,
    borderColor:"#e4e4e4ff",
    shadowColor: "#000000ff",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  loginButtonText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 1,
  },
});