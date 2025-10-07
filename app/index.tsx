import { BarberStorage } from '@/utils/BarberStorage';
import { UserStorage } from '@/utils/UserStorage';
import { collection, doc, getDoc, getFirestore } from '@react-native-firebase/firestore';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Dimensions,
  Image,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');

interface UpdateInfo {
  upToDate: 'yes' | 'no' | 'slow';
  updateLink?: string;
}

export default function SplashScreen() {
  const [loading, setLoading] = useState(true);
  const [updateStatus, setUpdateStatus] = useState<'yes' | 'no' | 'slow' | null>(null);
  const [updateLink, setUpdateLink] = useState<string>('');
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  const firestore = getFirestore();

  useEffect(() => {
    checkAppVersion();
  }, []);

  useEffect(() => {
    if (showUpdateModal) {
      const backAction = () => true;
      const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
      return () => backHandler.remove();
    }
  }, [showUpdateModal]);

  const checkAppVersion = async () => {
    try {
      console.log('🔄 Checking app version...');

      const updateInfoRef = doc(collection(firestore, 'admin'), 'updateInfo');
      const updateInfoSnap = await getDoc(updateInfoRef);

      if (updateInfoSnap.exists()) {
        const data = updateInfoSnap.data() as UpdateInfo;
        const status = data.upToDate;
        const link = data.updateLink || '';
        
        setUpdateStatus(status);
        setUpdateLink(link);

        console.log('📱 App update status:', status);
        console.log('🔗 Update link:', link);

        if (status === 'no' || status === 'slow') {
          setShowUpdateModal(true);
          setLoading(false);
          return;
        } else if (status === 'yes') {
          await checkLoginStatus();
        }
      } else {
        console.error('❌ UpdateInfo document not found');
        await checkLoginStatus();
      }
    } catch (error) {
      console.error('❌ Error checking app version:', error);
      await checkLoginStatus();
    }
  };

  const checkLoginStatus = async () => {
    try {
      console.log('🔄 Checking login status...');

      const startTime = Date.now();
      
      const [isUserLoggedIn, isBarberLoggedIn] = await Promise.all([
        UserStorage.isLoggedIn(),
        BarberStorage.isLoggedIn()
      ]);

      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(2000 - elapsedTime, 0);

      setTimeout(() => {
        setLoading(false);

        if (isUserLoggedIn) {
          console.log('✅ User is logged in, redirecting to customer home');
          router.replace('/customer_home');
        } else if (isBarberLoggedIn) {
          console.log('✅ Barber is logged in, redirecting to barber home');
          router.replace('/barber_home');
        } else {
          console.log('❌ Neither user nor barber logged in, redirecting to login');
          router.replace('/login');
        }
      }, remainingTime);
    } catch (error) {
      console.error('❌ Error checking login status:', error);
      setLoading(false);
      router.replace('/login');
    }
  };

  const handleUpdateLink = async () => {
    try {
      console.log('📋 Update link from Firestore:', updateLink);
      
      if (!updateLink || updateLink.trim() === '') {
        console.error('❌ No update link found in Firestore');
        Alert.alert(
          'No Update Link',
          'Update link is not configured. Please contact the developer.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      console.log('🔗 Attempting to open URL:', updateLink);
      
      await Linking.openURL(updateLink);
      console.log('✅ Successfully opened URL:', updateLink);
    } catch (error) {
      console.error('❌ Error opening update link:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      
      Alert.alert(
        'Cannot Open Link',
        `Failed to open the update link. Please try again or contact the developer.\n\nLink: ${updateLink}`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleSlowUpdateContinue = () => {
    setShowUpdateModal(false);
    setLoading(true);
    checkLoginStatus();
  };

  const renderUpdateModal = () => {
    const isForceUpdate = updateStatus === 'no';
    const isSlowUpdate = updateStatus === 'slow';

    return (
      <Modal
        visible={showUpdateModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isForceUpdate) setShowUpdateModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.iconContainer}>
              <Text style={styles.updateIcon}>🚀</Text>
            </View>

            <Text style={styles.modalTitle}>
              {isForceUpdate ? 'New Update!' : 'Update Available'}
            </Text>

            <Text style={styles.modalMessage}>
              {isForceUpdate
                ? 'Get the latest version to continue'
                : 'New features & improvements ready!'}
            </Text>

            <TouchableOpacity
              style={styles.updateButton}
              onPress={handleUpdateLink}
              activeOpacity={0.8}
            >
              <Text style={styles.updateButtonText}>📥 Get Update</Text>
            </TouchableOpacity>

            <Text style={styles.noteText}>Contact developer for latest version</Text>

            {isSlowUpdate && (
              <TouchableOpacity
                style={styles.skipButton}
                onPress={handleSlowUpdateContinue}
                activeOpacity={0.8}
              >
                <Text style={styles.skipButtonText}>Skip for now</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  const renderLoadingIndicator = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#ffffffff" />
    </View>
  );

  const renderAppBranding = () => (
    <View style={styles.brandingContainer}>
      <View style={styles.logoContainer}>
        <Image 
          source={require('@/assets/images/icon.png')}
          style={styles.logoImage}
          resizeMode="cover"
        />
      </View>
      <Text style={styles.appTitle}>SaloonQ</Text>
      <Text style={styles.appSubtitle}>Welcome back</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        {renderAppBranding()}
        {loading && renderLoadingIndicator()}
      </View>

      {renderUpdateModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    alignItems: "center",
    justifyContent: "center",
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandingContainer: {
    alignItems: 'center',
    marginBottom: 80,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 30,
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 4,
    borderColor: "#2a2a2a",
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  appTitle: {
    color: "#ffffff",
    fontSize: 36,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: 2,
  },
  appSubtitle: {
    color: "#9aa0a6",
    fontSize: 18,
    textAlign: "center",
    fontWeight: "600",
    letterSpacing: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    gap: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.97)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContainer: {
    width: Math.min(width - 32, 400),
    backgroundColor: "#343434ff",
    borderRadius: 28,
    padding: 32,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.25)",
  },
  iconContainer: {
    marginBottom: 24,
  },
  updateIcon: {
    fontSize: 64,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 12,
    textAlign: "center",
    letterSpacing: 1,
  },
  modalMessage: {
    fontSize: 16,
    color: "#9aa0a6",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 22,
    fontWeight: "600",
  },
  updateButton: {
    backgroundColor: "#ebebebff",
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 16,
    marginBottom: 16,
    minWidth: 200,
  },
  updateButtonText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 1,
  },
  noteText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
    fontWeight: "500",
  },
  skipButton: {
    backgroundColor: "transparent",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.2)",
  },
  skipButtonText: {
    color: "#9aa0a6",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 0.5,
  },
});