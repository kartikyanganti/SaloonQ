import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// 👇 Modular imports (web-style API)
import { getApp } from '@react-native-firebase/app';
import {
  doc,
  getFirestore,
  serverTimestamp,
  updateDoc,
} from '@react-native-firebase/firestore';

import DeveloperDetailsModal from '@/Terms/DeveloperDetailsModal';
import { showActionToast } from "@/components/GlobalActionToast";
import { Toast } from '@/components/ToastContainer';
import { UserData, UserStorage } from '@/utils/UserStorage';

const db = getFirestore(getApp());

const ProfileScreen = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeveloperModal, setShowDeveloperModal] = useState(false);

  const [editForm, setEditForm] = useState({ fullName: '' });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const data = await UserStorage.getUserData();
      if (data) {
        setUserData(data);
        setEditForm({ fullName: data.fullName });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      Toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!userData) return;

    if (!editForm.fullName.trim()) {
      Toast.error('Full name is required');
      return;
    }

    // Check if nothing has changed
    if (editForm.fullName.trim() === userData.fullName) {
      setIsEditing(false);
      Toast.success('Profile updated successfully!');
      return;
    }

    try {
      setSaving(true);

      const userRef = doc(db, 'users', userData.uid);
      const updatedData = {
        fullName: editForm.fullName.trim(),
        updatedAt: serverTimestamp(),
      };

      await updateDoc(userRef, updatedData);

      const newUserData: UserData = { ...userData, ...updatedData };
      await UserStorage.saveUserData(newUserData);

      setUserData(newUserData);
      setIsEditing(false);
      Toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      Toast.error('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (userData) {
      setEditForm({ fullName: userData.fullName });
    }
    setIsEditing(false);
  };

  const handleLogout = async () => {
    showActionToast({
      message: "Are you sure you want to logout?",
      onConfirm: async () => {
        try {
          await UserStorage.logout();
          Toast.success("Logged out successfully");
        } catch (error) {
          console.error('Logout error:', error);
          Toast.error('Failed to logout. Please try again.');
        }
      },
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000000ff" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!userData) {
    UserStorage.logout();
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header with Developer Info and Logout Buttons */}
        <View style={styles.header}>
          {/* Developer Info Button - Left Side */}
          <TouchableOpacity
            style={styles.developerButton}
            onPress={() => setShowDeveloperModal(true)}
          >
            <Ionicons name="information-circle-outline" size={24} color="#2563eb" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Profile</Text>
          
          {/* Logout Button - Right Side */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={24} color="#F44336" />
          </TouchableOpacity>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          {/* Full Name */}
          <View style={styles.fieldContainer}>
            <View style={styles.fieldRow}>
              <Ionicons name="person-outline" size={22} color="#000000ff" style={styles.icon} />
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={editForm.fullName}
                  onChangeText={(text) =>
                    setEditForm((prev) => ({ ...prev, fullName: text }))
                  }
                  placeholder="Enter your full name"
                  placeholderTextColor="#adadadff"
                  editable={!saving}
                />
              ) : (
                <Text style={styles.fieldValue}>{userData.fullName}</Text>
              )}
            </View>
          </View>

          <View style={styles.divider} />

          {/* Email */}
          <View style={styles.fieldContainer}>
            <View style={styles.fieldRow}>
              <Ionicons name="mail-outline" size={22} color="#000000ff" style={styles.icon} />
              <Text style={[styles.fieldValue, styles.readOnlyValue]}>
                {userData.email}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Phone */}
          <View style={styles.fieldContainer}>
            <View style={styles.fieldRow}>
              <Ionicons name="call-outline" size={22} color="#000000ff" style={styles.icon} />
              <Text style={[styles.fieldValue, styles.readOnlyValue]}>
                {userData.phone}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          {isEditing ? (
            <View style={styles.editButtonsRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={handleCancelEdit}
                disabled={saving}
              >
                <Ionicons name="close-outline" size={20} color="#858585ff" />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.saveButton]}
                onPress={handleSaveProfile}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#0a0a0f" />
                ) : (
                  <>
                    <Ionicons name="checkmark-outline" size={20} color="#0a0a0f" />
                    <Text style={styles.saveButtonText}>Save</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => setIsEditing(true)}
            >
              <Ionicons name="create-outline" size={20} color="#0a0a0f" />
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Developer Details Modal */}
      <DeveloperDetailsModal
        visible={showDeveloperModal}
        onClose={() => setShowDeveloperModal(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#64748b",
    fontWeight: "600",
    letterSpacing: 0.5,
  },

  // Header Section with Developer Info and Logout Buttons
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: "#ffffff",
    elevation: 10,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#000000ff",
    letterSpacing: 1,
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
  },
  developerButton: {
    backgroundColor: "#eff6ff",
    padding: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#bfdbfe",
    elevation: 2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 1,
  },
  logoutButton: {
    backgroundColor: "#fef2f2",
    padding: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#fca5a5",
    elevation: 2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 1,
  },

  // Profile Card
  profileCard: {
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1.5,
    borderColor: "#e8edf2",
    elevation: 4,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  fieldContainer: {
    paddingVertical: 12,
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 40,
  },
  icon: {
    marginRight: 12,
    width: 22,
  },
  fieldValue: {
    flex: 1,
    fontSize: 17,
    fontWeight: "600",
    color: "#1a1d29",
  },
  readOnlyValue: {
    color: "#64748b",
  },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#2563eb",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 17,
    backgroundColor: "#eff6ff",
    color: "#1a1d29",
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#e8edf2",
    marginVertical: 4,
  },

  // Action Buttons
  actionContainer: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    elevation: 4,
  },
  editButton: {
    elevation: 2,
    backgroundColor: "#2563eb",
    shadowColor: "#282828ff",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: "#ebebebff",
  },
  editButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  editButtonsRow: {
    flexDirection: "row",
    gap: 12,
  },
  saveButton: {
    borderWidth: 1.5,
    borderColor: "#bdbdbdff",
    backgroundColor: "#2563eb",
    elevation: 5,
    flex: 1,
    shadowColor: "#000000ff",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  cancelButton: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    flex: 1,
  },
  cancelButtonText: {
    color: "#64748b",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});

export default ProfileScreen;