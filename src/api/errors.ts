import { ApiError } from './client';

// Turkish copy for the API's stable error codes (ADR-0045). The server's own text is English and for developers.
const byCode: Record<string, string> = {
  'EMAIL.REQUIRED': 'E-posta adresi gerekli.',
  'EMAIL.INVALID': 'Geçerli bir e-posta adresi gir.',
  'EMAIL.TOO_LONG': 'E-posta adresi çok uzun.',
  'PASSWORD.REQUIRED': 'Şifre gerekli.',
  'PASSWORD.TOO_SHORT': 'Şifre en az 12 karakter olmalı.',
  'PASSWORD.TOO_LONG': 'Şifre en fazla 64 karakter olabilir.',
  'PASSWORD.TOO_MANY_BYTES': 'Şifre çok uzun.',
  'PASSWORD.BREACHED': 'Bu şifre bilinen veri sızıntılarında geçiyor. Başka bir şifre seç.',
  'PASSWORD.CONTEXT_WORD': 'Şifre adını veya e-postanı içermemeli.',
  'PASSWORD.UNCHANGED': 'Yeni şifre eskisinden farklı olmalı.',
  'CURRENT_PASSWORD.INCORRECT': 'Mevcut şifre yanlış.',
  'DISPLAY_NAME.REQUIRED': 'Bir ad gir.',
  'DISPLAY_NAME.TOO_LONG': 'Ad çok uzun.',
  'QUERY.TOO_SHORT': 'Aramak için biraz daha yaz.',
  'VIDEO.INVALID': 'Geçersiz parça.',
  'NAME.REQUIRED': 'Bir ad gir.',
  'NAME.TOO_LONG': 'Ad çok uzun.',
  'ENDS_AT.BEFORE_START': 'Bitiş, başlangıçtan sonra olmalı.',
  'LICENCE.NOT_ALLOWED': 'Bu lisans burada kullanılamaz.',
  'PRESENCE_PROOF.REQUIRED': 'Konum/saat kısıtı için bir doğrulama yöntemi seç.',
  'GEOFENCE.REQUIRED': 'Mekân konumu ve yarıçapı gerekli.',
  'GENRES.TOO_MANY': 'Çok fazla tür seçtin.',
  'PROVIDER.UNKNOWN': 'Google ile giriş sunucuda henüz ayarlanmamış.',
  'SOCIAL.EMAIL_UNVERIFIED': 'Google bu e-posta adresini doğrulamamış.',
  'SOCIAL.ALREADY_LINKED': 'Bu Google hesabı zaten bir hesaba bağlı.',
  'SOCIAL.LAST_SIGN_IN_METHOD': 'Bu tek giriş yolun. Kaldırmadan önce bir şifre belirle.',
  'INTERNAL.UNEXPECTED': 'Sunucuda beklenmeyen bir hata oluştu.',
};

const byStatus: Record<number, string> = {
  400: 'İstek geçersiz.',
  401: 'Oturumun sona erdi. Tekrar giriş yap.',
  404: 'Bulunamadı.',
  409: 'Bu işlem mevcut durumla çakışıyor.',
  410: 'Bağlantının süresi dolmuş.',
  412: 'Başka biri bunu az önce değiştirdi. Yenilendi, tekrar dene.',
  422: 'Girilen bilgiler geçersiz.',
  429: 'Çok fazla deneme. Biraz bekleyip tekrar dene.',
  503: 'Servis şu an yanıt vermiyor.',
};

/** One user-facing sentence for any thrown value. */
export function describeError(e: unknown): string {
  if (!(e instanceof ApiError)) return 'Beklenmeyen bir hata oluştu.';
  if (e.network) return 'Sunucuya ulaşılamıyor. Bağlantını kontrol et.';
  for (const c of e.codes) if (byCode[c]) return byCode[c];
  const first = Object.values(e.fieldErrors).flat()[0];
  if (e.status === 422 && first) return first;
  return byStatus[e.status] ?? (e.status >= 500 ? byCode['INTERNAL.UNEXPECTED'] : `Hata (${e.status}).`);
}

export const isStatus = (e: unknown, ...s: number[]) => e instanceof ApiError && s.includes(e.status);

/**
 * The mail carries either a bare code or a link `…?token=<url-encoded code>`. Accept whatever was pasted:
 * the whole link, the encoded code, stray spaces or line breaks.
 */
export function extractToken(raw: string): string {
  const s = raw.trim();
  const m = s.match(/[?&]token=([^&#\s]+)/);
  const t = (m ? m[1] : s).replace(/\s+/g, '');
  try { return decodeURIComponent(t); } catch { return t; }
}
