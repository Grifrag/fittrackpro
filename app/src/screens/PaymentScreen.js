import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator,
  Alert, TouchableOpacity
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useAuth } from '../context/AuthContext';
import { paymentsAPI, authAPI } from '../api';

export default function PaymentScreen({ navigation }) {
  const { updateUser } = useAuth();
  const [checkoutUrl, setCheckoutUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [webLoading, setWebLoading] = useState(true);
  const [error, setError] = useState(null);

  React.useEffect(() => {
    (async () => {
      try {
        const { url } = await paymentsAPI.createCheckout();
        setCheckoutUrl(url);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleNavigationStateChange = async (navState) => {
    const { url } = navState;

    if (url?.startsWith('fittrackpro://payment/success')) {
      try {
        const updatedUser = await authAPI.me();
        updateUser(updatedUser);
        Alert.alert(
          '🎉 Συγχαρητήρια!',
          'Απέκτησες Lifetime Access! Απόλαυσε όλες τις λειτουργίες χωρίς χρέωση.',
          [{ text: 'Τέλεια!', onPress: () => navigation.goBack() }]
        );
      } catch {
        Alert.alert('✅ Επιτυχία!', 'Η πληρωμή ολοκληρώθηκε! Αποσυνδέσου και ξανασυνδέσου για να ενημερωθεί το προφίλ σου.');
        navigation.goBack();
      }
      return;
    }

    if (url?.startsWith('fittrackpro://payment/cancel')) {
      Alert.alert('Ακύρωση', 'Η πληρωμή ακυρώθηκε.');
      navigation.goBack();
    }
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#2E86AB" />
        <Text style={s.loadingText}>Φόρτωση πληρωμής...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.center}>
        <Text style={s.errorText}>❌ {error}</Text>
        <TouchableOpacity style={s.retryBtn} onPress={() => navigation.goBack()}>
          <Text style={s.retryText}>Πίσω</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.container}>
      {webLoading && (
        <View style={s.webLoading}>
          <ActivityIndicator size="large" color="#2E86AB" />
        </View>
      )}
      <WebView
        source={{ uri: checkoutUrl }}
        onNavigationStateChange={handleNavigationStateChange}
        onLoadStart={() => setWebLoading(true)}
        onLoadEnd={() => setWebLoading(false)}
        style={s.webview}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#fff' },
  center:     { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText:{ marginTop: 12, color: '#666', fontSize: 16 },
  errorText:  { fontSize: 16, color: '#EF5350', textAlign: 'center', marginBottom: 16 },
  retryBtn:   { backgroundColor: '#2E86AB', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  retryText:  { color: '#fff', fontWeight: '700', fontSize: 16 },
  webview:    { flex: 1 },
  webLoading: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 10, backgroundColor: '#fff' },
});
