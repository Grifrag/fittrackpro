import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert
} from 'react-native';
import { useAuth } from '../../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert('Σφάλμα', 'Συμπλήρωσε email και κωδικό');
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      Alert.alert('Σφάλμα σύνδεσης', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.inner}>
        <Text style={s.logo}>💪 FitTrack Pro</Text>
        <Text style={s.subtitle}>Το fitness tracker που πληρώνεις μία φορά</Text>

        <TextInput
          style={s.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          style={s.input}
          placeholder="Κωδικός"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={s.btn} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Σύνδεση</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={s.link}>Δεν έχεις λογαριασμό; <Text style={s.linkBold}>Εγγραφή</Text></Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  inner:     { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  logo:      { fontSize: 32, fontWeight: '800', color: '#1F4E79', textAlign: 'center', marginBottom: 8 },
  subtitle:  { fontSize: 15, color: '#666', textAlign: 'center', marginBottom: 40 },
  input:     { backgroundColor: '#fff', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 14, borderWidth: 1, borderColor: '#DDD', color: '#1A1A2E' },
  btn:       { backgroundColor: '#2E86AB', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8, shadowColor: '#2E86AB', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  btnText:   { color: '#fff', fontSize: 17, fontWeight: '700' },
  link:      { textAlign: 'center', marginTop: 24, color: '#666', fontSize: 15 },
  linkBold:  { color: '#2E86AB', fontWeight: '700' },
});
