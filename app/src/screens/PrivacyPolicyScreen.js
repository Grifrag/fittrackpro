import React from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SECTIONS = [
  { title: '1. Ποιοι είμαστε', content: 'Το FitTrack Pro είναι εφαρμογή παρακολούθησης διατροφής και άσκησης. Διαχειριζόμαστε τα δεδομένα σου με πλήρη διαφάνεια και σεβασμό στην ιδιωτικότητά σου.' },
  { title: '2. Ποια δεδομένα συλλέγουμε', content: 'Συλλέγουμε: email και κωδικό πρόσβασης (κρυπτογραφημένο), σωματικά στοιχεία που εισάγεις (βάρος, ύψος), καταγραφές γευμάτων και προπονήσεων, δεδομένα προόδου.' },
  { title: '3. Πώς χρησιμοποιούμε τα δεδομένα', content: 'Τα δεδομένα σου χρησιμοποιούνται αποκλειστικά για τη λειτουργία της εφαρμογής. ΔΕΝ πωλούμε ή μοιραζόμαστε δεδομένα με τρίτους.' },
  { title: '4. Πληρωμές', content: 'Οι πληρωμές επεξεργάζονται από την Stripe (stripe.com). Δεν αποθηκεύουμε στοιχεία κάρτας.' },
  { title: '5. Ασφάλεια', content: 'Οι κωδικοί αποθηκεύονται κρυπτογραφημένοι (bcrypt). Η επικοινωνία γίνεται μέσω HTTPS. Δεδομένα αποθηκεύονται σε ασφαλείς servers (Supabase/AWS).' },
  { title: '6. Δικαιώματά σου (GDPR)', content: 'Έχεις δικαίωμα πρόσβασης, διόρθωσης ή διαγραφής των δεδομένων σου. Για αίτημα: fittrackpro.app@gmail.com' },
  { title: '7. Επικοινωνία', content: 'fittrackpro.app@gmail.com' },
  { title: '8. Αλλαγές', content: 'Ενδέχεται να ενημερώσουμε αυτή την πολιτική. Τελευταία ενημέρωση: Μάρτιος 2026.' },
];

export default function PrivacyPolicyScreen({ navigation }) {
  return (
    <ScrollView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={s.title}>Πολιτική Απορρήτου</Text>
        <Text style={s.subtitle}>FitTrack Pro</Text>
      </View>
      {SECTIONS.map((sec, i) => (
        <View key={i} style={s.section}>
          <Text style={s.sectionTitle}>{sec.title}</Text>
          <Text style={s.sectionContent}>{sec.content}</Text>
        </View>
      ))}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#F8F9FA' },
  header:         { backgroundColor: '#1F4E79', padding: 24, paddingTop: 56 },
  backBtn:        { marginBottom: 12 },
  title:          { color: '#fff', fontSize: 22, fontWeight: '800' },
  subtitle:       { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 4 },
  section:        { backgroundColor: '#fff', margin: 12, marginBottom: 0, borderRadius: 12, padding: 16 },
  sectionTitle:   { fontSize: 15, fontWeight: '700', color: '#1A1A2E', marginBottom: 8 },
  sectionContent: { fontSize: 14, color: '#444', lineHeight: 22 },
});
