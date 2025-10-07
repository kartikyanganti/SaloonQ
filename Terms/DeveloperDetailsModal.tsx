import { Ionicons } from '@expo/vector-icons';
import { getApp } from '@react-native-firebase/app';
import { doc, getDoc, getFirestore } from '@react-native-firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Linking,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface DeveloperDetailsModalProps {
  visible: boolean;
  onClose: () => void;
}

interface DeveloperLinks {
  [key: string]: string;
}

const db = getFirestore(getApp());

const DeveloperDetailsModal: React.FC<DeveloperDetailsModalProps> = ({
  visible,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [links, setLinks] = useState<DeveloperLinks>({});

  useEffect(() => {
    if (visible) {
      fetchDeveloperLinks();
    }
  }, [visible]);

  const fetchDeveloperLinks = async () => {
    try {
      setLoading(true);
      const adminDocRef = doc(db, 'admin', 'links');
      const adminDoc = await getDoc(adminDocRef);

      if (adminDoc.exists()) {
        const data = adminDoc.data();
        if (data) {
          // Filter out empty fields and store all non-empty links
          const filteredLinks: DeveloperLinks = {};
          Object.keys(data).forEach((key) => {
            if (data[key] && data[key].trim() !== '') {
              filteredLinks[key] = data[key];
            }
          });
          setLinks(filteredLinks);
        }
      }
    } catch (error) {
      console.error('Error fetching developer links:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailPress = () => {
    Linking.openURL('mailto:kartikyanganti1@gmail.com');
  };

  const handleLinkPress = async (url: string) => {
    if (!url) return;

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        // If can't open, try to open in browser by ensuring it has http/https
        const browserUrl = url.startsWith('http') ? url : `https://${url}`;
        await Linking.openURL(browserUrl);
      }
    } catch (error) {
      console.error('Error opening link:', error);
      // Fallback: try to open in browser
      try {
        const browserUrl = url.startsWith('http') ? url : `https://${url}`;
        await Linking.openURL(browserUrl);
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
    }
  };

  const hasAnyLinks = Object.keys(links).length > 0;

  const getLinkColor = (index: number) => {
    const colors = ['#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];
    return colors[index % colors.length];
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#64748b" />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <Ionicons name="code-slash" size={28} color="#2563eb" />
              <Text style={styles.headerTitle}>Developer</Text>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            ) : (
              <>
                {/* About App Card */}
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Ionicons name="information-circle" size={24} color="#2563eb" />
                    <Text style={styles.cardTitle}>About This App</Text>
                  </View>

                  <Text style={styles.aboutText}>
                    This is a self-project built with passion and dedication to
                    showcase modern mobile development practices using React Native
                    and Firebase.
                  </Text>
                </View>

                {/* Developer Info Card */}
                <View style={styles.card}>
                  <View style={styles.developerInfo}>
                    <Text style={styles.developerName}>Kartik Yanganti</Text>
                    <Text style={styles.developerRole}>Full Stack & Mobile Developer</Text>
                  </View>

                  <View style={styles.divider} />

                  {/* Contact Options */}
                  <View style={styles.contactSection}>
                    <Text style={styles.sectionTitle}>Get in Touch</Text>

                    {/* Email - Always shown */}
                    <TouchableOpacity
                      style={styles.contactButton}
                      onPress={handleEmailPress}
                    >
                      <View style={styles.contactIconWrapper}>
                        <Ionicons name="mail" size={16} color="#2563eb" />
                      </View>
                      <View style={styles.contactTextContainer}>
                        <Text style={styles.contactLabel}>Email</Text>
                        <Text numberOfLines={1} style={styles.contactValue}>
                          kartikyanganti1@gmail.com
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
                    </TouchableOpacity>

                    {/* Dynamic Links from Firestore */}
                    {hasAnyLinks && (
                      <>
                        <View style={styles.divider} />
                        <Text style={styles.sectionTitle}>Other Links</Text>

                        {Object.entries(links).map(([fieldName, url], index) => (
                          <TouchableOpacity
                            key={fieldName}
                            style={styles.contactButton}
                            onPress={() => handleLinkPress(url)}
                          >
                            <View style={styles.contactIconWrapper}>
                              <Ionicons name="link" size={20} color={getLinkColor(index)} />
                            </View>
                            <View style={styles.contactTextContainer}>
                              <Text style={styles.contactLabel}>{fieldName}</Text>
                              <Text style={styles.contactValue} numberOfLines={1}>
                                {url}
                              </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
                          </TouchableOpacity>
                        ))}
                      </>
                    )}
                  </View>
                </View>

                {/* Need Solutions Card */}
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Ionicons name="bulb" size={24} color="#f59e0b" />
                    <Text style={styles.cardTitle}>Need a Solution?</Text>
                  </View>

                  <Text style={styles.solutionText}>
                    Looking for custom mobile apps, web solutions, or technical
                    consultation? Let's collaborate and bring your ideas to life!
                  </Text>

                  <TouchableOpacity
                    style={styles.ctaButton}
                    onPress={handleEmailPress}
                  >
                    <Ionicons name="send" size={18} color="#ffffff" />
                    <Text style={styles.ctaButtonText}>Contact for Projects</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    width: '100%',
    maxHeight: '85%',
    padding: 16,
    elevation: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    paddingTop: 8,
    gap: 6,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e293b',
  },

  // Cards
  card: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },

  // Developer Info
  developerInfo: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  developerName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2563eb',
    marginBottom: 4,
  },
  developerRole: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },

  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 16,
  },

  // Contact Section
  contactSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 4,
  },
  contactIconWrapper: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactTextContainer: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '700',
  },

  // About Text
  aboutText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
    fontWeight: '500',
  },

  // Solution Section
  solutionText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
    marginBottom: 16,
    fontWeight: '500',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    elevation: 2,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  ctaButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default DeveloperDetailsModal;