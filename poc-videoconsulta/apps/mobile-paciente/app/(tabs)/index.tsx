import { useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { createSession, getSession } from '../../src/services/orchestrator';
import { getActiveSession } from '../../src/storage/active-session';

export default function HomeScreen() {
  const { error: routeError } = useLocalSearchParams<{ error?: string }>();
  const [sessionId, setSessionId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const restoreAttempted = useRef(false);

  useEffect(() => {
    if (typeof routeError === 'string') setError(routeError);
  }, [routeError]);

  useEffect(() => {
    if (restoreAttempted.current) return;
    restoreAttempted.current = true;

    const active = getActiveSession();
    if (!active) return;

    void (async () => {
      try {
        const snapshot = await getSession(active.sessionId);
        if (snapshot.state === 'encerrada' || snapshot.state === 'vetada') return;
        router.replace(`/consulta/${active.sessionId}`);
      } catch (err) {
        console.error('[home] Erro ao restaurar sessão ativa', {
          sessionId: active.sessionId,
          err,
        });
      }
    })();
  }, []);

  async function handleCreateSession() {
    setLoading(true);
    setError(null);
    try {
      const session = await createSession();
      router.push(`/consulta/${session.id}`);
    } catch (err) {
      console.error('[home] Erro ao criar sessão', { err });
      setError(err instanceof Error ? err.message : 'Erro ao criar sessão');
    } finally {
      setLoading(false);
    }
  }

  function handleJoin() {
    if (!sessionId.trim()) return;
    router.push(`/consulta/${sessionId.trim()}`);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>PoC LiveKit — Paciente</Text>
      <Button title={loading ? 'Criando…' : 'Nova consulta (dev)'} onPress={handleCreateSession} disabled={loading} />
      <TextInput
        style={styles.input}
        placeholder="ID da sessão"
        value={sessionId}
        onChangeText={setSessionId}
        autoCapitalize="none"
      />
      <Button title="Entrar como paciente" onPress={handleJoin} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12 },
  error: { color: '#b00020' },
});
