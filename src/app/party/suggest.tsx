import { useLocalSearchParams } from 'expo-router';
import { api, ApiError } from '@/api/client';
import { describeError } from '@/api/errors';
import { AddSongs } from '@/components/AddSongs';
import { useAsync } from '@/lib/useAsync';

/** Suggest songs for a party. The room updates itself from the event hub. */
export default function Suggest() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queue = useAsync(() => api.events.queue(id, { pageSize: 50 }), [id]);
  return (
    <AddSongs
      title="Şarkı ekle"
      existing={new Set((queue.data ?? []).map((e) => e.youtubeVideoId))}
      existsLabel="Sırada"
      emptyHint="Aramak için en az iki harf yaz. Eklediğin şarkıyı herkes oylayabilir."
      addedText={(t) => `“${t.title}” sıraya eklendi`}
      onAdd={async (t) => {
        try {
          await api.events.suggest(id, t.id);
          return 'added';
        } catch (e) {
          if (e instanceof ApiError && e.status === 409) return 'exists';
          return { error: e instanceof ApiError && e.status === 404 ? 'Bu partiye şarkı ekleyemezsin' : describeError(e) };
        }
      }}
    />
  );
}
