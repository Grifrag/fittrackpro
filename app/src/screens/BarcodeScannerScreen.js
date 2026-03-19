import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Camera } from 'expo-camera';
import { foodsAPI, mealsAPI } from '../api';
import { Ionicons } from '@expo/vector-icons';

export default function BarcodeScannerScreen({ route, navigation }) {
  const { mealType = 'other', date } = route.params || {};
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Camera.requestCameraPermissionsAsync().then(({ status }) => {
      setHasPermission(status === 'granted');
    });
  }, []);

  const handleBarCodeScanned = async ({ data: barcode }) => {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);
    try {
      const food = await foodsAPI.barcode(barcode);
      Alert.alert(
        food.name,
        `${Math.round(food.calories)} kcal | P: ${Math.round(food.protein||0)}g | C: ${Math.round(food.carbs||0)}g | F: ${Math.round(food.fat||0)}g\n\nΠροσθήκη σε ${mealType};`,
        [
          { text: 'Ακύρωση', onPress: () => setScanned(false), style: 'cancel' },
          {
            text: 'Προσθήκη',
            onPress: async () => {
              await mealsAPI.log({
                date, meal_type: mealType,
                food_id: food.id || `off_${barcode}`,
                amount: food.serving_size || 100,
                unit: 'g',
                calories: food.calories,
                protein: food.protein,
                carbs: food.carbs,
                fat: food.fat,
                fiber: food.fiber,
              });
              navigation.goBack();
            }
          }
        ]
      );
    } catch (err) {
      Alert.alert('Δεν βρέθηκε', 'Το προϊόν δεν βρέθηκε στη βάση δεδομένων.', [
        { text: 'ΟΚ', onPress: () => setScanned(false) }
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (hasPermission === null) return <View style={s.center}><ActivityIndicator color="#2E86AB" /></View>;
  if (hasPermission === false) return <View style={s.center}><Text style={s.msg}>Δεν έχεις δώσει άδεια κάμερας</Text></View>;

  return (
    <View style={s.container}>
      <Camera
        style={s.camera}
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        barCodeScannerSettings={{ barCodeTypes: ['qr', 'ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] }}
      />
      <View style={s.overlay}>
        <View style={s.frame} />
        <Text style={s.hint}>Τοποθέτησε το barcode στο κάδρο</Text>
        {loading && <ActivityIndicator color="#fff" style={{ marginTop: 12 }} />}
        {scanned && !loading && (
          <TouchableOpacity style={s.rescanBtn} onPress={() => setScanned(false)}>
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={s.rescanText}>Σκάναρε ξανά</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1 },
  camera:     { flex: 1 },
  center:     { flex: 1, justifyContent: 'center', alignItems: 'center' },
  msg:        { fontSize: 16, color: '#555' },
  overlay:    { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  frame:      { width: 250, height: 180, borderWidth: 2, borderColor: '#2E86AB', borderRadius: 12, backgroundColor: 'transparent' },
  hint:       { color: '#fff', fontSize: 15, marginTop: 20, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  rescanBtn:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, backgroundColor: '#2E86AB', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  rescanText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
