import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { mealsAPI } from '../api';
import { format } from 'date-fns';

const MEAL_LABELS = { breakfast: '🌅 Πρωινό', lunch: '☀️ Μεσημεριανό', dinner: '🌙 Βραδινό', snack: '🍎 Σνακ' };
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function LogMealScreen({ navigation, route }) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [date] = useState(route?.params?.date || today);
  const [activeMeal, setActiveMeal] = useState(route?.params?.mealType || 'breakfast');
  const [dayData, setDayData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDay = async () => {
    try {
      const data = await mealsAPI.getDay(date);
      setDayData(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useFocusEffect(useCallback(() => { fetchDay(); }, [date]));

  const deleteItem = async (itemId) => {
    Alert.alert('Διαγραφή;', 'Θέλεις να αφαιρέσεις αυτό το τρόφιμο;', [
      { text: 'Ακύρωση', style: 'cancel' },
      {
        text: 'Διαγραφή', style: 'destructive',
        onPress: async () => {
          await mealsAPI.deleteItem(itemId);
          fetchDay();
        }
      }
    ]);
  };

  const activeMealData = dayData?.meals?.find(m => m.meal_type === activeMeal);
  const mealItems = activeMealData?.items?.filter(i => i.food_id || i.calories) || [];
  const mealCals = mealItems.reduce((s, i) => s + (parseFloat(i.calories) || 0), 0);

  if (loading) return <View style={s.center}><ActivityIndicator color="#2E86AB" /></View>;

  return (
    <View style={s.container}>
      {/* Meal type tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabRow}>
        {MEAL_TYPES.map(type => (
          <TouchableOpacity key={type} style={[s.tab, activeMeal === type && s.tabActive]} onPress={() => setActiveMeal(type)}>
            <Text style={[s.tabText, activeMeal === type && s.tabTextActive]}>
              {MEAL_LABELS[type]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={s.content}>
        {/* Meal header */}
        <View style={s.mealHeader}>
          <Text style={s.mealTitle}>{MEAL_LABELS[activeMeal]}</Text>
          <Text style={s.mealCals}>{Math.round(mealCals)} kcal</Text>
        </View>

        {/* Food items */}
        {mealItems.length === 0 ? (
          <Text style={s.emptyMsg}>Δεν έχεις καταγράψει τίποτα ακόμα</Text>
        ) : (
          mealItems.map(item => (
            <View key={item.id} style={s.foodItem}>
              <View style={{ flex: 1 }}>
                <Text style={s.foodName}>{item.food_name_el || item.food_name}</Text>
                <Text style={s.foodMacros}>
                  {Math.round(item.amount)}g · 🔥{Math.round(item.calories)} · P{Math.round(item.protein||0)} · C{Math.round(item.carbs||0)} · F{Math.round(item.fat||0)}
                </Text>
              </View>
              <TouchableOpacity onPress={() => deleteItem(item.id)}>
                <Ionicons name="trash-outline" size={20} color="#EF5350" />
              </TouchableOpacity>
            </View>
          ))
        )}

        {/* Macro summary for this meal */}
        {mealItems.length > 0 && (
          <View style={s.mealSummary}>
            {[
              { label: 'Protein', value: mealItems.reduce((s,i) => s + (parseFloat(i.protein)||0), 0), color: '#EF5350' },
              { label: 'Carbs',   value: mealItems.reduce((s,i) => s + (parseFloat(i.carbs)||0), 0),   color: '#42A5F5' },
              { label: 'Fat',     value: mealItems.reduce((s,i) => s + (parseFloat(i.fat)||0), 0),     color: '#FFA726' },
            ].map(m => (
              <View key={m.label} style={s.summaryItem}>
                <Text style={[s.summaryValue, { color: m.color }]}>{Math.round(m.value)}g</Text>
                <Text style={s.summaryLabel}>{m.label}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add food button */}
      <TouchableOpacity style={s.addBtn}
        onPress={() => navigation.navigate('FoodSearch', { mealType: activeMeal, date })}>
        <Ionicons name="add" size={28} color="#fff" />
        <Text style={s.addBtnText}>Πρόσθεσε τρόφιμο</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F8F9FA' },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabRow:       { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 12, maxHeight: 56 },
  tab:          { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, backgroundColor: '#F0F4F8' },
  tabActive:    { backgroundColor: '#2E86AB' },
  tabText:      { fontSize: 14, fontWeight: '600', color: '#555' },
  tabTextActive:{ color: '#fff' },
  content:      { flex: 1, padding: 16 },
  mealHeader:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  mealTitle:    { fontSize: 18, fontWeight: '800', color: '#1A1A2E' },
  mealCals:     { fontSize: 16, fontWeight: '700', color: '#2E86AB' },
  emptyMsg:     { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 15 },
  foodItem:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  foodName:     { fontSize: 15, fontWeight: '600', color: '#1A1A2E' },
  foodMacros:   { fontSize: 13, color: '#888', marginTop: 3 },
  mealSummary:  { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginTop: 8 },
  summaryItem:  { alignItems: 'center' },
  summaryValue: { fontSize: 20, fontWeight: '800' },
  summaryLabel: { fontSize: 12, color: '#888', marginTop: 2 },
  addBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#2E86AB', margin: 16, borderRadius: 16, padding: 16, shadowColor: '#2E86AB', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  addBtnText:   { color: '#fff', fontSize: 17, fontWeight: '700' },
});
