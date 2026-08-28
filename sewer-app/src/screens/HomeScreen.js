import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  ScrollView,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '../styles/globalStyles';

const LOCATION_OPTIONS = [
  { label: 'New York City', tag: 'NYC', phone: '(212) 687-4995', href: 'tel:+12126874995' },
  { label: 'Brooklyn & Queens', tag: 'BK/QN', phone: '(718) 845-4995', href: 'tel:+17188454995' },
  { label: 'Nassau County', tag: 'NAS', phone: '(516) 354-4995', href: 'tel:+15163544995' },
  { label: 'Suffolk County', tag: 'SUF', phone: '(631) 698-4995', href: 'tel:+16316984995' },
  { label: 'Other', tag: 'oth', phone: '(888) PAY-4995', href: 'tel:+1888Pay995' },
];

const HomeScreen = ({ onNavigate }) => {
  const [phoneNumber, setPhoneNumber] = useState('(212) 687-4995');
  const [telHref, setTelHref] = useState('tel:+12126874995');
  const [regionTag, setRegionTag] = useState('NYC');
  
  const [isModalVisible, setIsModalVisible] = useState(true); // Location selector modal
  const [isAboutModalVisible, setIsAboutModalVisible] = useState(false); // About popup modal
  const [isNotificationOpen, setIsNotificationOpen] = useState(false); // Bell Dropdown state

  // Notification list state inside dropdown
  const [notifications, setNotifications] = useState([
    {
      id: '1',
      title: 'New Service Available',
      message: 'An administrator added a new plumbing/drain service.',
      time: 'Just now',
      read: false,
    }
  ]);
  const [loading, setLoading] = useState(false);

  const selectLocation = (location) => {
    setPhoneNumber(location.phone);
    setTelHref(location.href);
    setRegionTag(location.tag);
    setIsModalVisible(false);
  };

  const handleCall = () => {
    Linking.openURL(telHref);
  };

  const handleTileClick = (targetScreen) => {
    if (targetScreen === 'about') {
      setIsAboutModalVisible(true);
    } else if (typeof onNavigate === 'function') {
      onNavigate(targetScreen);
    }
  };

  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item))
    );
  };

  return (
    <View style={styles.screenBackground}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Location Selector Modal */}
        <Modal
          visible={isModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Select Your Location</Text>
              <Text style={styles.modalSubtitle}>
                Choose your region so we can connect you to the nearest service team.
              </Text>

              {LOCATION_OPTIONS.map((loc) => (
                <TouchableOpacity
                  key={loc.tag}
                  style={[
                    styles.locationOption,
                    regionTag === loc.tag && styles.locationOptionSelected,
                  ]}
                  onPress={() => selectLocation(loc)}
                >
                  <Text
                    style={[
                      styles.locationOptionText,
                      regionTag === loc.tag && styles.locationOptionTextSelected,
                    ]}
                  >
                    {loc.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>

        {/* About Details Popup Modal */}
        <Modal
          visible={isAboutModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setIsAboutModalVisible(false)}
        >
          <View style={localStyles.aboutModalOverlay}>
            <View style={localStyles.aboutModalContent}>
              <View style={localStyles.aboutModalHeader}>
                <View>
                  <Text style={localStyles.aboutScreenTitle}>About Us</Text>
                  <Text style={localStyles.aboutScreenSub}>15+ years serving New York.</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setIsAboutModalVisible(false)}
                  style={localStyles.aboutCloseBtn}
                >
                  <Ionicons name="close" size={22} color="#1F2937" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={localStyles.aboutScrollBody}>
                <View style={localStyles.aboutHero}>
                  <Text style={localStyles.aboutText}>
                    A $49.95 Any Sewer or Drain is the leading provider of sewer & drain cleaning in Brooklyn, Queens, Nassau, and Suffolk counties. Our courteous call-center is staffed by friendly professionals, and a fleet of trucks is ready to roll whenever you need us. We started the low-price trend — don't be fooled by imitators.
                  </Text>
                </View>

                <View style={localStyles.infoList}>
                  <View style={localStyles.infoItem}>
                    <Text style={localStyles.infoItemIcon}>📍</Text>
                    <View style={localStyles.infoItemTextWrap}>
                      <Text style={localStyles.infoItemLabel}>Address</Text>
                      <Text style={localStyles.infoItemValue}>116-03 Merrick Blvd{'\n'}Jamaica, NY 11434</Text>
                    </View>
                  </View>

                  <View style={localStyles.infoItem}>
                    <Text style={localStyles.infoItemIcon}>⏰</Text>
                    <View style={localStyles.infoItemTextWrap}>
                      <Text style={localStyles.infoItemLabel}>Hours</Text>
                      <Text style={localStyles.infoItemValue}>24 Hours / 7 Days — No surcharges nights, weekends, holidays</Text>
                    </View>
                  </View>

                  <View style={localStyles.infoItem}>
                    <Text style={localStyles.infoItemIcon}>🗺</Text>
                    <View style={localStyles.infoItemTextWrap}>
                      <Text style={localStyles.infoItemLabel}>Service Area</Text>
                      <Text style={localStyles.infoItemValue}>NYC, Brooklyn, Queens, Nassau, Suffolk, Long Island</Text>
                    </View>
                  </View>

                  <View style={localStyles.infoItem}>
                    <Text style={localStyles.infoItemIcon}>✓</Text>
                    <View style={localStyles.infoItemTextWrap}>
                      <Text style={localStyles.infoItemLabel}>Credentials</Text>
                      <Text style={localStyles.infoItemValue}>Licensed & Insured · 15+ Years · 199+ Reviews</Text>
                    </View>
                  </View>
                </View>

                <View style={localStyles.aboutActions}>
                  <TouchableOpacity
                    style={localStyles.btnSecondary}
                    onPress={() => Linking.openURL('https://maps.google.com/?q=116-03+Merrick+Blvd+Jamaica+NY+11434')}
                  >
                    <Text style={localStyles.btnSecondaryText}>Open in Maps</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={localStyles.btnSecondary}
                    onPress={() => Linking.openURL('https://a4995.com')}
                  >
                    <Text style={localStyles.btnSecondaryText}>Visit Website</Text>
                  </TouchableOpacity>
                </View>

                <View style={localStyles.faqWrap}>
                  <Text style={localStyles.faqH}>FAQs</Text>

                  <View style={localStyles.faqBox}>
                    <Text style={localStyles.faqQ}>How do I know if my sewer is clogged?</Text>
                    <Text style={localStyles.faqA}>Slow drainage, gurgling sounds, foul odors, or water backing up in toilets/sinks.</Text>
                  </View>

                  <View style={localStyles.faqBox}>
                    <Text style={localStyles.faqQ}>Is the $49.95 price for any drain?</Text>
                    <Text style={localStyles.faqA}>Yes — that's our flat advertised cleaning price. The original low-price promise.</Text>
                  </View>

                  <View style={localStyles.faqBox}>
                    <Text style={localStyles.faqQ}>Do you offer emergency service?</Text>
                    <Text style={localStyles.faqA}>Absolutely — 24/7, no surcharges for nights, weekends, or holidays.</Text>
                  </View>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Hero Card */}
        <View style={[styles.heroCard, localStyles.heroCardGlass]}>
          <View style={styles.headerRow}>
            {/* Status Pill */}
            <View style={[styles.statusPill, localStyles.statusPillCustom]}>
              <View style={styles.statusDot} />
              <Text style={[styles.statusText, localStyles.statusTextWhite]}>
                Open Now
              </Text>
            </View>

            {/* Right Group: Location Pill + Notification Icon with attached Popover */}
            <View style={localStyles.headerRightGroup}>
              <TouchableOpacity
                style={styles.changeLocationPill}
                onPress={() => setIsModalVisible(true)}
              >
                <Text style={styles.changeLocationText}>📍 {regionTag} (Change)</Text>
              </TouchableOpacity>

              {/* Notification Bell Icon Button */}
              <TouchableOpacity
                style={localStyles.notificationIconButton}
                onPress={() => setIsNotificationOpen(!isNotificationOpen)}
                activeOpacity={0.8}
              >
                <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
              </TouchableOpacity>

              {/* Attached Dropdown Popover Container */}
              {isNotificationOpen && (
                <View style={localStyles.dropdownBackdropWrapper}>
                  {/* Backdrop to catch clicks outside dropdown and close it */}
                  <TouchableOpacity
                    style={localStyles.dropdownBackdrop}
                    activeOpacity={1}
                    onPress={() => setIsNotificationOpen(false)}
                  />

                  <View style={localStyles.dropdownContainer}>
                    {/* Tiny triangle arrow pointing up towards the bell icon */}
                    <View style={localStyles.dropdownArrow} />

                    {/* Header */}
                    <View style={localStyles.dropdownHeader}>
                      <Text style={localStyles.dropdownTitle}>Notifications</Text>
                      <TouchableOpacity
                        onPress={() => setIsNotificationOpen(false)}
                        style={localStyles.closeButton}
                      >
                        <Ionicons name="close" size={18} color="#1F2937" />
                      </TouchableOpacity>
                    </View>

                    {/* Content List */}
                    {loading ? (
                      <View style={localStyles.center}>
                        <ActivityIndicator size="small" color="#3B82F6" />
                      </View>
                    ) : notifications.length === 0 ? (
                      <View style={localStyles.center}>
                        <Ionicons name="notifications-off-outline" size={28} color="#9CA3AF" />
                        <Text style={localStyles.emptyText}>No alerts found.</Text>
                      </View>
                    ) : (
                      <View style={localStyles.listContainer}>
                        {notifications.map((item) => (
                          <TouchableOpacity
                            key={item.id}
                            style={[localStyles.notificationCard, item.read && localStyles.readCard]}
                            onPress={() => markAsRead(item.id)}
                            activeOpacity={0.8}
                          >
                            <View style={localStyles.textContainer}>
                              <View style={localStyles.titleRow}>
                                <Text style={[localStyles.title, item.read && localStyles.readText]}>
                                  {item.title}
                                </Text>
                                <Text style={localStyles.time}>{item.time}</Text>
                              </View>
                              <Text style={[localStyles.message, item.read && localStyles.readText]}>
                                {item.message}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              )}
            </View>
          </View>

          <Text style={styles.heroTitle}>
            Clogged Drain?{'\n'}
            <Text style={styles.heroTitleY}>Tap to Call.{'\n'}We Fix It.</Text>
          </Text>

          {/* Subtitle paragraph */}
          <Text style={[styles.heroSub, localStyles.heroSubWhite]}>
            One flat price. Licensed & insured. 15+ years in New York.
          </Text>

          {/* 3D Red Call Button */}
          <TouchableOpacity
            style={localStyles.btn3dContainer}
            onPress={handleCall}
            activeOpacity={0.85}
          >
            {/* Dark Red Shadow/Depth Base */}
            <View style={localStyles.btn3dBase} />

            {/* Bright Red Top Layer */}
            <View style={localStyles.btn3dTop}>
              <View style={localStyles.btn3dIconCircle}>
                <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
                    stroke="#FFFFFF"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </View>

              <View style={localStyles.btn3dTextContainer}>
                <Text style={localStyles.btn3dLabel}>CALL NOW ({regionTag})</Text>
                <Text style={localStyles.btn3dNum}>{phoneNumber}</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Quick Badges */}
          <View style={localStyles.quickBadgesLeft}>
            <View style={localStyles.qbadgeRounded}>
              <Text style={localStyles.qbadgeIconYellow}>⏱ </Text>
              <Text style={localStyles.qbadgeTextWhite}>24/7</Text>
            </View>

            <View style={localStyles.qbadgeRounded}>
              <Text style={localStyles.qbadgeIconYellow}>✓ </Text>
              <Text style={localStyles.qbadgeTextWhite}>Licensed</Text>
            </View>

            <View style={localStyles.qbadgeRounded}>
              <Text style={localStyles.qbadgeIconYellow}>$ </Text>
              <Text style={localStyles.qbadgeTextWhite}>$49.95 Flat</Text>
            </View>
          </View>
        </View>

        {/* Single Centered Quick Action Tile (About) */}
        <View style={localStyles.centeredTileRow}>
          <TouchableOpacity style={styles.tile} onPress={() => handleTileClick('about')} activeOpacity={0.8}>
            <View style={localStyles.tileIcon3dContainer}>
              <View style={[localStyles.tileIcon3dBase, { backgroundColor: '#059669' }]} />
              <View style={[localStyles.tileIcon3dTop, { backgroundColor: '#10B981' }]}>
                <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <Circle cx="12" cy="10" r="3" stroke="#FFFFFF" strokeWidth="2" />
                  <Path
                    d="M12 2a8 8 0 0 0-8 8c0 5.4 8 12 8 12s8-6.6 8-12a8 8 0 0 0-8-8z"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </View>
            </View>
            <Text style={styles.tileLabel}>About</Text>
          </TouchableOpacity>
        </View>

        {/* Trust Strip */}
        <View style={styles.trustStrip}>
          <View style={styles.trustStat}>
            <Text style={styles.trustNum}>15+</Text>
            <Text style={styles.trustLbl}>Years</Text>
          </View>
          <View style={styles.trustDiv} />
          <View style={styles.trustStat}>
            <Text style={styles.trustNum}>199+</Text>
            <Text style={styles.trustLbl}>Reviews</Text>
          </View>
          <View style={styles.trustDiv} />
          <View style={styles.trustStat}>
            <Text style={styles.trustNum}>★★★★★</Text>
            <Text style={styles.trustLbl}>Excellent</Text>
          </View>
        </View>

        {/* Testimonial Card */}
        <View style={[styles.testimonial, localStyles.testimonialBorder]}>
          <Text style={styles.testimonialStars}>★★★★★</Text>
          <Text style={styles.testimonialText}>
            "Honest, fair priced, and never upsell or create work that's not needed."
          </Text>
          <Text style={styles.testimonialAuthor}>— Allan S., Customer</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const localStyles = StyleSheet.create({
  heroCardGlass: {
    backgroundColor: 'rgba(120, 207, 238, 0.82)',
    borderColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth: 1,
    overflow: 'visible',
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    position: 'relative',
    zIndex: 99,
  },
  notificationIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#8AB3CB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  dropdownBackdropWrapper: {
    position: 'absolute',
    top: 45,
    right: 0,
    zIndex: 1000,
  },
  dropdownBackdrop: {
    position: 'absolute',
    top: -1000,
    bottom: -1000,
    left: -1000,
    right: -1000,
    backgroundColor: 'transparent',
  },
  dropdownContainer: {
    width: 260,
    maxHeight: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dropdownArrow: {
    position: 'absolute',
    top: -6,
    right: 14,
    width: 12,
    height: 12,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }],
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: '#E5E7EB',
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1F2937',
  },
  closeButton: {
    padding: 2,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  listContainer: {
    paddingBottom: 4,
  },
  notificationCard: {
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  readCard: {
    backgroundColor: '#FFFFFF',
    borderLeftColor: '#9CA3AF',
    opacity: 0.8,
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  readText: {
    color: '#4B5563',
    fontWeight: '500',
  },
  message: {
    fontSize: 11,
    color: '#374151',
    lineHeight: 14,
  },
  time: {
    fontSize: 9,
    color: '#6B7280',
  },
  center: {
    paddingVertical: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 6,
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  statusPillCustom: {
    backgroundColor: '#8AB3CB',
    borderColor: '#8AB3CB',
  },
  statusTextWhite: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  heroSubWhite: {
    color: '#FFFFFF',
  },
  btn3dContainer: {
    marginVertical: 14,
    height: 62,
    position: 'relative',
  },
  btn3dBase: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 56,
    backgroundColor: '#991b1b',
    borderRadius: 16,
  },
  btn3dTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 56,
    backgroundColor: '#dc2626',
    borderRadius: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.35)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  btn3dIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  btn3dTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  btn3dLabel: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  btn3dNum: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '900',
  },
  quickBadgesLeft: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  qbadgeRounded: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8AB3CB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  qbadgeTextWhite: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  qbadgeIconYellow: {
    color: '#F59E0B',
    fontSize: 14,
    fontWeight: 'bold',
  },
  centeredTileRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  tileIcon3dContainer: {
    width: 52,
    height: 52,
    marginBottom: 8,
    position: 'relative',
  },
  tileIcon3dBase: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 48,
    borderRadius: 14,
  },
  tileIcon3dTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.4)',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
  },
  testimonialBorder: {
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  // About Modal Styles translated from HTML/CSS
  aboutModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  aboutModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    padding: 20,
  },
  aboutModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 14,
    marginBottom: 14,
  },
  aboutScreenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  aboutScreenSub: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '600',
  },
  aboutCloseBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  aboutScrollBody: {
    paddingBottom: 24,
  },
  aboutHero: {
    marginBottom: 16,
  },
  aboutText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#374151',
  },
  infoList: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoItemIcon: {
    fontSize: 18,
    marginRight: 12,
    marginTop: 2,
  },
  infoItemTextWrap: {
    flex: 1,
  },
  infoItemLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
  },
  infoItemValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 2,
    lineHeight: 18,
  },
  aboutActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  btnSecondary: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  btnSecondaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  faqWrap: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
  },
  faqH: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  },
  faqBox: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  faqQ: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  faqA: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
});

export default HomeScreen;