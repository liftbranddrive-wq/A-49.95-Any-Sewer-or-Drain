import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  // Global & Core Containers
  container: { 
    flex: 1, 
    backgroundColor: '#55BCE2' 
  },
  screenBackground: {
    flex: 1,
    backgroundColor: '#55BCE2',
  },
  scrollContainer: {
    padding: 16,
    flexGrow: 1,
    backgroundColor: '#55BCE2',
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20 
  },
  title: { 
    fontSize: 22, 
    fontWeight: '800', 
    color: '#0A0F1F', 
    marginBottom: 8 
  },
  statusText: { 
    fontSize: 16, 
    color: '#0A0F1F', 
    marginBottom: 10, 
    textAlign: 'center', 
    fontWeight: '700' 
  },
  button: { 
    backgroundColor: '#FFE85C', 
    paddingVertical: 16, 
    paddingHorizontal: 20, 
    borderRadius: 20, 
    width: '80%', 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4
  },
  buttonText: { 
    color: '#0A0F1F', 
    fontWeight: '800', 
    fontSize: 16 
  },

  // Home Screen Specific Components
  heroCard: {
    backgroundColor: '#0A0F1F',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#0A0F1F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
    marginRight: 6,
  },
  changeLocationPill: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  changeLocationText: {
    color: '#FFE85C',
    fontSize: 12,
    fontWeight: '600',
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 32,
    marginBottom: 8,
  },
  heroTitleY: {
    color: '#FFE85C',
  },
  heroSub: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 16,
  },
  callBtn3d: {
    backgroundColor: '#22C55E',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  callBtn3dInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callBtn3dIcon: {
    marginRight: 12,
  },
  callBtn3dTextContainer: {
    alignItems: 'flex-start',
  },
  callBtn3dLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  callBtn3dNum: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  quickBadges: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  qbadge: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  qbadgeText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
  tileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  tile: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.90)',
    borderRadius: 20,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    shadowColor: '#0A0F1F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  tileIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  tileIconYellow: { backgroundColor: '#FFE85C' },
  tileIconBlue: { backgroundColor: '#BAE6FD' },
  tileIconGreen: { backgroundColor: '#BBF7D0' },
  tileLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0A0F1F',
  },
  trustStrip: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.90)',
    borderRadius: 20,
    padding: 16,
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    shadowColor: '#0A0F1F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  trustStat: {
    alignItems: 'center',
  },
  trustNum: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0A0F1F',
  },
  trustLbl: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  trustDiv: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(10, 15, 31, 0.15)',
  },
  testimonial: {
    backgroundColor: 'rgba(255, 255, 255, 0.90)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    shadowColor: '#0A0F1F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  testimonialStars: {
    color: '#EAB308',
    fontSize: 14,
    marginBottom: 6,
  },
  testimonialText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#0A0F1F',
    marginBottom: 6,
    fontWeight: '500',
  },
  testimonialAuthor: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },

  // Modal Components
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 15, 31, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    elevation: 6,
    shadowColor: '#0A0F1F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0A0F1F',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
  },
  locationOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationOptionSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  locationOptionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  locationOptionTextSelected: {
    color: '#2563EB',
  },

  // Auth Screen Components
  authContainer: { 
    flex: 1, 
    backgroundColor: '#55BCE2' 
  },
  authInner: { 
    flex: 1, 
    justifyContent: 'center', 
    padding: 24 
  },
  authHeader: { 
    alignItems: 'center', 
    marginBottom: 32 
  },
  headerTitle: { 
    fontSize: 28, 
    fontWeight: '900', 
    color: '#FFFFFF', 
    marginBottom: 8,
    textShadowColor: 'rgba(10, 15, 31, 0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4
  },
  headerSubtitle: { 
    fontSize: 16, 
    color: '#0A0F1F', 
    fontWeight: '500',
    opacity: 0.85 
  },
  authForm: { 
    backgroundColor: 'rgba(255, 255, 255, 0.85)', 
    padding: 24, 
    borderRadius: 28, 
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#0A0F1F', 
    shadowOffset: { width: 0, height: 8 }, 
    shadowOpacity: 0.12, 
    shadowRadius: 16, 
    elevation: 6 
  },
  input: { 
    backgroundColor: '#FFFFFF', 
    paddingHorizontal: 18, 
    paddingVertical: 14, 
    borderRadius: 16, 
    fontSize: 16, 
    color: '#0A0F1F',
    marginBottom: 16, 
    borderWidth: 1.5, 
    borderColor: 'rgba(85, 188, 226, 0.35)' 
  },
  primaryButton: { 
    backgroundColor: '#FFD42A', 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingVertical: 16, 
    borderRadius: 20,
    shadowColor: '#FFD42A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5
  },
  toggleAuth: { 
    marginTop: 20, 
    alignItems: 'center' 
  },
  toggleAuthText: { 
    color: '#0A0F1F', 
    fontWeight: '700', 
    fontSize: 14 
  },
  errorText: { 
    color: '#E63946', 
    marginBottom: 16, 
    textAlign: 'center', 
    fontWeight: '700' 
  },

  // Cards & Action Elements
  card: { 
    backgroundColor: 'rgba(255, 255, 255, 0.90)', 
    borderRadius: 28, 
    padding: 24, 
    shadowColor: '#0A0F1F', 
    shadowOffset: { width: 0, height: 6 }, 
    shadowOpacity: 0.10, 
    shadowRadius: 14, 
    elevation: 5, 
    borderColor: 'rgba(255, 255, 255, 0.7)', 
    borderWidth: 1.5, 
    marginBottom: 20, 
    marginHorizontal: 20, 
    marginTop: 20 
  },
  cardTitle: { 
    fontSize: 20, 
    fontWeight: '800', 
    color: '#0A0F1F', 
    marginBottom: 12 
  },
  secondaryButton: { 
    backgroundColor: 'transparent', 
    borderWidth: 2, 
    borderColor: '#0A0F1F', 
    paddingVertical: 14,
    borderRadius: 20,
    marginHorizontal: 20 
  },
  buttonIcon: { 
    marginRight: 10 
  },

  // Interactive Selectors (Pills & Slot Buttons)
  datePill: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: 'rgba(255, 255, 255, 0.85)', 
    paddingVertical: 12, 
    paddingHorizontal: 16, 
    borderRadius: 20, 
    marginRight: 10, 
    borderWidth: 1.5, 
    borderColor: 'rgba(255, 255, 255, 0.9)', 
    height: 70, 
    minWidth: 70 
  },
  datePillActive: { 
    backgroundColor: '#FFD42A', 
    borderColor: '#FFE85C',
    shadowColor: '#FFD42A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  datePillText: { 
    fontSize: 13, 
    color: '#0A0F1F', 
    marginBottom: 4,
    opacity: 0.7 
  },
  datePillNumber: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: '#0A0F1F' 
  },
  datePillTextActive: { 
    color: '#0A0F1F',
    fontWeight: '800' 
  },
  slotsGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between', 
    marginTop: 10 
  },
  slotButton: { 
    width: '48%', 
    backgroundColor: 'rgba(255, 255, 255, 0.85)', 
    paddingVertical: 14, 
    borderRadius: 16, 
    borderWidth: 1.5, 
    borderColor: 'rgba(255, 255, 255, 0.9)', 
    alignItems: 'center', 
    marginBottom: 12 
  },
  slotButtonActive: { 
    backgroundColor: '#FFD42A', 
    borderColor: '#FFE85C',
    shadowColor: '#FFD42A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3
  },
  slotButtonText: { 
    fontSize: 16, 
    color: '#0A0F1F', 
    fontWeight: '700' 
  },
  slotButtonTextActive: { 
    color: '#0A0F1F',
    fontWeight: '800' 
  },
  heroCard: {
    // Glassmorphism styling with base color #78cfee
    backgroundColor: 'rgba(120, 207, 238, 0.85)', // #78cfee with 85% opacity
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,

    // Glassy border highlight
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',

    // Soft shadow for elevation over background
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,}
});