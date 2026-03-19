import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { mealsAPI } from '../api';
import { useAuth } from '../context/AuthContext';
import MacroRing from '../components/MacroRing';
import { format } from 'date-fns';

const COLORS = { primary: '#2E86AB', bg: '#F8F9FA', card: '#fff', text: '#1A1A2E', muted: '#888' };

export default function DashboardScreen({ navigation }) {
  const { user } = useAuth();
  const [dayData, setDayData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');
  const goals = {
    calories: user?.calorie_goal || 2000,
    protein:  user?.protein_goal || 150,
    carbs:    user?.carbs_goal   || 200,
    fat:      user?.fat_goal     || 65,
  };

  const fetchDay = async () => {
    try {
      const data = await mealsAPI.getDay(today);
      setDayData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchDay(); }, []));

  const totals = dayData?.totals || { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  const remaining = goals.calories - totals.calories;
  const waterMl = dayData?.water_ml || 0;

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <ScrollView style={s.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDay(); }} />}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.greeting}>Γεια, {user?.name?.split(' ')[0]} 👋</Text>
        <Text style={s.date}>{format(new Date(), 'EEEE, d MMM')}</Text>
      </View>

      {/* Calorie ring */}
      <View style={s.card}>
        <View style={s.ringRow}>
          <MacroRing
            value={totals.calories}
            max={goals.calories}
            label="kcal"
            color={COLORS.primary}
            size={120}
          />
          <View style={s.calorieInfo}>
            <Text style={s.calorieLabel}>Υπόλοιπο</Text>
            <Text style={[s.calorieValue, { color: remaining >= 0 ? '#1E7B34' : '#C62828' }]}>
              {Math.round(remaining)} kcal
            </Text>
            <Text style={s.calorieSmall}>{Math.round(totals.calories)} / {goals.calories}</Text>
          </View>
        </View>
      </View>

      {/* Macro bars */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Μακροεντρίνες</Text>
        {[
          { name: 'Πρωτεΐνη', value: totals.protein, goal: goals.protein, color: '#EF5350', unit: 'g' },
          { name: 'Υδατάνθρακες', value: totals.carbs, goal: goals.carbs, color: '#42A5F5', unit: 'g' },
          { name: 'Λίπος', value: totals.fat, goal: goals.fat, color: '#FFA726', unit: 'g' },
        ].map(m => (
          <View key={m.name} style={s.macroRow}>
            <Text style={s.macroName}>{m.name}</Text>
            <View style={s.macroBarBg}>
              <View style={[s.macroBarFill, { width: `${Math.min(100, (m.value / m.goal) * 100)}%`, backgroundColor: m.color }]} />
            </View>
            <Text style={s.macroVal}>{Math.round(m.value)}/{m.goal}{m.unit}</Text>
          </View>
        ))}
      </View>

      {/* Water tracker */}
      <View style={s.card}>
        <Text style={s.cardTitle}>💧 Νερό</Text>
        <View style={s.waterRow}>
          {[250, 500, 750].map(ml => (
            <TouchableOpacity key={ml} style={s.waterBtn}
              onPress={async () => { await mealsAPI.logWater(ml, today); fetchDay(); }}>
              <Text style={s.waterBtnText}>+{ml}ml</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={s.waterTotal}>{waterMl}ml / 2500ml</Text>
        <View style={s.macroBarBg}>
          <View style={[s.macroBarFill, { width: `${Math.min(100, (waterMl / 2500) * 100)}%`, backgroundColor: '#29B6F6' }]} />
        </View>
      </View>

      {/* Meals of the day */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Γεύματα σήμερα</Text>
        {['breakfast', 'lunch', 'dinner', 'snack'].map(type => {
          const meal = dayData?.meals?.find(m => m.meal_type === type);
          const mealLabels = { breakfast: 'Πρωινό', lunch: 'Μεσημεριανό', dinner: 'Βραδινό', snack: 'Σνακ' };
          const mealIcons = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎' };
          const mealCals = (meal?.items || []).reduce((s, i) => s + (parseFloat(i.calories) || 0), 0);
          return (
            <TouchableOpacity key={type} style={s.mealRow}
              onPress={() => navigation.navigate('Log', { mealType: type, date: today })}>
              <Text style={s.mealIcon}>{mealIcons[type]}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.mealName}>{mealLabels[type]}</Text>
                {meal && <Text style={s.mealCals}>{Math.round(mealCals)} kcal</Text>}
              </View>
              <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.bg },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:       { backgroundColor: '#1F4E79', padding: 24, paddingTop: 56 },
  greeting:     { color: '#fff', fontSize: 24, fontWeight: '800' },
  date:         { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 4 },
  card:         { backgroundColor: COLORS.card, margin: 12, marginBottom: 0, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardTitle:    { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  ringRow:      { flexDirection: 'row', alignItems: 'center', gap: 20 },
  calorieInfo:  { flex: 1 },
  calorieLabel: { color: COLORS.muted, fontSize: 13 },
  calorieValue: { fontSize: 32, fontWeight: '800' },
  calorieSmall: { color: COLORS.muted, fontSize: 13, marginTop: 2 },
  macroRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  macroName:    { width: 100, fontSize: 13, color: COLORS.text },
  macroBarBg:   { flex: 1, height: 8, backgroundColor: '#EEE', borderRadius: 4, overflow: 'hidden' },
  macroBarFill: { height: 8, borderRadius: 4 },
  macroVal:     { width: 70, fontSize: 12, color: COLORS.muted, textAlign: 'right' },
  waterRow:     { flexDirection: 'row', gap: 8, marginBottom: 8 },
  waterBtn:     { flex: 1, backgroundColor: '#E3F2FD', borderRadius: 8, padding: 10, alignItems: 'center' },
  waterBtnText: { color: '#1565C0', fontWeight: '700', fontSize: 14 },
  waterTotal:   { color: COLORS.muted, fontSize: 13, marginBottom: 6 },
  mealRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  mealIcon:     { fontSize: 20, marginRight: 12 },
  mealName:     { fontSize: 15, fontWeight: '600', color: COLORS.text },
  mealCals:     { fontSize: 13, color: COLORS.muted, marginTop: 2 },
});
