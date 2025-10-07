// utils/BarberStorage.tsx - Native SDK version with safe UID handling
import { auth, firestore, signOut } from "../firebase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore, doc, getDoc } from "@react-native-firebase/firestore";
import { router } from "expo-router";

export interface BarberData {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  storeName: string;
  servicesPro: string[];
  status: string;
  updatedAt?: string;
}

const BARBER_STORAGE_KEY = "barberData";

export class BarberStorage {
  // Save barber data to AsyncStorage
  static async saveBarberData(barberData: BarberData): Promise<void> {
    try {
      await AsyncStorage.setItem(BARBER_STORAGE_KEY, JSON.stringify(barberData));
      console.log("✅ Barber data saved locally");
    } catch (error) {
      console.error("Error saving barber data:", error);
    }
  }

  // Get barber data from AsyncStorage
  static async getBarberData(): Promise<BarberData | null> {
    try {
      const barberData = await AsyncStorage.getItem(BARBER_STORAGE_KEY);
      return barberData ? JSON.parse(barberData) : null;
    } catch (error) {
      console.error("Error getting barber data:", error);
      return null;
    }
  }

  // Fetch fresh barber data from Firestore and save locally
  static async fetchAndSaveBarberData(uid: string): Promise<BarberData | null> {
    try {
        const db = getFirestore();  // get the Firestore instance in modular style
    const barberRef = doc(db, "barber", uid);
    const barberSnap = await getDoc(barberRef);
      
      if (barberSnap.exists()) {
        // Remove Firestore's uid if present to avoid overwriting
        const { uid: _ignore, ...rest } = barberSnap.data() as BarberData;
        const barberData: BarberData = {
          uid, // Always trust Auth UID
          ...rest,
        };
        await this.saveBarberData(barberData);
        return barberData;
      }
      return null;
    } catch (error) {
      console.error("Error fetching barber data:", error);
      return null;
    }
  }

  // Clear barber data (for logout)
  static async clearBarberData(): Promise<void> {
    try {
      await AsyncStorage.removeItem(BARBER_STORAGE_KEY);
      console.log("✅ Barber data cleared");
    } catch (error) {
      console.error("Error clearing barber data:", error);
    }
  }

  // Logout function
  static async logout(): Promise<void> {
    try {
      await this.clearBarberData();
      await signOut(auth); // Native modular signOut
      console.log("✅ Barber logged out successfully");
      router.replace("/login");
    } catch (error) {
      console.error("Error during logout:", error);
      throw error;
    }
  }

  // Update specific barber data fields in local storage
  static async updateBarberData(updates: Partial<BarberData>): Promise<void> {
    try {
      const currentData = await this.getBarberData();
      if (currentData) {
        const updatedData = { ...currentData, ...updates };
        await this.saveBarberData(updatedData);
      }
    } catch (error) {
      console.error("Error updating barber data:", error);
    }
  }

  // Check if barber is logged in (has local data)
  static async isLoggedIn(): Promise<boolean> {
    const barberData = await this.getBarberData();
    return barberData !== null;
  }


}