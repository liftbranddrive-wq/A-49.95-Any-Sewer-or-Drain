import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { API_BASE_URL } from '../config/constants';
import MyBookingsScreen from './MyBookingsScreen';

const DynamicIcon = ({ name, size = 22, color = '#333', style }) => {
  const isFA5 = ['shower', 'faucet', 'tools', 'wrench'].includes(name);
  if (isFA5) {
    return <FontAwesome5 name={name} size={size} color={color} style={style} />;
  }
  return <MaterialCommunityIcons name={name || 'pipe'} size={size} color={color} style={style} />;
};

export default function BookingScreen({ userToken, navigation, servicesList = [], route }) {
  const [services, setServices] = useState(servicesList);
  const [loadingServices, setLoadingServices] = useState(false);
  const [servicesFetchError, setServicesFetchError] = useState('');

  // Extract highlight service ID from route params (if navigated via notification/deep link)
  const serviceIdToHighlight = route?.params?.service_id || route?.params?.serviceId;

  // Flow State
  const [step, setStep] = useState('service_selection'); // 'service_selection' | 'booking_flow'
  const [bookingStep, setBookingStep] = useState(1); // 1: Date, 2: Time Slot, 3: Details
  const [selectedService, setSelectedService] = useState(null);

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Slots State
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [consent, setConsent] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    if (Array.isArray(servicesList) && servicesList.length > 0) {
      setServices(servicesList);
      setLoadingServices(false);
    } else {
      fetchServicesFromBackend();
    }
  }, []);

  // Auto-select service if navigated from a notification/deep link with a service ID
  useEffect(() => {
    if (serviceIdToHighlight && services.length > 0 && !selectedService) {
      const targetService = services.find(
        (s) => String(s.id) === String(serviceIdToHighlight)
      );
      if (targetService) {
        console.log("Auto-selecting service from notification:", targetService.title || targetService.name);
        handleSelectService(targetService);
      }
    }
  }, [serviceIdToHighlight, services]);

  const fetchServicesFromBackend = async () => {
    setLoadingServices(true);
    setServicesFetchError('');
    try {
      const headers = { Accept: 'application/json' };
      if (userToken) headers['Authorization'] = `Bearer ${userToken}`;

      const response = await fetch(`${API_BASE_URL}/api/services`, { headers });
      if (!response.ok) throw new Error(`HTTP ${response.status}: Failed to fetch services`);

      const data = await response.json();
      const fetchedList = Array.isArray(data) ? data : data.services || data.data || [];
      setServices(fetchedList.filter((s) => s.is_active !== false));
    } catch (err) {
      setServicesFetchError(err.message || 'Failed to connect to backend server.');
    } finally {
      setLoadingServices(false);
    }
  };

  const fetchSlotsForDate = async (dateObj, serviceOverride = null) => {
    const activeService = serviceOverride || selectedService;

    if (!activeService || !activeService.id) {
      setError('Please select a valid service.');
      return;
    }

    setSelectedDate(dateObj);
    setSelectedSlot(null);
    setLoadingSlots(true);
    setError('');
    setSlots([]);

    try {
      const start = new Date(dateObj);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateObj);
      end.setHours(23, 59, 59, 999);

      const response = await fetch(`${API_BASE_URL}/api/auth/ghl/slots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: userToken ? `Bearer ${userToken}` : '',
        },
        body: JSON.stringify({
          serviceId: activeService.id,
          service_id: activeService.id,
          calendarId: activeService.ghl_calendar_id,
          calendar_id: activeService.ghl_calendar_id,
          startDate: start.getTime(),
          endDate: end.getTime(),
        }),
      });

      const responseData = await response.json();
      if (!response.ok) throw new Error(responseData.detail || 'Failed to fetch slots');

      const ghlData = responseData.data || responseData;
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;

      let availableTimes = [];
      if (ghlData[dateString]) {
        const dayData = ghlData[dateString];
        availableTimes = Array.isArray(dayData) ? dayData : dayData.slots || [];
      } else {
        const dateKeys = Object.keys(ghlData).filter((key) => key !== 'traceId');
        if (dateKeys.length > 0) {
          const firstKeyData = ghlData[dateKeys[0]];
          availableTimes = Array.isArray(firstKeyData) ? firstKeyData : firstKeyData.slots || [];
        }
      }
      setSlots(availableTimes);
    } catch (err) {
      setError(err.message || 'Failed to communicate with booking server.');
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleSelectService = (service) => {
    setSelectedService(service);
    setStep('booking_flow');
    setBookingStep(1);
    const today = new Date();
    setSelectedDate(today);
    setCurrentMonth(today);
  };

  const handleFinalBooking = async () => {
    if (!firstName || !lastName || !email || !phone) {
      return Alert.alert('Missing Details', 'Please complete all required contact fields.');
    }
    if (!selectedSlot) {
      return Alert.alert('Select Time', 'Please select an available time slot.');
    }

    setBookingLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/ghl/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: userToken ? `Bearer ${userToken}` : '',
        },
        body: JSON.stringify({
          serviceId: selectedService?.id,
          service_id: selectedService?.id,
          calendarId: selectedService?.ghl_calendar_id,
          calendar_id: selectedService?.ghl_calendar_id,
          ghl_calendar_id: selectedService?.ghl_calendar_id,
          selectedSlot: selectedSlot,
          selected_slot: selectedSlot,
          startTime: selectedSlot,
          start_time: selectedSlot,
          firstName,
          first_name: firstName,
          lastName,
          last_name: lastName,
          email,
          phone,
          additionalInformation: additionalInfo,
          additional_information: additionalInfo,
          notes: `[Service: ${selectedService?.title || 'Service'}] ${additionalInfo}`,
          consent: consent ?? true,
        }),
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Server Error (${response.status}): ${responseText}`);
      }

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to finalize booking.');
      }

      const formattedDate = selectedDate.toDateString();
      const formattedTime = new Date(selectedSlot).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      const serviceName = selectedService?.title || selectedService?.name || 'Service';

      Alert.alert(
        'Appointment Booked!',
        `Service: ${serviceName}\nDate: ${formattedDate}\nTime: ${formattedTime}\n\nOur team will contact you soon to confirm details.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset state
              setStep('service_selection');
              setBookingStep(1);
              setSelectedSlot(null);
              setSelectedService(null);

              // Navigate to MyBookings (triggers useFocusEffect on MyBookingsScreen)
              if (navigation) {
                navigation.navigate('MyBookingsScreen');
              }
            },
          },
        ]
      );
    } catch (err) {
      Alert.alert('Booking Error', err.message);
    } finally {
      setBookingLoading(false);
    }
  };

  // ================= CALENDAR UTILS =================
  const changeMonth = (increment) => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + increment, 1);
    setCurrentMonth(newMonth);
  };

  const renderMonthCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(<View key={`empty-${i}`} style={styles.calendarDayEmpty} />);
    }

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dateObj = new Date(year, month, day);
      dateObj.setHours(0, 0, 0, 0);

      const isPast = dateObj < today;
      const isSelected =
        selectedDate.getDate() === day &&
        selectedDate.getMonth() === month &&
        selectedDate.getFullYear() === year;

      days.push(
        <TouchableOpacity
          key={`day-${day}`}
          disabled={isPast}
          style={[
            styles.calendarDay,
            isSelected && styles.calendarDaySelected,
            isPast && styles.calendarDayDisabled,
          ]}
          onPress={() => {
            setSelectedDate(dateObj);
            fetchSlotsForDate(dateObj, selectedService);
            setBookingStep(2);
          }}
        >
          <Text
            style={[
              styles.calendarDayText,
              isSelected && styles.calendarDayTextSelected,
              isPast && styles.calendarDayTextDisabled,
            ]}
          >
            {day}
          </Text>
        </TouchableOpacity>
      );
    }

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    return (
      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity style={styles.monthNavBtn} onPress={() => changeMonth(-1)}>
            <Text style={styles.monthNavText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthTitle}>
            {monthNames[month]} {year}
          </Text>
          <TouchableOpacity style={styles.monthNavBtn} onPress={() => changeMonth(1)}>
            <Text style={styles.monthNavText}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.weekHeader}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
            <Text key={i} style={styles.weekHeaderText}>{d}</Text>
          ))}
        </View>

        <View style={styles.daysGrid}>{days}</View>
      </View>
    );
  };

  if (step === 'service_selection') {
    return (
      <View style={styles.container}>
        <Text style={styles.headerTitle}>Select a Service</Text>
        <ScrollView contentContainerStyle={styles.serviceList}>
          {loadingServices ? (
            <ActivityIndicator size="large" color="#0066CC" style={{ marginTop: 20 }} />
          ) : servicesFetchError ? (
            <View style={styles.centerBox}>
              <Text style={styles.errorText}>{servicesFetchError}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={fetchServicesFromBackend}>
                <Text style={styles.retryBtnText}>Retry Connection</Text>
              </TouchableOpacity>
            </View>
          ) : services.length === 0 ? (
            <View style={styles.centerBox}>
              <Text style={styles.emptyText}>No active services available.</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={fetchServicesFromBackend}>
                <Text style={styles.retryBtnText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          ) : (
            services.map((service, index) => (
              <TouchableOpacity
                key={service.id || index}
                style={styles.serviceCard}
                onPress={() => handleSelectService(service)}
              >
                <View style={styles.serviceCardHeader}>
                  <DynamicIcon name={service.icon} size={24} color="#0066CC" style={{ marginRight: 10 }} />
                  <Text style={styles.serviceTitle}>{service.title || service.name}</Text>
                </View>
                {service.description ? (
                  <Text style={styles.serviceSubtext}>{service.description}</Text>
                ) : (
                  <Text style={styles.serviceSubtext}>Tap to check calendar availability</Text>
                )}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topHeader}>
        <TouchableOpacity
          onPress={() => {
            if (bookingStep > 1) {
              setBookingStep(bookingStep - 1);
            } else {
              setStep('service_selection');
            }
          }}
          style={styles.backBtn}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.serviceNameHeader} numberOfLines={1}>
          {selectedService?.title}
        </Text>
      </View>

      <View style={styles.stepIndicatorContainer}>
        <TouchableOpacity
          style={[styles.stepBadge, bookingStep === 1 && styles.stepBadgeActive]}
          onPress={() => setBookingStep(1)}
        >
          <Text style={[styles.stepBadgeText, bookingStep === 1 && styles.stepBadgeTextActive]}>1. Date</Text>
        </TouchableOpacity>
        <View style={styles.stepLine} />
        <TouchableOpacity
          style={[styles.stepBadge, bookingStep === 2 && styles.stepBadgeActive]}
          onPress={() => setBookingStep(2)}
        >
          <Text style={[styles.stepBadgeText, bookingStep === 2 && styles.stepBadgeTextActive]}>2. Time</Text>
        </TouchableOpacity>
        <View style={styles.stepLine} />
        <TouchableOpacity
          style={[styles.stepBadge, bookingStep === 3 && styles.stepBadgeActive]}
          onPress={() => selectedSlot && setBookingStep(3)}
        >
          <Text style={[styles.stepBadgeText, bookingStep === 3 && styles.stepBadgeTextActive]}>3. Details</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.bookingScrollContainer}>
        {bookingStep === 1 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Select Date</Text>
            {renderMonthCalendar()}
          </View>
        )}

        {bookingStep === 2 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              Available Slots for {selectedDate.toDateString()}
            </Text>
            {loadingSlots ? (
              <ActivityIndicator size="large" color="#0066CC" style={{ marginVertical: 20 }} />
            ) : error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : slots.length === 0 ? (
              <Text style={styles.emptyText}>No available slots for this date.</Text>
            ) : (
              <View style={styles.slotContainer}>
                {slots.map((slot, index) => {
                  const slotValue = typeof slot === 'string' ? slot : slot.time || slot.start;
                  const isSelected = selectedSlot === slotValue;
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[styles.slotChip, isSelected && styles.slotChipSelected]}
                      onPress={() => {
                        setSelectedSlot(slotValue);
                        setBookingStep(3);
                      }}
                    >
                      <Text style={[styles.slotText, isSelected && styles.slotTextSelected]}>
                        {new Date(slotValue).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setBookingStep(1)}>
              <Text style={styles.secondaryBtnText}>← Change Date</Text>
            </TouchableOpacity>
          </View>
        )}

        {bookingStep === 3 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Contact Details</Text>
            <Text style={styles.summaryText}>
              📅 {selectedDate.toDateString()} at{' '}
              {selectedSlot ? new Date(selectedSlot).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
            </Text>

            <TextInput style={styles.input} placeholder="First Name *" value={firstName} onChangeText={setFirstName} />
            <TextInput style={styles.input} placeholder="Last Name *" value={lastName} onChangeText={setLastName} />
            <TextInput style={styles.input} placeholder="Email *" keyboardType="email-address" value={email} onChangeText={setEmail} />
            <TextInput style={styles.input} placeholder="Phone *" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
            <TextInput
              style={[styles.input, { height: 70 }]}
              placeholder="Additional Notes (Optional)"
              multiline
              value={additionalInfo}
              onChangeText={setAdditionalInfo}
            />

            <TouchableOpacity style={styles.bookBtn} onPress={handleFinalBooking} disabled={bookingLoading}>
              {bookingLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.bookBtnText}>Confirm Appointment</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setBookingStep(2)}>
              <Text style={styles.secondaryBtnText}>← Change Time Slot</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA', paddingTop: 40 },
  topHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', paddingHorizontal: 16, marginBottom: 12 },
  serviceNameHeader: { fontSize: 16, fontWeight: 'bold', color: '#333', marginLeft: 12, flex: 1 },
  serviceList: { paddingHorizontal: 16 },
  serviceCard: { backgroundColor: '#FFF', padding: 18, borderRadius: 10, marginBottom: 12, elevation: 2 },
  serviceCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  serviceTitle: { fontSize: 18, fontWeight: '600', color: '#111' },
  serviceSubtext: { fontSize: 13, color: '#666', marginTop: 4 },
  backBtn: { paddingVertical: 4 },
  backButtonText: { color: '#0066CC', fontSize: 16, fontWeight: '600' },
  stepIndicatorContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 10, paddingHorizontal: 16 },
  stepBadge: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: '#E0E0E0' },
  stepBadgeActive: { backgroundColor: '#0066CC' },
  stepBadgeText: { fontSize: 12, color: '#666', fontWeight: 'bold' },
  stepBadgeTextActive: { color: '#FFF' },
  stepLine: { height: 2, backgroundColor: '#CCC', width: 20, marginHorizontal: 4 },
  bookingScrollContainer: { paddingHorizontal: 16, paddingBottom: 40 },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#111' },
  summaryText: { fontSize: 14, color: '#0066CC', fontWeight: '600', marginBottom: 14 },
  calendarContainer: { backgroundColor: '#FFF', borderRadius: 8, padding: 8 },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  monthTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  monthNavBtn: { paddingHorizontal: 14, paddingVertical: 4, backgroundColor: '#F0F4F8', borderRadius: 6 },
  monthNavText: { fontSize: 20, fontWeight: 'bold', color: '#0066CC' },
  weekHeader: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 },
  weekHeaderText: { width: 36, textAlign: 'center', fontSize: 12, fontWeight: 'bold', color: '#888' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calendarDay: { width: '14.28%', height: 40, justifyContent: 'center', alignItems: 'center', marginVertical: 2, borderRadius: 20 },
  calendarDayEmpty: { width: '14.28%', height: 40 },
  calendarDaySelected: { backgroundColor: '#0066CC' },
  calendarDayDisabled: { opacity: 0.3 },
  calendarDayText: { fontSize: 14, color: '#333', fontWeight: '500' },
  calendarDayTextSelected: { color: '#FFF', fontWeight: 'bold' },
  calendarDayTextDisabled: { color: '#999' },
  slotContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 12 },
  slotChip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#F0F0F0' },
  slotChipSelected: { backgroundColor: '#0066CC' },
  slotText: { color: '#333' },
  slotTextSelected: { color: '#FFF', fontWeight: 'bold' },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, marginBottom: 10 },
  bookBtn: { backgroundColor: '#0066CC', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  bookBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  secondaryBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 8 },
  secondaryBtnText: { color: '#0066CC', fontWeight: '600' },
  errorText: { color: '#d32f2f', fontSize: 14, textAlign: 'center', marginBottom: 8 },
  emptyText: { color: '#666', fontSize: 14, textAlign: 'center', marginVertical: 16 },
  centerBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  retryBtn: { backgroundColor: '#0066CC', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8, marginTop: 8 },
  retryBtnText: { color: '#FFF', fontWeight: 'bold' },
});