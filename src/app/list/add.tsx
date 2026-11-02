import { useLocalSearchParams } from 'expo-router';
import { api, ApiError } from '@/api/client';
import { describeError } from '@/api/errors';
import { AddSongs } from '@/components/AddSongs';
import { useAsync } from '@/lib/useAsync';

/** Add records to a playlist. Each add carries a fresh ETag; one retry covers somebody else writing first. */
export default function AddToList() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const current = useAsync(() => api.playlists.allTracks(id), [id]);
  return (
    <AddSongs
      title="Plak ekle"
      existing={new Set((current.data?.tracks ?? []).map((t) => t.youtubeVideoId))}
      existsLabel="Listede"
      excludeListId={id}
      emptyHint="Aramak için en az iki harf yaz ya da başka bir listenden seç. Aynı plak iki kez de eklenebilir."
      addedText={(t) => `“${t.title}” listeye eklendi`}
      onAdd={async (t) => {
        try {
          for (let attempt = 0; ; attempt++) {
            const { etag } = await api.playlists.allTracks(id);
            try {
              await api.playlists.addTrack(id, { youtubeVideoId: t.id }, etag ?? '');
              return 'added';
            } catch (e) {
              if (!(e instanceof ApiError && e.status === 412 && attempt === 0)) throw e;
            }
          }
        } catch (e) {
          return {
            error: e instanceof ApiError && e.status === 404 ? 'Bu listeye plak ekleme iznin yok'
              : e instanceof ApiError && e.status === 409 ? 'Liste dolu'
                : describeError(e),
          };
        }
      }}
    />
  );
}
