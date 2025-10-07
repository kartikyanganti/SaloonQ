// login.tsx
import MyInput from "@/components/MyInput";
import { Toast } from '@/components/ToastContainer';
import { firestore } from "@/firebase";
import { UserData, UserStorage } from "@/utils/UserStorage";
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
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

// TypeScript interfaces for better type safety
interface PhoneToEmailDoc {
  email: string;
}

interface UserDoc {
  uid: string;
  email: string;
  fullName: string;
  phone: string;
}

export default function EnhancedLoginModal() {
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

    // Additional validation for phone number
    if (loginMethod === "phone") {
      const phoneDigits = loginInput.replace(/\D/g, '');
      if (phoneDigits.length !== 10) {
        Toast.error(`${loginInput} has ${phoneDigits.length} digits, should be 10 digits`);
        return false;
      }
    }

    if (!loginPassword.trim()) {
      Toast.error("Please enter your password");
      return false;
    }

    return true;
  };

  // Helper function to save user data to AsyncStorage
  const saveUserToStorage = async (uid: string, email: string, fullName: string, phone: string) => {
    try {
      const userData: UserData = {
        uid,
        email,
        fullName,
        phone,
      };
      await UserStorage.saveUserData(userData);
      console.log("✅ User data saved to AsyncStorage successfully");
    } catch (error) {
      console.error("❌ Failed to save user data to AsyncStorage:", error);
      Toast.error("Failed to save user data");
    }
  };

  // Handle Customer Login
  const handleCustomerLogin = async () => {
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
          Toast.error(`${loginInput} is not registered. Please sign up first`);
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

        // Check if user data exists in Firestore
        const usersCollection = collection(firestore, "users");
        const userDocRef = doc(usersCollection, uid);
        const userSnap = await getDoc(userDocRef);

        if (!userSnap.exists()) {
          // User authenticated but no profile data
          Toast.error("Account profile not found. Please complete signup");
          setTimeout(() => {
            router.push("/signup");
          }, 2500);
          return;
        }

        const userData = userSnap.data() as UserDoc;
        await saveUserToStorage(uid, userData.email, userData.fullName, userData.phone);

        console.log("✅ Customer login successful:", uid);
        Toast.success("Login successful! Welcome back");

        setTimeout(() => {
          router.replace("/customer_home");
        }, 1500);

      } catch (authError: any) {
        const code = authError?.code;

        // 🔹 No internet or Firebase unavailable
        if (
          code === "auth/network-request-failed" ||
          code === "unavailable" ||
          code === "firebase/unavailable" ||
          code === "firestore/unavailable"
        ) {
          Toast.error("No internet connection. Please check your network.");
        }

        // 🔹 Invalid or missing email
        if (code === "auth/invalid-email") {
          Toast.error(`${loginInput} is not a valid email address.`);
        }

        // 🔹 User not registered (email/phone not found)
        else if (code === "auth/user-not-found") {
          Toast.error(`${loginInput} is not registered. Please sign up first.`);
        }

        // 🔹 Wrong password or invalid credentials
        else if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
          if (loginMethod === "phone" && phoneExists) {
            Toast.error("Incorrect Email or Password. Please try again.");
          } else {
            Toast.error("Incorrect Email or Password. Please try again.");
          }
        }


        // 🔹 Invalid email format
        else if (code === "auth/invalid-email") {
          Toast.error(`${loginInput} is not a valid email address.`);
        }

        // 🔹 Wrong password
        else if (code === "auth/wrong-password") {
          Toast.error("Incorrect password. Please try again.");
        }

        // 🔹 Too many attempts
        else if (code === "auth/too-many-requests") {
          Toast.error("Too many failed attempts. Please try again later.");
        }

        // 🔹 Any unhandled error
        else {
          Toast.error(authError?.message || "Something went wrong. Please try again.");
        }
      }


    } catch (err: any) {
      console.error("Customer Login Error:", err);
      Toast.error(err?.message || "Login failed. Please try again");
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
              fontWeight: loginMethod === "email" ? '700' : '700'
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
        <Pressable
          onLongPress={() => router.push("/barberLogin")}
        >
          <Text style={styles.title}>SaloonQ</Text>
        </Pressable>
        <Text style={styles.subtitle}>Welcome Back</Text>

        {/* Form */}
        {renderLoginForm()}

        {/* Login Button */}
        <Pressable
          style={styles.loginButton}
          onPress={handleCustomerLogin}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <Text style={styles.loginButtonText}>Login</Text>
          )}
        </Pressable>

        {/* New User Link */}
        <Pressable style={styles.signupLink} onPress={() => router.push("/signup")}>
          <Text style={styles.signupLinkText}>Create an Account</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#cececeff",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: Math.min(width - 32, 400),
    padding: 24,
    borderRadius: 28,
    backgroundColor: "#ffffff",
    elevation: 10,
    shadowColor: "#3e3e3eff",
    borderWidth: 1.5,
    borderColor: "#d8d8d8ff",
  },
  title: {
    color: "#1a1d29",
    fontSize: 32,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 2,
    letterSpacing: 2,
  },
  subtitle: {
    color: "#64748b",
    fontSize: 20,
    textAlign: "center",
    marginBottom: 16,
  },
  inputGroup: {
    gap: 14,
    marginBottom: 14,
  },
  // Enhanced animated toggle styles
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    padding: 4,
    marginBottom: 4,
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
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    backgroundColor: "#2563eb",

    elevation: 3,
    marginHorizontal: 10,
    shadowColor: "#000000ff",
    borderWidth: 2,
    borderColor: "#cbd5e1",
  },
  loginButtonText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 1,
  },
  signupLink: {
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderColor: "#cbd5e1",
    borderWidth: 1.5,
    elevation: 2,
    marginHorizontal: 11,
    backgroundColor: "#ffffff",
  },
  signupLinkText: {
    color: "#475569",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 1,
  },
});