import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { progressAPI } from '../api';

const WORKOUT_TYPES = [
  { key: 'running', label: '🏃 Τρέξιμο' },
  { key: 'cycling', label: '🚴 Ποδήλατο' },
  { key: 'swimming', label: '🏊 Κολύμπι' },
  { key: 'weights', label: '🏋️ Βάρη' },
  { key: 'yoga', label: '🧘 Yoga' },
  { key: 'walking', label: '🚶 Περπάτημα' },
  { key: 'other', label: '💪 Άλλο' },
];

export default function WorkoutScreen() {
  const [selectedType, setSelectedType] = useState('running');
  const [duration, setDuration] = useState('');
  const [calories, setCalories] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [workouts, setWorkouts] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadHistory = useCallback(async () => {
    try {
      const { workouts: data } = await progressAPI.getWorkouts(10);
      setWorkouts(data);
    } catch (err) {
      console.error('Failed to load workouts:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const handleSave = async () => {
    if (!duration || isNaN(parseInt(duration)) || parseInt(duration) <= 0) {
      return Alert.alert('Σφάλμα', 'Συμπλήρωσε τη διάρκεια σε λεπτά');
    }
    setSaving(true);
    try {
      await progressAPI.logWorkout({
        workout_type: selectedType,
        duration_min: parseInt(duration),
        calories_burned: calories ? parseInt(calories) : 0,
        notes: notes.trim() || null,
        date: new Date().toISOString().split('T')[0],
      });
      Alert.alert('✅ Καταγράφηκε!', `${WORKOUT_TYPES.find(w => w.key === selectedType)?.label} ${duration} λεπτά`);
      setDuration('');
      setCalories('');
      setNotes('');
      loadHistory();
    } catch (err) {
      Alert.alert('Σφάλμα', err.message);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('el-GR', { day: 'numeric', month: 'short' });
  };

  const getLabel = (key) => WORKOUT_TYPES.find(w => w.key === key)?.label || key;

  return (
    <ScrollView style={s.container} keyboardShouldPersistTaps="handled">
      <View style={s.header}>
        <Text style={s.title}>💪 Καταγραφή Προπόνησης</Text>
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>Τύπος Προπόνησης</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.typeRow}>
          {WORKOUT_TYPES.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={[s.typeChip, selectedType === key && s.typeChipActive]}
              onPress={() => setSelectedType(key)}
            >
              <Text style={[s.typeChipText, selectedType === key && s.typeChipTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>Λεπτομέρειες</Text>
        <View style={s.inputRow}>
          <Ionicons name="time-outline" size={20} color="#2E86AB" style={s.inputIcon} />
          <TextInput
            style={s.input}
            placeholder="Διάρκεια (λεπτά) *"
            keyboardType="number-pad"
            value={duration}
            onChangeText={setDuration}
          />
        </View>
        <View style={s.inputRow}>
          <Ionicons name="flame-outline" size={20} color="#FFA726" style={s.inputIcon} />
          <TextInput
            style={s.input}
            placeholder="Θερμίδες που κάηκαν (προαιρετικό)"
            keyboardType="number-pad"
            value={calories}
            onChangeText={setCalories}
          />
        </View>
        <View style={s.inputRow}>
          <Ionicons name="create-outline" size={20} color="#999" style={s.inputIcon} />
          <TextInput
            style={[s.input, s.inputMultiline]}
            placeholder="Σημειώσεις (προαιρετικό)"
            multiline
            numberOfLines={2}
            value={notes}
            onChangeText={setNotes}
          />
        </View>
        <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={s.saveBtnText}>Καταγραφή Προπόνησης</Text>
          }
        </TouchableOpacity>
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>📋 Ιστορικό</Text>
        {loadingHistory ? (
          <ActivityIndicator color="#2E86AB" style={{ marginVertical: 12 }} />
        ) : workouts.length === 0 ? (
          <Text style={s.emptyText}>Δεν έχεις καταγράψει προπονήσεις ακόμα</Text>
        ) : (
          workouts.map((w) => (
            <View key={w.id} style={s.historyItem}>
              <View>
                <Text style={s.historyType}>{getLabel(w.workout_type)}</Text>
                <Text style={s.historyDate}>{formatDate(w.log_date)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={s.historyDuration}>{w.duration_min} λεπτά</Text>
                {w.calories_burned > 0 && (
                  <Text style={s.historyCalories}>{w.calories_burned} kcal</Text>
                )}
              </View>
            </View>
          ))
        )}
      </View>
      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#F8F9FA' },
  header:             { backgroundColor: '#1F4E79', padding: 24, paddingTop: 56 },
  title:              { color: '#fff', fontSize: 22, fontWeight: '800' },
  card:               { backgroundColor: '#fff', margin: 12, marginBottom: 0, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardTitle:          { fontSize: 16, fontWeight: '700', color: '#1A1A2E', marginBottom: 12 },
  typeRow:            { flexDirection: 'row', marginBottom: 4 },
  typeChip:           { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F0F4F8', marginRight: 8 },
  typeChipActive:     { backgroundColor: '#2E86AB' },
  typeChipText:       { color: '#555', fontSize: 13, fontWeight: '600' },
  typeChipTextActive: { color: '#fff' },
  inputRow:           { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F0F0F0', paddingVertical: 8, marginBottom: 4 },
  inputIcon:          { marginRight: 10 },
  input:              { flex: 1, fontSize: 15, color: '#1A1A2E' },
  inputMultiline:     { height: 60, textAlignVertical: 'top' },
  saveBtn:            { backgroundColor: '#2E86AB', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 16 },
  saveBtnText:        { color: '#fff', fontWeight: '700', fontSize: 16 },
  historyItem:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  historyType:        { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  historyDate:        { fontSize: 12, color: '#999', marginTop: 2 },
  historyDuration:    { fontSize: 14, fontWeight: '700', color: '#2E86AB' },
  historyCalories:    { fontSize: 12, color: '#FFA726' },
  emptyText:          { color: '#999', textAlign: 'center', paddingVertical: 16 },
});
