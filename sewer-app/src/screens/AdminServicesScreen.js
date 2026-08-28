import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { AuthContext } from '../context/authContext';
import { API_BASE_URL } from '../config/constants';

// 20 Relevant Plumbing & Drain Icons (All names verified for Expo)
const AVAILABLE_ICONS = [
  { id: 'toilet', name: 'toilet', family: 'MCI', label: 'Toilet' },
  { id: 'shower-head', name: 'shower-head', family: 'MCI', label: 'Shower Head' },
  { id: 'shower', name: 'shower', family: 'FA5', label: 'Bathtub / Shower' },
  { id: 'faucet', name: 'faucet', family: 'FA5', label: 'Tap / Faucet' },
  { id: 'pipe', name: 'pipe', family: 'MCI', label: 'Sewer / Drain Pipe' },
  { id: 'pipe-leak', name: 'pipe-leak', family: 'MCI', label: 'Sewer Drain Leak' },
  { id: 'pipe-disconnected', name: 'pipe-disconnected', family: 'MCI', label: 'Broken Sewer Pipe' },
  { id: 'water-pump', name: 'water-pump', family: 'MCI', label: 'Sump Pump' },
  { id: 'water-alert', name: 'water-alert', family: 'MCI', label: 'Sewer Backup' },
  { id: 'water-off', name: 'water-off', family: 'MCI', label: 'Clogged Line' },
  { id: 'water', name: 'water', family: 'MCI', label: 'Water Flow' },
  { id: 'home-roof', name: 'home-roof', family: 'MCI', label: 'Leader Line' },
  { id: 'grass', name: 'grass', family: 'MCI', label: 'Yard Drain' },
  { id: 'weather-rainy', name: 'weather-rainy', family: 'MCI', label: 'Storm Sewer' },
  { id: 'alert-circle-outline', name: 'alert-circle-outline', family: 'MCI', label: 'Sewer Clog' },
  { id: 'tools', name: 'tools', family: 'FA5', label: 'Pipe Repair' },
  { id: 'wrench', name: 'wrench', family: 'FA5', label: 'Plumbing Tools' },
  { id: 'shield-search', name: 'shield-search', family: 'MCI', label: 'Camera Inspection' },
  { id: 'fire-hydrant', name: 'fire-hydrant', family: 'MCI', label: 'Hydro-jetting' },
  { id: 'dump-truck', name: 'dump-truck', family: 'MCI', label: 'Cleanout' },
];

// Fallback lookup map for invalid or legacy icon names from existing DB records
const LEGACY_ICON_MAP = {
  'construct-outline': { name: 'wrench-outline', family: 'MCI' },
  construct: { name: 'wrench', family: 'MCI' },
};

// Helper Component to render the correct Icon Set based on family
const DynamicIcon = ({ name, size = 22, color = '#333', style }) => {
  let iconConfig = AVAILABLE_ICONS.find((i) => i.id === name);

  if (!iconConfig && LEGACY_ICON_MAP[name]) {
    iconConfig = LEGACY_ICON_MAP[name];
  }

  const family = iconConfig ? iconConfig.family : 'MCI';
  const iconName = iconConfig ? iconConfig.name : 'pipe';

  if (family === 'FA5') {
    return <FontAwesome5 name={iconName} size={size} color={color} style={style} />;
  }
  return <MaterialCommunityIcons name={iconName} size={size} color={color} style={style} />;
};

export default function AdminServicesScreen() {
  const { userToken } = useContext(AuthContext);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingService, setEditingService] = useState(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('');
  const [ghlCalendarId, setGhlCalendarId] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('pipe');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchServices = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/services/admin/all`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const data = await response.json();
      if (response.ok) {
        setServices(data);
      } else {
        Alert.alert('Error', data.detail || 'Failed to fetch services.');
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const openModal = (service = null) => {
    if (service) {
      setEditingService(service);
      setTitle(service.title || '');
      setDescription(service.description || '');
      const rawMinutes = service.duration ? service.duration.replace(/[^0-9]/g, '') : '';
      setDuration(rawMinutes);
      setGhlCalendarId(service.ghl_calendar_id || '');
      setSelectedIcon(service.icon || 'pipe');
      setIsActive(service.is_active ?? true);
    } else {
      setEditingService(null);
      setTitle('');
      setDescription('');
      setDuration('');
      setGhlCalendarId('');
      setSelectedIcon('pipe');
      setIsActive(true);
    }
    setModalVisible(true);
  };

  const handleSaveService = async () => {
    const cleanDuration = duration.replace(/[^0-9]/g, '');

    if (!title.trim() || !description.trim() || !cleanDuration) {
      return Alert.alert('Error', 'Please fill in Title, Description, and Duration in minutes.');
    }

    setSubmitting(true);
    const endpoint = editingService
      ? `${API_BASE_URL}/api/services/admin/${editingService.id}`
      : `${API_BASE_URL}/api/services/admin`;
    const method = editingService ? 'PUT' : 'POST';

    const payload = {
      title: title.trim(),
      description: description.trim(),
      duration: `${cleanDuration} mins`,
      ghl_calendar_id: ghlCalendarId.trim() || null,
      icon: selectedIcon,
      is_active: isActive,
    };

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to save service.');
      }

      Alert.alert('Success', `Service ${editingService ? 'updated' : 'added'} successfully.`);
      setModalVisible(false);
      fetchServices();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteService = (serviceId, serviceTitle) => {
    Alert.alert(
      'Delete Service',
      `Are you sure you want to delete "${serviceTitle}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_BASE_URL}/api/services/admin/${serviceId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${userToken}` },
              });

              const data = await response.json().catch(() => ({}));
              if (!response.ok) {
                throw new Error(data.detail || 'Could not delete service.');
              }

              // Instantly remove service from local list view
              setServices((prevServices) => prevServices.filter((s) => s.id !== serviceId));
              Alert.alert('Success', 'Service deleted successfully.');
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0b57d0" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeAreaContainer}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.addBtn} onPress={() => openModal()}>
          <MaterialCommunityIcons name="plus" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Add New Service</Text>
        </TouchableOpacity>

        <FlatList
          data={services}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.titleRow}>
                  <DynamicIcon
                    name={item.icon || 'pipe'}
                    size={24}
                    color="#0b57d0"
                    style={{ marginRight: 10 }}
                  />
                  <Text style={styles.serviceTitle}>{item.title}</Text>
                </View>
                <Text style={styles.durationBadge}>{item.duration}</Text>
              </View>

              <Text style={styles.description}>{item.description}</Text>

              {/* Show attached GHL Calendar ID if configured */}
              <View style={styles.calendarInfoRow}>
                <MaterialCommunityIcons name="calendar-sync" size={16} color="#666" />
                <Text style={styles.calendarInfoText}>
                  Calendar ID: {item.ghl_calendar_id ? item.ghl_calendar_id : 'Not Set'}
                </Text>
              </View>

              <View style={styles.cardFooter}>
                <View
                  style={[
                    styles.badge,
                    item.is_active ? styles.activeBadge : styles.inactiveBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      item.is_active ? styles.activeBadgeText : styles.inactiveBadgeText,
                    ]}
                  >
                    {item.is_active ? 'Active' : 'Hidden'}
                  </Text>
                </View>

                <View style={styles.actions}>
                  <TouchableOpacity onPress={() => openModal(item)} style={styles.actionBtn}>
                    <MaterialCommunityIcons name="pencil-outline" size={20} color="#0288d1" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => handleDeleteService(item.id, item.title)} 
                    style={styles.actionBtn}
                  >
                    <MaterialCommunityIcons name="trash-can-outline" size={20} color="#d32f2f" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        />

        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent={true}
          statusBarTranslucent={true}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.modalKeyboardContainer}
            >
              <View style={styles.modalContent}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
                  <Text style={styles.modalTitle}>
                    {editingService ? 'Edit Service' : 'Add New Service'}
                  </Text>

                  <Text style={styles.fieldLabel}>Service Title</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Sewer Leak Repair"
                    value={title}
                    onChangeText={setTitle}
                  />

                  <Text style={styles.fieldLabel}>Description</Text>
                  <TextInput
                    style={[styles.input, { height: 70 }]}
                    placeholder="Service details..."
                    value={description}
                    onChangeText={setDescription}
                    multiline
                  />

                  <Text style={styles.fieldLabel}>Duration (in Minutes)</Text>
                  <View style={styles.durationInputContainer}>
                    <TextInput
                      style={styles.durationInput}
                      placeholder="e.g. 45"
                      value={duration}
                      onChangeText={(val) => setDuration(val.replace(/[^0-9]/g, ''))}
                      keyboardType="numeric"
                    />
                    <Text style={styles.durationSuffix}>mins</Text>
                  </View>

                  {/* GHL Calendar ID Input */}
                  <Text style={styles.fieldLabel}>GoHighLevel Calendar ID</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. ghl_cal_123456789"
                    value={ghlCalendarId}
                    onChangeText={setGhlCalendarId}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />

                  <Text style={styles.fieldLabel}>Select Display Icon</Text>
                  <View style={styles.iconGrid}>
                    {AVAILABLE_ICONS.map((icon) => (
                      <TouchableOpacity
                        key={icon.id}
                        style={[
                          styles.iconOption,
                          selectedIcon === icon.id && styles.selectedIconOption,
                        ]}
                        onPress={() => setSelectedIcon(icon.id)}
                      >
                        <DynamicIcon
                          name={icon.id}
                          size={22}
                          color={selectedIcon === icon.id ? '#0b57d0' : '#666'}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.switchRow}>
                    <Text style={styles.label}>Visible to Clients:</Text>
                    <Switch value={isActive} onValueChange={setIsActive} />
                  </View>

                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={[styles.btn, styles.cancelBtn]}
                      onPress={() => setModalVisible(false)}
                    >
                      <Text style={styles.btnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.btn, styles.saveBtn]} onPress={handleSaveService}>
                      {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Save</Text>}
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
    backgroundColor: '#f4f6f8',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: { flex: 1, padding: 16, backgroundColor: '#f4f6f8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  addBtn: {
    flexDirection: 'row',
    backgroundColor: '#0b57d0',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 8,
  },
  addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 10, marginBottom: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  serviceTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  durationBadge: { fontSize: 13, fontWeight: '600', color: '#0b57d0', backgroundColor: '#e8f0fe', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  description: { color: '#666', fontSize: 14, marginBottom: 10 },

  calendarInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, backgroundColor: '#f9f9f9', padding: 6, borderRadius: 6 },
  calendarInfoText: { fontSize: 12, color: '#555', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  activeBadge: { backgroundColor: '#e8f5e9' },
  inactiveBadge: { backgroundColor: '#ffebee' },
  badgeText: { fontSize: 12, fontWeight: '600' },
  activeBadgeText: { color: '#2e7d32' },
  inactiveBadgeText: { color: '#c62828' },
  actions: { flexDirection: 'row', gap: 12 },
  actionBtn: { padding: 4 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 20 : 50,
    paddingBottom: 30,
  },
  modalKeyboardContainer: {
    width: '100%',
    maxHeight: '90%',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    maxHeight: '100%',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 14 },
  durationInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 14,
  },
  durationInput: { flex: 1, paddingVertical: 10 },
  durationSuffix: { color: '#666', fontWeight: '600', marginLeft: 8 },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  iconOption: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#f9f9f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedIconOption: { borderColor: '#0b57d0', backgroundColor: '#e8f0fe' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#444' },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
  btn: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  cancelBtn: { backgroundColor: '#888' },
  saveBtn: { backgroundColor: '#0b57d0' },
  btnText: { color: '#fff', fontWeight: 'bold' },
});