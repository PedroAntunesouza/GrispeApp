import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { createIngrediente, fetchIngredientes, registrarMovimentacao } from '../../service/api';

export default function EstoqueScreen() {
  const [ingredientes, setIngredientes] = useState<any[]>([]);
  const [form, setForm] = useState({
    nome: '',
    unidadeMedida: 'kg',
    quantidadeAtual: '0',
    estoqueMinimo: '0',
    precoUnitario: '0',
  });

  const loadIngredientes = useCallback(async () => {
    const data = await fetchIngredientes();
    setIngredientes(data || []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const load = async () => {
        try {
          const data = await fetchIngredientes();
          if (active) {
            setIngredientes(data || []);
          }
        } catch (error) {
          console.warn(error);
          if (active) {
            Alert.alert('Erro', 'Não foi possível carregar o estoque.');
          }
        }
      };

      load();
      return () => {
        active = false;
      };
    }, []),
  );

  const handleCreate = async () => {
    if (!form.nome.trim()) {
      Alert.alert('Erro', 'Informe o nome do ingrediente.');
      return;
    }

    try {
      await createIngrediente({
        nome: form.nome.trim(),
        unidadeMedida: form.unidadeMedida.trim() || 'un',
        quantidadeAtual: Number(form.quantidadeAtual || 0),
        estoqueMinimo: Number(form.estoqueMinimo || 0),
        precoUnitario: Number(form.precoUnitario || 0),
      });
      setForm({
        nome: '',
        unidadeMedida: 'kg',
        quantidadeAtual: '0',
        estoqueMinimo: '0',
        precoUnitario: '0',
      });
      await loadIngredientes();
      Alert.alert('Sucesso', 'Ingrediente cadastrado.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível cadastrar o ingrediente.';
      Alert.alert('Erro', message);
    }
  };

  const handleMovimentacao = async (id: number, tipo: 'ENTRADA' | 'SAIDA') => {
    try {
      await registrarMovimentacao(id, {
        tipo,
        quantidade: 1,
        motivo: tipo === 'ENTRADA' ? 'Entrada manual' : 'Baixa manual',
      });
      await loadIngredientes();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível registrar a movimentação.';
      Alert.alert('Erro', message);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Estoque</Text>
        <Text style={styles.subtitle}>Controle de insumos e alertas de nível crítico.</Text>

        <View style={styles.formCard}>
          <TextInput
            onChangeText={(value) => setForm((current) => ({ ...current, nome: value }))}
            placeholder="Nome do ingrediente"
            placeholderTextColor="#64748B"
            style={styles.input}
            value={form.nome}
          />
          <View style={styles.rowTwo}>
            <TextInput
              onChangeText={(value) => setForm((current) => ({ ...current, unidadeMedida: value }))}
              placeholder="Unidade"
              placeholderTextColor="#64748B"
              style={[styles.input, styles.halfInput]}
              value={form.unidadeMedida}
            />
            <TextInput
              keyboardType="numeric"
              onChangeText={(value) => setForm((current) => ({ ...current, quantidadeAtual: value }))}
              placeholder="Qtd"
              placeholderTextColor="#64748B"
              style={[styles.input, styles.halfInput]}
              value={form.quantidadeAtual}
            />
          </View>
          <View style={styles.rowTwo}>
            <TextInput
              keyboardType="numeric"
              onChangeText={(value) => setForm((current) => ({ ...current, estoqueMinimo: value }))}
              placeholder="Estoque mínimo"
              placeholderTextColor="#64748B"
              style={[styles.input, styles.halfInput]}
              value={form.estoqueMinimo}
            />
            <TextInput
              keyboardType="decimal-pad"
              onChangeText={(value) => setForm((current) => ({ ...current, precoUnitario: value }))}
              placeholder="Preço unitário"
              placeholderTextColor="#64748B"
              style={[styles.input, styles.halfInput]}
              value={form.precoUnitario}
            />
          </View>
          <Pressable onPress={handleCreate} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Cadastrar ingrediente</Text>
          </Pressable>
        </View>

        <View style={styles.list}>
          {ingredientes.map((item) => {
            const emAlerta = Number(item.quantidadeAtual || 0) <= Number(item.estoqueMinimo || 0);
            return (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.cardTitle}>{item.nome}</Text>
                    <Text style={styles.cardMeta}>{item.unidadeMedida}</Text>
                  </View>
                  <View style={[styles.badge, emAlerta && styles.badgeWarning]}>
                    <Text style={[styles.badgeText, emAlerta && styles.badgeWarningText]}>
                      {emAlerta ? 'Crítico' : 'Normal'}
                    </Text>
                  </View>
                </View>

                <View style={styles.metricsRow}>
                  <View style={styles.metricBox}>
                    <Text style={styles.metricLabel}>Disponível</Text>
                    <Text style={styles.metricValue}>{Number(item.quantidadeAtual || 0)}</Text>
                  </View>
                  <View style={styles.metricBox}>
                    <Text style={styles.metricLabel}>Mínimo</Text>
                    <Text style={styles.metricValue}>{Number(item.estoqueMinimo || 0)}</Text>
                  </View>
                  <View style={styles.metricBox}>
                    <Text style={styles.metricLabel}>Preço</Text>
                    <Text style={styles.metricValue}>R$ {Number(item.precoUnitario || 0).toFixed(2)}</Text>
                  </View>
                </View>

                <View style={styles.actionRow}>
                  <Pressable onPress={() => handleMovimentacao(item.id, 'ENTRADA')} style={styles.actionButtonPositive}>
                    <Text style={styles.actionButtonText}>Entrada</Text>
                  </Pressable>
                  <Pressable onPress={() => handleMovimentacao(item.id, 'SAIDA')} style={styles.actionButtonNegative}>
                    <Text style={styles.actionButtonText}>Saída</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFF7FF' },
  container: { padding: 20, paddingBottom: 80 },
  title: { color: '#332D36', fontSize: 28, fontWeight: '800', marginBottom: 4 },
  subtitle: { color: '#777078', fontSize: 15, marginBottom: 18 },
  formCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 18 },
  input: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 10,
    borderWidth: 1,
    color: '#111827',
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  rowTwo: { flexDirection: 'row', gap: 10 },
  halfInput: { flex: 1 },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#6B52A3',
    borderRadius: 10,
    paddingVertical: 12,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  list: { gap: 12 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTitle: { color: '#111827', fontSize: 18, fontWeight: '800' },
  cardMeta: { color: '#64748B', fontSize: 13, marginTop: 4 },
  badge: { backgroundColor: '#DCFCE7', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  badgeWarning: { backgroundColor: '#FEE2E2' },
  badgeText: { color: '#166534', fontSize: 12, fontWeight: '700' },
  badgeWarningText: { color: '#B91C1C' },
  metricsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  metricBox: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 10, padding: 10 },
  metricLabel: { color: '#64748B', fontSize: 11, marginBottom: 4 },
  metricValue: { color: '#111827', fontSize: 14, fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionButtonPositive: { flex: 1, alignItems: 'center', backgroundColor: '#16A34A', borderRadius: 10, paddingVertical: 10 },
  actionButtonNegative: { flex: 1, alignItems: 'center', backgroundColor: '#DC2626', borderRadius: 10, paddingVertical: 10 },
  actionButtonText: { color: '#FFFFFF', fontWeight: '700' },
});
