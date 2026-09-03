import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { createUser, loginUser } from '../service/api';

const CURRENT_USER_KEY = '@confeitaria:current-user';
const CURRENT_USER_EMAIL_KEY = '@confeitaria:current-email';

export default function LoginScreen() {
  const [isCadastro, setIsCadastro] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleAuth = async () => {
    const cleanedEmail = email.trim();
    const cleanedSenha = senha.trim();

    if (!cleanedEmail || !cleanedSenha || (isCadastro && !nome.trim())) {
      Alert.alert('Erro', 'Preencha todos os campos.');
      return;
    }

    if (isCadastro && !cleanedEmail.includes('@')) {
      Alert.alert('Erro', 'Informe um e-mail válido.');
      return;
    }

    try {
      let response;
      if (isCadastro) {
        response = await createUser({ name: nome.trim(), email: cleanedEmail, senha: cleanedSenha });
      } else {
        response = await loginUser({ email: cleanedEmail, senha: cleanedSenha });
      }

      const user = response?.user ?? response;
      const storedName = user?.name ?? user?.nome ?? (nome.trim() || 'Usuário');
      await AsyncStorage.setItem(CURRENT_USER_KEY, storedName);
      await AsyncStorage.setItem(CURRENT_USER_EMAIL_KEY, cleanedEmail);
      router.replace('/(tabs)/estoque');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível acessar o sistema.';
      Alert.alert('Erro', message);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.brandMark}>
            <Ionicons name="storefront-outline" size={36} color="#FFFFFF" />
          </View>
          <Text style={styles.appName}>Confeitaria</Text>
          <Text style={styles.title}>{isCadastro ? 'Criar conta' : 'Acessar sistema'}</Text>
          <Text style={styles.subtitle}>Estoque, receitas, pedidos e financeiro em um só lugar.</Text>

          <View style={styles.switchRow}>
            <Pressable onPress={() => setIsCadastro(false)} style={[styles.switchButton, !isCadastro && styles.switchButtonActive]}>
              <Text style={[styles.switchText, !isCadastro && styles.switchTextActive]}>Login</Text>
            </Pressable>
            <Pressable onPress={() => setIsCadastro(true)} style={[styles.switchButton, isCadastro && styles.switchButtonActive]}>
              <Text style={[styles.switchText, isCadastro && styles.switchTextActive]}>Cadastro</Text>
            </Pressable>
          </View>

          {isCadastro ? (
            <TextInput
              onChangeText={setNome}
              placeholder="Nome completo"
              placeholderTextColor="#64748B"
              style={styles.input}
              value={nome}
            />
          ) : null}

          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="E-mail"
            placeholderTextColor="#64748B"
            style={styles.input}
            value={email}
          />

          <View style={styles.passwordField}>
            <TextInput
              onChangeText={setSenha}
              placeholder="Senha"
              placeholderTextColor="#64748B"
              secureTextEntry={!showPassword}
              style={[styles.input, styles.passwordInput]}
              value={senha}
            />
            <Pressable onPress={() => setShowPassword((current) => !current)} style={styles.toggleButton}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#64748B" />
            </Pressable>
          </View>

          <Pressable onPress={handleAuth} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{isCadastro ? 'Cadastrar' : 'Entrar'}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4F7F6' },
  keyboardView: { flex: 1 },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  brandMark: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#0F766E',
    borderRadius: 28,
    height: 64,
    justifyContent: 'center',
    marginBottom: 20,
    width: 64,
  },
  appName: { color: '#0F766E', fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  title: { color: '#111827', fontSize: 28, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
  subtitle: { color: '#475569', fontSize: 16, lineHeight: 24, textAlign: 'center', marginBottom: 24 },
  switchRow: {
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    flexDirection: 'row',
    marginBottom: 18,
    padding: 4,
  },
  switchButton: { alignItems: 'center', borderRadius: 8, flex: 1, paddingVertical: 12 },
  switchButtonActive: { backgroundColor: '#FFFFFF' },
  switchText: { color: '#475569', fontWeight: '700' },
  switchTextActive: { color: '#0F766E' },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 10,
    borderWidth: 1,
    color: '#111827',
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  passwordField: { position: 'relative' },
  passwordInput: { paddingRight: 44 },
  toggleButton: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    right: 12,
    top: 12,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#0F766E',
    borderRadius: 10,
    marginTop: 8,
    paddingVertical: 14,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
