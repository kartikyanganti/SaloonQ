// utils/UserStorage.tsx - Native SDK version with safe UID handling
import { auth, firestore, signOut } from "../firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

export interface UserData {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  isBarber?: boolean;
  createdAt?: string;
}

const USER_STORAGE_KEY = "userData";

export class UserStorage {
  // Save user data to AsyncStorage
  static async saveUserData(userData: UserData): Promise<void> {
    try {
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
      console.log("✅ User data saved locally");
    } catch (error) {
      console.error("Error saving user data:", error);
    }
  }

  // Get user data from AsyncStorage
  static async getUserData(): Promise<UserData | null> {
    try {
      const userData = await AsyncStorage.getItem(USER_STORAGE_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error("Error getting user data:", error);
      return null;
    }
  }

  // Fetch fresh user data from Firestore and save locally
  static async fetchAndSaveUserData(uid: string): Promise<UserData | null> {
    try {
      const userRef = firestore.collection("users").doc(uid);
      const userSnap = await userRef.get();

      if (userSnap.exists()) {
        // Remove Firestore's uid if present to avoid overwriting
        const { uid: _ignore, ...rest } = userSnap.data() as UserData;

        const userData: UserData = {
          uid, // Always trust Auth UID
          ...rest,
        };

        await this.saveUserData(userData);
        return userData;
      }
      return null;
    } catch (error) {
      console.error("Error fetching user data:", error);
      return null;
    }
  }

  // Clear user data (for logout)
  static async clearUserData(): Promise<void> {
    try {
      await AsyncStorage.removeItem(USER_STORAGE_KEY);
      console.log("✅ User data cleared");
    } catch (error) {
      console.error("Error clearing user data:", error);
    }
  }

  // Logout function
  static async logout(): Promise<void> {
    try {
      await this.clearUserData();
      await signOut(auth); // Native modular signOut
      console.log("✅ User logged out successfully");
      router.replace("/login");
    } catch (error) {
      console.error("Error during logout:", error);
      throw error;
    }
  }

  // Update specific user data fields in local storage
  static async updateUserData(updates: Partial<UserData>): Promise<void> {
    try {
      const currentData = await this.getUserData();
      if (currentData) {
        const updatedData = { ...currentData, ...updates };
        await this.saveUserData(updatedData);
      }
    } catch (error) {
      console.error("Error updating user data:", error);
    }
  }

  // Check if user is logged in (has local data)
  static async isLoggedIn(): Promise<boolean> {
    const userData = await this.getUserData();
    return userData !== null;
  }
}
