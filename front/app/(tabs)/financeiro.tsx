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

import { createLancamento, fetchDashboard, fetchFinanceiro } from '../../service/api';

export default function FinanceiroScreen() {
  const [dashboard, setDashboard] = useState<any>({});
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [tipo, setTipo] = useState('RECEITA');
  const [categoria, setCategoria] = useState('Vendas');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('0');

  const loadData = useCallback(async () => {
    const [dash, lancamentosResponse] = await Promise.all([
      fetchDashboard(),
      fetchFinanceiro(),
    ]);
    setDashboard(dash || {});
    setLancamentos(lancamentosResponse || []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const load = async () => {
        try {
          const [dash, lancamentosResponse] = await Promise.all([
            fetchDashboard(),
            fetchFinanceiro(),
          ]);
          if (active) {
            setDashboard(dash || {});
            setLancamentos(lancamentosResponse || []);
          }
        } catch (error) {
          console.warn(error);
          if (active) {
            Alert.alert('Erro', 'Não foi possível carregar os dados financeiros.');
          }
        }
      };

      load();
      return () => {
        active = false;
      };
    }, []),
  );

  const handleSubmit = async () => {
    if (!descricao.trim() || !valor || Number(valor) <= 0) {
      Alert.alert('Erro', 'Informe uma descrição e valor válido.');
      return;
    }

    try {
      await createLancamento({
        tipo,
        categoria: categoria.trim() || 'GERAL',
        descricao: descricao.trim(),
        valor: Number(valor),
      });
      setTipo('RECEITA');
      setCategoria('Vendas');
      setDescricao('');
      setValor('0');
      await loadData();
      Alert.alert('Sucesso', 'Lançamento registrado.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível registrar o lançamento.';
      Alert.alert('Erro', message);
    }
  };

  const statusMessage =
    dashboard.statusCmv === 'RISCO_DE_PREJUIZO'
      ? 'Risco de prejuízo: o CMV acima de 30% indica necessidade de revisão de custos ou preços.'
      : dashboard.statusCmv === 'OPORTUNIDADE_DE_AJUSTE'
        ? 'Oportunidade de adequação de preço: o CMV ficou abaixo de 25%.'
        : 'CMV dentro do intervalo ideal de 25% a 30%.';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Financeiro</Text>
        <Text style={styles.subtitle}>Fluxo de caixa, lançamentos e indicadores de margem.</Text>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Receitas</Text>
            <Text style={styles.summaryValue}>R$ {Number(dashboard.receitaTotal || 0).toFixed(2)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Despesas</Text>
            <Text style={styles.summaryValue}>R$ {Number(dashboard.despesaTotal || 0).toFixed(2)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Fluxo</Text>
            <Text style={styles.summaryValue}>R$ {Number(dashboard.fluxoCaixa || 0).toFixed(2)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>CMV</Text>
            <Text style={styles.summaryValue}>{Number(dashboard.cmvPercentual || 0).toFixed(2)}%</Text>
          </View>
        </View>

        <View style={styles.alertCard}>
          <Text style={styles.alertTitle}>Indicador de CMV</Text>
          <Text style={styles.alertText}>{statusMessage}</Text>
        </View>

        <View style={styles.formCard}>
          <TextInput
            onChangeText={setCategoria}
            placeholder="Categoria"
            placeholderTextColor="#64748B"
            style={styles.input}
            value={categoria}
          />
          <View style={styles.segmentedRow}>
            <Pressable onPress={() => setTipo('RECEITA')} style={[styles.segmentButton, tipo === 'RECEITA' && styles.segmentButtonActive]}>
              <Text style={[styles.segmentText, tipo === 'RECEITA' && styles.segmentTextActive]}>Receita</Text>
            </Pressable>
            <Pressable onPress={() => setTipo('DESPESA')} style={[styles.segmentButton, tipo === 'DESPESA' && styles.segmentButtonActive]}>
              <Text style={[styles.segmentText, tipo === 'DESPESA' && styles.segmentTextActive]}>Despesa</Text>
            </Pressable>
          </View>
          <TextInput
            onChangeText={setDescricao}
            placeholder="Descrição"
            placeholderTextColor="#64748B"
            style={styles.input}
            value={descricao}
          />
          <TextInput
            keyboardType="decimal-pad"
            onChangeText={setValor}
            placeholder="Valor"
            placeholderTextColor="#64748B"
            style={styles.input}
            value={valor}
          />
          <Pressable onPress={handleSubmit} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Registrar lançamento</Text>
          </Pressable>
        </View>

        <View style={styles.list}>
          {lancamentos.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.categoria}</Text>
                <Text style={styles.typeBadge}>{item.tipo}</Text>
              </View>
              <Text style={styles.cardDescription}>{item.descricao}</Text>
              <Text style={styles.totalText}>R$ {Number(item.valor || 0).toFixed(2)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4F7F6' },
  container: { padding: 20, paddingBottom: 80 },
  title: { color: '#111827', fontSize: 28, fontWeight: '800', marginBottom: 4 },
  subtitle: { color: '#64748B', fontSize: 15, marginBottom: 18 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  summaryCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, width: '48%' },
  summaryLabel: { color: '#64748B', fontSize: 12, marginBottom: 6 },
  summaryValue: { color: '#111827', fontSize: 18, fontWeight: '800' },
  alertCard: { backgroundColor: '#FFF7ED', borderRadius: 14, padding: 14, marginBottom: 18 },
  alertTitle: { color: '#9A4D00', fontSize: 14, fontWeight: '800', marginBottom: 6 },
  alertText: { color: '#7C2D12', fontSize: 14 },
  formCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 18 },
  segmentedRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  segmentButton: { alignItems: 'center', backgroundColor: '#E2E8F0', borderRadius: 10, flex: 1, paddingVertical: 10 },
  segmentButtonActive: { backgroundColor: '#0F766E' },
  segmentText: { color: '#0F172A', fontWeight: '700' },
  segmentTextActive: { color: '#FFFFFF' },
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
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#0F766E',
    borderRadius: 10,
    paddingVertical: 12,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  list: { gap: 12 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTitle: { color: '#111827', fontSize: 18, fontWeight: '800' },
  cardDescription: { color: '#64748B', fontSize: 14, marginBottom: 8 },
  typeBadge: { backgroundColor: '#ECFDF5', color: '#166534', fontSize: 12, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  totalText: { color: '#111827', fontSize: 15, fontWeight: '800' },
});
