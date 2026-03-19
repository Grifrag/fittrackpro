import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { foodsAPI, mealsAPI } from '../api';
import { debounce } from 'lodash';

export default function FoodSearchScreen({ route, navigation }) {
  const { mealType = 'other', date } = route.params || {};
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(null);

  const search = useCallback(
    debounce(async (q) => {
      if (!q || q.length < 2) { setResults([]); return; }
      setLoading(true);
      try {
        const data = await foodsAPI.search(q);
        setResults(data.foods || []);
      } catch (err) {
        Alert.alert('Σφάλμα', err.message);
      } finally {
        setLoading(false);
      }
    }, 400),
    []
  );

  const handleQueryChange = (text) => {
    setQuery(text);
    search(text);
  };

  const addFood = async (food) => {
    setAdding(food.id);
    try {
      await mealsAPI.log({
        date, meal_type: mealType,
        food_id: food.id,
        amount: food.serving_size || 100,
        unit: food.serving_unit || 'g',
        // Pass macros for OFF foods
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        fiber: food.fiber,
      });
      Alert.alert('✅ Προστέθηκε!', `${food.name} καταγράφηκε`, [
        { text: 'Συνέχεια', style: 'cancel' },
        { text: 'Πίσω', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Σφάλμα', err.message);
    } finally {
      setAdding(null);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={s.item} onPress={() => addFood(item)}>
      <View style={{ flex: 1 }}>
        <Text style={s.itemName}>{item.name_el || item.name}</Text>
        {item.brand ? <Text style={s.itemBrand}>{item.brand}</Text> : null}
        <View style={s.macroRow}>
          <Text style={s.cal}>🔥 {Math.round(item.calories)} kcal</Text>
          <Text style={s.macro}>P: {Math.round(item.protein || 0)}g</Text>
          <Text style={s.macro}>C: {Math.round(item.carbs || 0)}g</Text>
          <Text style={s.macro}>F: {Math.round(item.fat || 0)}g</Text>
        </View>
        <Text style={s.serving}>per {item.serving_size}{item.serving_unit}</Text>
      </View>
      {adding === item.id
        ? <ActivityIndicator color="#2E86AB" />
        : <Ionicons name="add-circle" size={28} color="#2E86AB" />
      }
    </TouchableOpacity>
  );

  return (
    <View style={s.container}>
      <View style={s.searchRow}>
        <Ionicons name="search" size={20} color="#888" style={s.searchIcon} />
        <TextInput
          style={s.input}
          placeholder="Αναζήτηση τροφίμου..."
          value={query}
          onChangeText={handleQueryChange}
          autoFocus
        />
        <TouchableOpacity onPress={() => navigation.navigate('BarcodeScanner', { mealType, date })}>
          <Ionicons name="barcode-outline" size={28} color="#2E86AB" />
        </TouchableOpacity>
      </View>

      {loading && <ActivityIndicator style={{ marginTop: 20 }} color="#2E86AB" />}

      {!loading && results.length === 0 && query.length > 1 && (
        <Text style={s.empty}>Δεν βρέθηκαν αποτελέσματα για "{query}"</Text>
      )}

      <FlatList
        data={results}
        keyExtractor={(item, i) => item.id?.toString() || `${i}`}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#F8F9FA' },
  searchRow:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 12, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: '#DDD' },
  searchIcon: { marginRight: 8 },
  input:      { flex: 1, height: 48, fontSize: 16, color: '#1A1A2E' },
  item:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 8, borderRadius: 12, padding: 14, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  itemName:   { fontSize: 15, fontWeight: '700', color: '#1A1A2E', marginBottom: 2 },
  itemBrand:  { fontSize: 12, color: '#888', marginBottom: 4 },
  macroRow:   { flexDirection: 'row', gap: 8, marginTop: 4 },
  cal:        { fontSize: 13, fontWeight: '700', color: '#2E86AB' },
  macro:      { fontSize: 12, color: '#555', backgroundColor: '#F0F4F8', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  serving:    { fontSize: 11, color: '#AAA', marginTop: 4 },
  empty:      { textAlign: 'center', color: '#999', marginTop: 40, fontSize: 15 },
});
