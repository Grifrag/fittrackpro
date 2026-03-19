import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { usersAPI } from '../api';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen({ navigation }) {
  const { user, logout, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    calorie_goal: user?.calorie_goal?.toString() || '2000',
    protein_goal: user?.protein_goal?.toString() || '150',
    carbs_goal:   user?.carbs_goal?.toString()   || '200',
    fat_goal:     user?.fat_goal?.toString()     || '65',
    weight_kg:    user?.weight_kg?.toString()    || '',
    height_cm:    user?.height_cm?.toString()    || '',
  });

  const save = async () => {
    setSaving(true);
    try {
      const updated = await usersAPI.updateProfile({
        calorie_goal: parseInt(form.calorie_goal),
        protein_goal: parseInt(form.protein_goal),
        carbs_goal:   parseInt(form.carbs_goal),
        fat_goal:     parseInt(form.fat_goal),
        weight_kg:    parseFloat(form.weight_kg) || null,
        height_cm:    parseFloat(form.height_cm) || null,
      });
      updateUser(updated);
      setEditing(false);
      Alert.alert('✅ Αποθηκεύτηκε!', 'Οι στόχοι σου ενημερώθηκαν');
    } catch (err) {
      Alert.alert('Σφάλμα', err.message);
    } finally { setSaving(false); }
  };

  const autoCalculate = async () => {
    try {
      const goals = await usersAPI.calculateGoals();
      setForm(prev => ({
        ...prev,
        calorie_goal: goals.calorie_goal.toString(),
        protein_goal: goals.protein_goal.toString(),
        carbs_goal:   goals.carbs_goal.toString(),
        fat_goal:     goals.fat_goal.toString(),
      }));
      Alert.alert('🧮 Υπολογίστηκε!', `TDEE: ${goals.tdee} kcal\nΣτόχος: ${goals.calorie_goal} kcal`);
    } catch (err) {
      Alert.alert('Σφάλμα', err.message || 'Συμπλήρωσε πρώτα βάρος, ύψος και χρονιά γέννησης στο προφίλ');
    }
  };

  const f = (key, label, keyboardType = 'number-pad') => (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      {editing ? (
        <TextInput style={s.fieldInput} value={form[key]} onChangeText={v => setForm(p => ({ ...p, [key]: v }))} keyboardType={keyboardType} />
      ) : (
        <Text style={s.fieldValue}>{form[key] || '—'}</Text>
      )}
    </View>
  );

  return (
    <ScrollView style={s.container}>
      <View style={s.header}>
        <Text style={s.name}>{user?.name}</Text>
        <Text style={s.email}>{user?.email}</Text>
        {user?.lifetime_access && (
          <View style={s.badge}><Text style={s.badgeText}>⭐ Lifetime Access</Text></View>
        )}
        {!user?.lifetime_access && (
          <TouchableOpacity
            style={s.buyBtn}
            onPress={() => navigation.navigate('Payment')}
          >
            <Text style={s.buyBtnText}>⭐ Αγόρασε Lifetime Access — €40</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Goals */}
      <View style={s.card}>
        <View style={s.cardHeader}>
          <Text style={s.cardTitle}>🎯 Ημερήσιοι Στόχοι</Text>
          {!editing && (
            <TouchableOpacity onPress={() => setEditing(true)}>
              <Ionicons name="pencil" size={20} color="#2E86AB" />
            </TouchableOpacity>
          )}
        </View>
        {f('calorie_goal', 'Θερμίδες (kcal)')}
        {f('protein_goal', 'Πρωτεΐνη (g)')}
        {f('carbs_goal', 'Υδατάνθρακες (g)')}
        {f('fat_goal', 'Λίπος (g)')}

        {editing && (
          <View style={s.actionRow}>
            <TouchableOpacity style={[s.btn, s.btnSecondary]} onPress={autoCalculate}>
              <Text style={s.btnSecondaryText}>🧮 Αυτόματος υπολογισμός</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.btn} onPress={save} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnText}>Αποθήκευση</Text>}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Body */}
      <View style={s.card}>
        <View style={s.cardHeader}>
          <Text style={s.cardTitle}>📏 Σώμα</Text>
        </View>
        {f('weight_kg', 'Βάρος (kg)', 'decimal-pad')}
        {f('height_cm', 'Ύψος (cm)', 'decimal-pad')}
        {editing && (
          <TouchableOpacity style={[s.btn, { marginTop: 12 }]} onPress={save} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnText}>Αποθήκευση</Text>}
          </TouchableOpacity>
        )}
      </View>

      {/* Logout */}
      <TouchableOpacity style={s.logoutBtn} onPress={() => Alert.alert('Αποσύνδεση;', 'Θέλεις σίγουρα να αποσυνδεθείς;', [
        { text: 'Ακύρωση', style: 'cancel' },
        { text: 'Αποσύνδεση', style: 'destructive', onPress: logout }
      ])}>
        <Ionicons name="log-out-outline" size={20} color="#EF5350" />
        <Text style={s.logoutText}>Αποσύνδεση</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={s.privacyBtn}
        onPress={() => navigation.navigate('PrivacyPolicy')}
      >
        <Text style={s.privacyText}>Πολιτική Απορρήτου</Text>
      </TouchableOpacity>
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#F8F9FA' },
  header:          { backgroundColor: '#1F4E79', padding: 24, paddingTop: 56, alignItems: 'center' },
  name:            { color: '#fff', fontSize: 24, fontWeight: '800' },
  email:           { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 4 },
  badge:           { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginTop: 10 },
  badgeText:       { color: '#FFD700', fontWeight: '700', fontSize: 14 },
  card:            { backgroundColor: '#fff', margin: 12, marginBottom: 0, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle:       { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
  field:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  fieldLabel:      { fontSize: 14, color: '#555' },
  fieldValue:      { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  fieldInput:      { backgroundColor: '#F0F4F8', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, fontSize: 15, minWidth: 80, textAlign: 'right' },
  actionRow:       { flexDirection: 'row', gap: 8, marginTop: 14 },
  btn:             { flex: 1, backgroundColor: '#2E86AB', borderRadius: 10, padding: 12, alignItems: 'center' },
  btnText:         { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnSecondary:    { backgroundColor: '#F0F4F8' },
  btnSecondaryText:{ color: '#2E86AB', fontWeight: '700', fontSize: 13 },
  logoutBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, margin: 20, padding: 16, borderWidth: 1, borderColor: '#EF5350', borderRadius: 12 },
  logoutText:      { color: '#EF5350', fontSize: 16, fontWeight: '700' },
  buyBtn:     { backgroundColor: '#FFD700', borderRadius: 20, paddingHorizontal: 18, paddingVertical: 10, marginTop: 12 },
  buyBtnText: { color: '#1A1A2E', fontWeight: '800', fontSize: 15 },
  privacyBtn: { alignItems: 'center', padding: 12 },
  privacyText:{ color: '#999', fontSize: 13, textDecorationLine: 'underline' },
});
