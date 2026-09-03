import { useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';

export default function AgendaScreen() {
  const [event, setEvent] = useState('');
  const [events, setEvents] = useState<string[]>([]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Agenda</Text>
        <Text style={styles.subtitle}>Organize entregas e compromissos da confeitaria.</Text>
        <View style={styles.formCard}>
          <TextInput
            value={event}
            onChangeText={setEvent}
            placeholder="Nova anotação"
            placeholderTextColor="#777078"
            style={styles.input}
          />
          <Pressable
            onPress={() => {
              if (event.trim()) {
                setEvents((current) => [...current, event.trim()]);
                setEvent('');
              }
            }}
            style={styles.button}>
            <Text style={styles.buttonText}>Adicionar à agenda</Text>
          </Pressable>
        </View>
        {events.length === 0 ? (
          <Text style={styles.empty}>Nenhum compromisso registrado.</Text>
        ) : (
          events.map((item, index) => (
            <View key={`${item}-${index}`} style={styles.card}>
              <Text style={styles.cardText}>{item}</Text>
            </View>
          ))
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFF7FF' },
  container: { flex: 1, padding: 20 },
  title: { color: '#332D36', fontSize: 28, fontWeight: '800', marginBottom: 4 },
  subtitle: { color: '#777078', fontSize: 15, marginBottom: 18 },
  formCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 18 },
  input: { backgroundColor: '#FFF7FF', borderColor: '#8D878D', borderRadius: 10, borderWidth: 1, color: '#332D36', marginBottom: 12, padding: 12 },
  button: { alignItems: 'center', backgroundColor: '#6B52A3', borderRadius: 10, padding: 12 },
  buttonText: { color: '#FFFFFF', fontWeight: '800' },
  empty: { color: '#777078', textAlign: 'center' },
  card: { backgroundColor: '#E5E1E5', borderColor: '#8D878D', borderRadius: 12, borderWidth: 1, marginBottom: 10, padding: 16 },
  cardText: { color: '#332D36', fontSize: 16, fontWeight: '700' },
});
