import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView
} from 'react-native';
import { useAuth } from '../../context/AuthContext';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleRegister = async () => {
    if (!name || !email || !password) return Alert.alert('Σφάλμα', 'Συμπλήρωσε όλα τα πεδία');
    if (password.length < 6) return Alert.alert('Σφάλμα', 'Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες');
    setLoading(true);
    try {
      await register(email.trim(), password, name.trim());
    } catch (err) {
      Alert.alert('Σφάλμα εγγραφής', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.inner} keyboardShouldPersistTaps="handled">
        <Text style={s.logo}>💪 FitTrack Pro</Text>
        <Text style={s.subtitle}>Δημιούργησε τον λογαριασμό σου</Text>

        <TextInput style={s.input} placeholder="Όνομα" value={name} onChangeText={setName} autoCapitalize="words" />
        <TextInput style={s.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
        <TextInput style={s.input} placeholder="Κωδικός (min. 6 χαρακτήρες)" value={password} onChangeText={setPassword} secureTextEntry />

        <View style={s.noteBox}>
          <Text style={s.noteText}>🎉 Lifetime access — πληρώνεις μία φορά, χρησιμοποιείς για πάντα</Text>
        </View>

        <TouchableOpacity style={s.btn} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Δημιουργία Λογαριασμού</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.link}>Έχεις ήδη λογαριασμό; <Text style={s.linkBold}>Σύνδεση</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  inner:     { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },
  logo:      { fontSize: 32, fontWeight: '800', color: '#1F4E79', textAlign: 'center', marginBottom: 8 },
  subtitle:  { fontSize: 15, color: '#666', textAlign: 'center', marginBottom: 32 },
  input:     { backgroundColor: '#fff', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 14, borderWidth: 1, borderColor: '#DDD', color: '#1A1A2E' },
  noteBox:   { backgroundColor: '#E8F5E9', borderRadius: 10, padding: 14, marginBottom: 20, borderLeftWidth: 4, borderLeftColor: '#1E7B34' },
  noteText:  { color: '#1E7B34', fontSize: 14, fontWeight: '600' },
  btn:       { backgroundColor: '#2E86AB', borderRadius: 12, padding: 16, alignItems: 'center', shadowColor: '#2E86AB', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  btnText:   { color: '#fff', fontSize: 17, fontWeight: '700' },
  link:      { textAlign: 'center', marginTop: 24, color: '#666', fontSize: 15 },
  linkBold:  { color: '#2E86AB', fontWeight: '700' },
});
