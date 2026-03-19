import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, ActivityIndicator
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { progressAPI } from '../api';
import { format } from 'date-fns';

const screenWidth = Dimensions.get('window').width;

export default function ProgressScreen() {
  const [weight, setWeight] = useState('');
  const [logs, setLogs] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [histResult, weekResult] = await Promise.all([
          progressAPI.history(60),
          progressAPI.weekly(),
        ]);
        setLogs(histResult.logs || []);
        setWeeklyData(weekResult.weeks || []);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    })();
  }, []);

  const saveWeight = async () => {
    const kg = parseFloat(weight);
    if (!kg || kg < 30 || kg > 300) return Alert.alert('Σφάλμα', 'Βάλε ένα έγκυρο βάρος (30-300 kg)');
    setSaving(true);
    try {
      const result = await progressAPI.log({ weight_kg: kg });
      setLogs(prev => {
        const today = format(new Date(), 'yyyy-MM-dd');
        const filtered = prev.filter(l => l.log_date.split('T')[0] !== today);
        return [...filtered, { log_date: today, weight_kg: kg }].sort((a,b) => a.log_date.localeCompare(b.log_date));
      });
      setWeight('');
      if (result.adjustment?.status === 'adjusted') {
        Alert.alert('🤖 Προσαρμογή!', result.adjustment.reason);
      }
    } catch (err) {
      Alert.alert('Σφάλμα', err.message);
    } finally { setSaving(false); }
  };

  // Prepare chart data (last 8 entries)
  const chartLogs = logs.slice(-8);
  const chartData = chartLogs.length >= 2 ? {
    labels: chartLogs.map(l => format(new Date(l.log_date), 'd/M')),
    datasets: [{ data: chartLogs.map(l => parseFloat(l.weight_kg)), color: () => '#2E86AB', strokeWidth: 2 }],
  } : null;

  // Stats
  const firstWeight = logs.length > 0 ? parseFloat(logs[0].weight_kg) : null;
  const lastWeight  = logs.length > 0 ? parseFloat(logs[logs.length - 1].weight_kg) : null;
  const totalChange = firstWeight && lastWeight ? (lastWeight - firstWeight).toFixed(1) : null;

  if (loading) return <View style={s.center}><ActivityIndicator color="#2E86AB" /></View>;

  return (
    <ScrollView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>📈 Πρόοδος</Text>
      </View>

      {/* Log weight */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Καταγραφή Βάρους</Text>
        <View style={s.inputRow}>
          <TextInput
            style={s.input}
            placeholder="Βάρος (kg)"
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
          />
          <TouchableOpacity style={s.saveBtn} onPress={saveWeight} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveBtnText}>Αποθήκευση</Text>}
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      {totalChange !== null && (
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statValue}>{firstWeight} kg</Text>
            <Text style={s.statLabel}>Αρχικό</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statValue}>{lastWeight} kg</Text>
            <Text style={s.statLabel}>Τρέχον</Text>
          </View>
          <View style={s.statCard}>
            <Text style={[s.statValue, { color: parseFloat(totalChange) <= 0 ? '#1E7B34' : '#C62828' }]}>
              {totalChange > 0 ? '+' : ''}{totalChange} kg
            </Text>
            <Text style={s.statLabel}>Σύνολο</Text>
          </View>
        </View>
      )}

      {/* Weight chart */}
      {chartData && (
        <View style={s.card}>
          <Text style={s.cardTitle}>Γράφημα Βάρους</Text>
          <LineChart
            data={chartData}
            width={screenWidth - 48}
            height={180}
            chartConfig={{
              backgroundColor: '#fff',
              backgroundGradientFrom: '#fff',
              backgroundGradientTo: '#fff',
              decimalPlaces: 1,
              color: (opacity = 1) => `rgba(46, 134, 171, ${opacity})`,
              labelColor: () => '#888',
              propsForDots: { r: '4', strokeWidth: '2', stroke: '#2E86AB' },
            }}
            bezier
            style={{ borderRadius: 8 }}
          />
        </View>
      )}

      {/* Recent logs */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Ιστορικό</Text>
        {logs.slice(-10).reverse().map((log, i) => (
          <View key={i} style={s.logRow}>
            <Text style={s.logDate}>{format(new Date(log.log_date), 'd MMM yyyy')}</Text>
            <Text style={s.logWeight}>{log.weight_kg} kg</Text>
          </View>
        ))}
        {logs.length === 0 && <Text style={s.empty}>Δεν υπάρχουν καταγραφές ακόμα</Text>}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#F8F9FA' },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:      { backgroundColor: '#1F4E79', padding: 24, paddingTop: 56 },
  title:       { color: '#fff', fontSize: 24, fontWeight: '800' },
  card:        { backgroundColor: '#fff', margin: 12, marginBottom: 0, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardTitle:   { fontSize: 16, fontWeight: '700', color: '#1A1A2E', marginBottom: 12 },
  inputRow:    { flexDirection: 'row', gap: 10 },
  input:       { flex: 1, backgroundColor: '#F0F4F8', borderRadius: 10, padding: 14, fontSize: 16, color: '#1A1A2E' },
  saveBtn:     { backgroundColor: '#2E86AB', borderRadius: 10, paddingHorizontal: 18, justifyContent: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  statsRow:    { flexDirection: 'row', gap: 8, margin: 12, marginBottom: 0 },
  statCard:    { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  statValue:   { fontSize: 18, fontWeight: '800', color: '#1A1A2E' },
  statLabel:   { fontSize: 12, color: '#888', marginTop: 2 },
  logRow:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  logDate:     { fontSize: 14, color: '#555' },
  logWeight:   { fontSize: 15, fontWeight: '700', color: '#2E86AB' },
  empty:       { textAlign: 'center', color: '#999', marginTop: 20, fontSize: 14 },
});
