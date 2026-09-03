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

import { atualizarStatusPedido, createPedido, fetchPedidos } from '../../service/api';

export default function PedidosScreen() {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [itens, setItens] = useState([{ receitaId: '', quantidade: '1', precoVenda: '0' }]);
  const [cliente, setCliente] = useState('');
  const [observacao, setObservacao] = useState('');

  const loadData = useCallback(async () => {
    const pedidosResponse = await fetchPedidos();
    setPedidos(pedidosResponse || []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const load = async () => {
        try {
          const pedidosResponse = await fetchPedidos();
          if (active) {
            setPedidos(pedidosResponse || []);
          }
        } catch (error) {
          console.warn(error);
          if (active) {
            Alert.alert('Erro', 'Não foi possível carregar pedidos.');
          }
        }
      };

      load();
      return () => {
        active = false;
      };
    }, []),
  );

  const addItem = () => {
    setItens((current) => [...current, { receitaId: '', quantidade: '1', precoVenda: '0' }]);
  };

  const updateItem = (index: number, field: 'receitaId' | 'quantidade' | 'precoVenda', value: string) => {
    setItens((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  };

  const handleSubmit = async () => {
    if (!cliente.trim()) {
      Alert.alert('Erro', 'Informe o cliente do pedido.');
      return;
    }

    const itensValidos = itens
      .filter((item) => item.receitaId)
      .map((item) => ({
        receitaId: Number(item.receitaId),
        quantidade: Number(item.quantidade || 0),
        precoVenda: Number(item.precoVenda || 0),
      }));

    if (!itensValidos.length) {
      Alert.alert('Erro', 'Adicione pelo menos um item ao pedido.');
      return;
    }

    try {
      await createPedido({ cliente: cliente.trim(), observacao, itens: itensValidos });
      setCliente('');
      setObservacao('');
      setItens([{ receitaId: '', quantidade: '1', precoVenda: '0' }]);
      await loadData();
      Alert.alert('Sucesso', 'Pedido registrado.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível salvar o pedido.';
      Alert.alert('Erro', message);
    }
  };

  const handleStatusUpdate = async (id: number, status: string) => {
    try {
      await atualizarStatusPedido(id, status);
      await loadData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível atualizar o status do pedido.';
      Alert.alert('Erro', message);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Pedidos</Text>
        <Text style={styles.subtitle}>Controle de encomendas e status da produção.</Text>

        <View style={styles.formCard}>
          <TextInput
            onChangeText={setCliente}
            placeholder="Cliente"
            placeholderTextColor="#64748B"
            style={styles.input}
            value={cliente}
          />
          <TextInput
            multiline
            onChangeText={setObservacao}
            placeholder="Observações"
            placeholderTextColor="#64748B"
            style={[styles.input, styles.textArea]}
            value={observacao}
          />

          {itens.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <Text style={styles.itemLabel}>Item {index + 1}</Text>
              <View style={styles.itemFields}>
                <TextInput
                  placeholder="ID da receita"
                  placeholderTextColor="#64748B"
                  style={[styles.input, styles.flexInput]}
                  value={item.receitaId}
                  onChangeText={(value) => updateItem(index, 'receitaId', value)}
                />
                <TextInput
                  keyboardType="numeric"
                  placeholder="Qtd"
                  placeholderTextColor="#64748B"
                  style={[styles.input, styles.smallInput]}
                  value={item.quantidade}
                  onChangeText={(value) => updateItem(index, 'quantidade', value)}
                />
                <TextInput
                  keyboardType="decimal-pad"
                  placeholder="Preço"
                  placeholderTextColor="#64748B"
                  style={[styles.input, styles.smallInput]}
                  value={item.precoVenda}
                  onChangeText={(value) => updateItem(index, 'precoVenda', value)}
                />
              </View>
            </View>
          ))}

          <Pressable onPress={addItem} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Adicionar item</Text>
          </Pressable>

          <Pressable onPress={handleSubmit} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Salvar pedido</Text>
          </Pressable>
        </View>

        <View style={styles.list}>
          {pedidos.map((pedido) => (
            <View key={pedido.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{pedido.cliente}</Text>
                <Text style={styles.statusBadge}>{pedido.status}</Text>
              </View>
              <Text style={styles.cardMeta}>Pedido #{pedido.id}</Text>
              {(pedido.itens || []).map((item: any) => (
                <Text key={item.id} style={styles.ingredientText}>
                  Receita {item.receitaId || 'N/A'} x {item.quantidade} - R$ {Number(item.precoVenda || 0).toFixed(2)}
                </Text>
              ))}
              <Text style={styles.totalText}>Total: R$ {Number(pedido.valorTotal || 0).toFixed(2)}</Text>
              <View style={styles.actionRow}>
                <Pressable onPress={() => handleStatusUpdate(pedido.id, 'EM_PRODUCAO')} style={styles.actionButtonPositive}>
                  <Text style={styles.actionButtonText}>Em produção</Text>
                </Pressable>
                <Pressable onPress={() => handleStatusUpdate(pedido.id, 'CONCLUIDO')} style={styles.actionButtonPositiveSecondary}>
                  <Text style={styles.actionButtonText}>Concluído</Text>
                </Pressable>
                <Pressable onPress={() => handleStatusUpdate(pedido.id, 'CANCELADO')} style={styles.actionButtonNegative}>
                  <Text style={styles.actionButtonText}>Cancelar</Text>
                </Pressable>
              </View>
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
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  itemRow: { marginBottom: 8 },
  itemLabel: { color: '#475569', fontSize: 13, fontWeight: '700', marginBottom: 6 },
  itemFields: { flexDirection: 'row', gap: 6 },
  flexInput: { flex: 1 },
  smallInput: { width: 72 },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    marginBottom: 12,
    paddingVertical: 12,
  },
  secondaryButtonText: { color: '#0F172A', fontWeight: '700' },
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
  cardMeta: { color: '#64748B', fontSize: 13, marginBottom: 8 },
  statusBadge: { backgroundColor: '#ECFDF5', color: '#166534', fontSize: 12, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  ingredientText: { color: '#334155', fontSize: 14, marginBottom: 6 },
  totalText: { color: '#0F172A', fontSize: 15, fontWeight: '800', marginTop: 8 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionButtonPositive: { flex: 1, alignItems: 'center', backgroundColor: '#16A34A', borderRadius: 10, paddingVertical: 10 },
  actionButtonPositiveSecondary: { flex: 1, alignItems: 'center', backgroundColor: '#0EA5E9', borderRadius: 10, paddingVertical: 10 },
  actionButtonNegative: { flex: 1, alignItems: 'center', backgroundColor: '#DC2626', borderRadius: 10, paddingVertical: 10 },
  actionButtonText: { color: '#FFFFFF', fontWeight: '700' },
});
