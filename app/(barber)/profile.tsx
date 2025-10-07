import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Modular imports (web-style API)
import { getApp } from '@react-native-firebase/app';
import {
  doc,
  getFirestore,
  serverTimestamp,
  updateDoc,
} from '@react-native-firebase/firestore';

import { showActionToast } from "@/components/GlobalActionToast";
import { Toast } from '@/components/ToastContainer';
import { BarberData, BarberStorage } from '@/utils/BarberStorage';

const db = getFirestore(getApp());

const BarberProfileScreen = () => {
  const [barberData, setBarberData] = useState<BarberData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Modal for adding new service
  const [addServiceModalVisible, setAddServiceModalVisible] = useState(false);
  const [newServiceInput, setNewServiceInput] = useState('');

  // Form state
  const [editForm, setEditForm] = useState({
    fullName: '',
    storeName: '',
    services: [] as string[],
  });

  useEffect(() => {
    loadBarberData();
  }, []);

  const loadBarberData = async () => {
    try {
      setLoading(true);
      const data = await BarberStorage.getBarberData();
      if (data) {
        setBarberData(data);
        setEditForm({
          fullName: data.fullName,
          storeName: data.storeName,
          services: data.servicesPro || [],
        });
      }
    } catch (error) {
      console.error('Error loading barber data:', error);
      Toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!barberData) return;

    if (!editForm.fullName.trim() || !editForm.storeName.trim()) {
      Toast.error('Full name and store name are required');
      return;
    }

    // Check if anything actually changed
    const isNameChanged = editForm.fullName.trim() !== barberData.fullName;
    const isStoreChanged = editForm.storeName.trim() !== barberData.storeName;
    const isServicesChanged = JSON.stringify(editForm.services.sort()) !== 
                               JSON.stringify((barberData.servicesPro || []).sort());

    if (!isNameChanged && !isStoreChanged && !isServicesChanged) {
      // Nothing changed, just exit edit mode without Firebase write
      setIsEditing(false);
      Toast.success('Profile updated successfully!');
      return;
    }

    try {
      setSaving(true);

      const barberRef = doc(db, 'barber', barberData.uid);
      const updatedData = {
        fullName: editForm.fullName.trim(),
        storeName: editForm.storeName.trim(),
        servicesPro: editForm.services,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(barberRef, updatedData);

      const newBarberData: BarberData = {
        ...barberData,
        fullName: updatedData.fullName,
        storeName: updatedData.storeName,
        servicesPro: updatedData.servicesPro,
      };
      await BarberStorage.saveBarberData(newBarberData);

      setBarberData(newBarberData);
      setIsEditing(false);
      Toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      Toast.error('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddService = () => {
    const service = newServiceInput.trim();
    if (!service) {
      Toast.error('Please enter a service name');
      return;
    }
    
    if (editForm.services.includes(service)) {
      Toast.error('This service already exists');
      return;
    }

    setEditForm(prev => ({
      ...prev,
      services: [...prev.services, service]
    }));
    setNewServiceInput('');
    setAddServiceModalVisible(false);
    Toast.success(`${service} added successfully`);
  };

  const handleRemoveService = (serviceToRemove: string) => {
    showActionToast({
      message: `Remove "${serviceToRemove}"?`,
      onConfirm: () => {
        setEditForm(prev => ({
          ...prev,
          services: prev.services.filter(service => service !== serviceToRemove)
        }));
        Toast.success('Service removed');
      },
    });
  };

  const handleCancelEdit = () => {
    if (barberData) {
      setEditForm({
        fullName: barberData.fullName,
        storeName: barberData.storeName,
        services: barberData.servicesPro || [],
      });
    }
    setIsEditing(false);
  };

  const handleLogout = async () => {
    showActionToast({
      message: 'Logout from your account?',
      onConfirm: async () => {
        try {
          await BarberStorage.logout();
          Toast.success('Logged out successfully');
        } catch {
          Toast.error('Failed to logout. Please try again.');
        }
      },
    });
  };

  const renderServiceChip = (service: string, index: number) => (
    <View key={index} style={styles.serviceChip}>
      <Text style={styles.serviceText}>{service}</Text>
      {isEditing && (
        <TouchableOpacity
          onPress={() => handleRemoveService(service)}
          style={styles.removeServiceButton}
        >
          <Ionicons name="close-circle" size={18} color="#b7b7b7ff" />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderInfoRow = (icon: string, value: string, editValue?: string, onChangeText?: (text: string) => void, placeholder?: string, isLast?: boolean) => (
    <View style={[styles.infoRow, isLast && styles.lastInfoRow]}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon as any} size={20} color="#000000ff" />
      </View>
      <View style={styles.infoContent}>
        {isEditing && onChangeText ? (
          <TextInput
            style={styles.inlineInput}
            value={editValue}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#666"
            editable={!saving}
          />
        ) : (
          <Text style={styles.infoText}>{value}</Text>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#030303ff" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!barberData) {
    BarberStorage.logout();
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Fixed Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={22} color="#F44336" />
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        {/* Profile Info with Services Combined */}
        <View style={styles.formContainer}>
          {/* Basic Info */}
          {renderInfoRow(
            'person-outline',
            barberData.fullName,
            editForm.fullName,
            (text) => setEditForm(prev => ({ ...prev, fullName: text })),
            'Enter your full name'
          )}
          
          {renderInfoRow(
            'storefront-outline',
            barberData.storeName,
            editForm.storeName,
            (text) => setEditForm(prev => ({ ...prev, storeName: text })),
            'Enter your store name'
          )}
          
          {renderInfoRow('mail-outline', barberData.email)}
          {renderInfoRow('call-outline', barberData.phone, undefined, undefined, undefined, true)}

          {/* Services Section - Integrated with same layout */}
          <View style={styles.servicesRow}>
            <View style={styles.iconContainer}>
              <Ionicons name="cut-outline" size={20} color="#000000ff" />
            </View>
            <View style={styles.servicesContent}>
              <View style={styles.servicesHeaderInline}>
                <Text style={styles.servicesTitle}>Services</Text>
                {isEditing && (
                  <TouchableOpacity 
                    onPress={() => setAddServiceModalVisible(true)}
                    style={styles.addServiceButton}
                  >
                    <Ionicons name="add-circle" size={24} color="#000000ff" />
                  </TouchableOpacity>
                )}
              </View>
              
              <View style={styles.servicesContainer}>
                {(isEditing ? editForm.services : barberData.servicesPro || []).length > 0 ? (
                  <View style={styles.servicesGrid}>
                    {(isEditing ? editForm.services : barberData.servicesPro || []).map((service, index) => 
                      renderServiceChip(service, index)
                    )}
                  </View>
                ) : (
                  <Text style={styles.noServicesText}>No services added yet</Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Edit Button */}
        <View style={styles.buttonContainer}>
          {isEditing ? (
            <View style={styles.editButtonsContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancelEdit}
                disabled={saving}
              >
                <Ionicons name="close-outline" size={20} color="#2e2e2eff" />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
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
              style={[styles.button, styles.editButton]}
              onPress={() => setIsEditing(true)}
            >
              <Ionicons name="create-outline" size={20} color="#000000ff" />
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Add Service Modal */}
      <Modal
        visible={addServiceModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddServiceModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Add New Service</Text>
            
            <TextInput
              style={styles.modalInput}
              value={newServiceInput}
              onChangeText={setNewServiceInput}
              placeholder="e.g. Haircut, Beard Trim"
              placeholderTextColor="#171717ff"
              autoFocus
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.modalCancelButton]}
                onPress={() => {
                  setAddServiceModalVisible(false);
                  setNewServiceInput('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.modalSaveButton]}
                onPress={handleAddService}
              >
                <Text style={styles.saveButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f4f8",
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
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
  },

  // Fixed logout button
  logoutButton: {
    position: 'absolute',
    top: 10,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fee2e2",
    borderWidth: 2,
    borderColor: "#f87171",
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    elevation: 6,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  header: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1e40af",
    letterSpacing: 1,
  },

  formContainer: {
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 16,
    padding: 20,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1.5,
    borderColor: "#d1d5db",
  },

  // Compact info rows
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  lastInfoRow: {
    borderBottomWidth: 0,
  },
  iconContainer: {
    width: 40,
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
    marginLeft: 16,
  },
  infoText: {
    fontSize: 16,
    color: "#374151",
    fontWeight: "500",
    paddingVertical: 8,
    paddingHorizontal: 8,
    textAlignVertical: 'center',
  },
  inlineInput: {
    fontSize: 16,
    color: "#1f2937",
    fontWeight: "500",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#93c5fd",
  },

  // Services section - integrated
  servicesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 16,
    borderTopWidth: 1.5,
    borderTopColor: "#e5e7eb",
  },
  servicesContent: {
    flex: 1,
    marginLeft: 16,
  },
  servicesHeaderInline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  servicesTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
  },
  addServiceButton: {
    padding: 4,
  },
  servicesContainer: {
    minHeight: 30,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  serviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#dbeafe",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#93c5fd",
  },
  serviceText: {
    color: "#1e40af",
    fontSize: 14,
    fontWeight: "600",
    marginRight: 0,
  },
  removeServiceButton: {
    padding: 1,
  },
  noServicesText: {
    color: "#404040ff",
    fontSize: 14,
    fontStyle: 'italic',
    paddingVertical: 8,
  },

  buttonContainer: {
    paddingHorizontal: 16,
    paddingTop: 30,
    paddingBottom: 20,
    alignItems: 'center',
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    elevation: 3,
    shadowColor: "#000000ff",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    borderWidth:1,
    borderColor: "#e1e1e1ff",
  },
  editButton: {
    backgroundColor: "#2563eb",
    minWidth: 160,
  },
  editButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  editButtonsContainer: {
    flexDirection: "row",
    gap: 12,
    width: '100%',
    maxWidth: 400,
    justifyContent: 'center',
  },
  saveButton: {
    backgroundColor: "#2563eb",
    flex: 1,
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  cancelButton: {
    backgroundColor: "#f3f4f6",
    borderWidth: 1.5,
    borderColor: "#d1d5db",
    flex: 1,
  },
  cancelButtonText: {
    color: "#6b7280",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 28,
    elevation: 15,
    borderWidth: 1.5,
    borderColor: "#d1d5db",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1e40af",
    marginBottom: 24,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: "#93c5fd",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: "#f9fafb",
    color: "#1f2937",
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalSaveButton: {
    backgroundColor: "#2563eb",
    flex: 1,
  },
  modalCancelButton: {
    backgroundColor: "#f3f4f6",
    borderWidth: 1.5,
    borderColor: "#d1d5db",
    flex: 1,
  },
});

export default BarberProfileScreen;