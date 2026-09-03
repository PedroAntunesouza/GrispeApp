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

import { createReceita, fetchReceitas } from '../../service/api';

export default function ReceitasScreen() {
  const [receitas, setReceitas] = useState<any[]>([]);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [itens, setItens] = useState([{ ingredienteId: '', quantidade: '1' }]);

  const loadData = useCallback(async () => {
    const [receitasResponse] = await Promise.all([fetchReceitas()]);
    setReceitas(receitasResponse || []);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const load = async () => {
        try {
          const receitasResponse = await fetchReceitas();
          if (active) {
            setReceitas(receitasResponse || []);
          }
        } catch (error) {
          console.warn(error);
          if (active) {
            Alert.alert('Erro', 'Não foi possível carregar receitas.');
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
    setItens((current) => [...current, { ingredienteId: '', quantidade: '1' }]);
  };

  const updateItem = (index: number, field: 'ingredienteId' | 'quantidade', value: string) => {
    setItens((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  };

  const handleSubmit = async () => {
    if (!nome.trim()) {
      Alert.alert('Erro', 'Informe o nome da receita.');
      return;
    }

    const ingredientesValidos = itens
      .filter((item) => item.ingredienteId)
      .map((item) => ({
        ingredienteId: Number(item.ingredienteId),
        quantidade: Number(item.quantidade || 0),
      }));

    if (!ingredientesValidos.length) {
      Alert.alert('Erro', 'Adicione pelo menos um ingrediente na receita.');
      return;
    }

    try {
      await createReceita({
        nome: nome.trim(),
        descricao,
        ingredientes: ingredientesValidos,
      });
      setNome('');
      setDescricao('');
      setItens([{ ingredienteId: '', quantidade: '1' }]);
      await loadData();
      Alert.alert('Sucesso', 'Receita cadastrada.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível salvar a receita.';
      Alert.alert('Erro', message);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Doces e receitas</Text>
        <Text style={styles.subtitle}>Cadastre doces e suas fichas técnicas.</Text>

        <View style={styles.formCard}>
          <TextInput
            onChangeText={setNome}
            placeholder="Nome da receita"
            placeholderTextColor="#64748B"
            style={styles.input}
            value={nome}
          />
          <TextInput
            multiline
            onChangeText={setDescricao}
            placeholder="Descrição da receita"
            placeholderTextColor="#64748B"
            style={[styles.input, styles.textArea]}
            value={descricao}
          />

          {itens.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <Text style={styles.itemLabel}>Ingrediente {index + 1}</Text>
              <View style={styles.itemFields}>
                <TextInput
                  placeholder="ID do ingrediente"
                  placeholderTextColor="#64748B"
                  style={[styles.input, styles.flexInput]}
                  value={item.ingredienteId}
                  onChangeText={(value) => updateItem(index, 'ingredienteId', value)}
                />
                <TextInput
                  keyboardType="decimal-pad"
                  placeholder="Qtd"
                  placeholderTextColor="#64748B"
                  style={[styles.input, styles.smallInput]}
                  value={item.quantidade}
                  onChangeText={(value) => updateItem(index, 'quantidade', value)}
                />
              </View>
            </View>
          ))}

          <Pressable onPress={addItem} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Adicionar ingrediente</Text>
          </Pressable>

          <Pressable onPress={handleSubmit} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Salvar receita</Text>
          </Pressable>
        </View>

        <View style={styles.list}>
          {receitas.map((receita) => (
            <View key={receita.id} style={styles.card}>
              <Text style={styles.cardTitle}>{receita.nome}</Text>
              {receita.descricao ? <Text style={styles.cardDescription}>{receita.descricao}</Text> : null}
              <View style={styles.ingredientList}>
                {(receita.ingredientes || []).map((linha: any) => (
                  <Text key={linha.id} style={styles.ingredientText}>
                    Ingrediente {linha.ingredienteId || 'N/A'}: {linha.quantidade}
                  </Text>
                ))}
              </View>
            </View>
          ))}
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
  formCard: { backgroundColor: '#FFFFFF', borderColor: '#8D878D', borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 18 },
  input: {
    backgroundColor: '#FFF7FF',
    borderColor: '#8D878D',
    borderRadius: 10,
    borderWidth: 1,
    color: '#332D36',
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  itemRow: { marginBottom: 8 },
  itemLabel: { color: '#475569', fontSize: 13, fontWeight: '700', marginBottom: 6 },
  itemFields: { flexDirection: 'row', gap: 10 },
  flexInput: { flex: 1 },
  smallInput: { width: 88 },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#E5E1E5',
    borderRadius: 10,
    marginBottom: 12,
    paddingVertical: 12,
  },
  secondaryButtonText: { color: '#6B52A3', fontWeight: '700' },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#6B52A3',
    borderRadius: 10,
    paddingVertical: 12,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  list: { gap: 12 },
  card: { backgroundColor: '#E5E1E5', borderColor: '#8D878D', borderRadius: 14, borderWidth: 1, padding: 16 },
  cardTitle: { color: '#332D36', fontSize: 18, fontWeight: '800', marginBottom: 6 },
  cardDescription: { color: '#777078', fontSize: 14, marginBottom: 10 },
  ingredientList: { gap: 6 },
  ingredientText: { color: '#332D36', fontSize: 14 },
});
