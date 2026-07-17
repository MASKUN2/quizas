// 서버 전용: 본문 이미지의 MinIO 저장/조회. 클라이언트로 import 금지(자격증명 유출).
//   - 업로드:  POST /admin/api/upload  → putImage()
//   - 서빙:    GET  /images/[...key]   → getImage()
// 키는 콘텐츠 해시(sha256)+확장자 → 같은 이미지 재업로드 시 dedup, 불변이라 영구 캐시 가능.
import { createHash } from 'node:crypto';
import type { Readable } from 'node:stream';
import { Client } from 'minio';

const endpoint = new URL(process.env.MINIO_ENDPOINT ?? 'http://127.0.0.1:9000');

export const BUCKET = process.env.MINIO_BUCKET ?? 'quizas-media';

const minio = new Client({
  endPoint: endpoint.hostname,
  port: Number(endpoint.port) || (endpoint.protocol === 'https:' ? 443 : 80),
  useSSL: endpoint.protocol === 'https:',
  accessKey: process.env.MINIO_ACCESS_KEY ?? '',
  secretKey: process.env.MINIO_SECRET_KEY ?? '',
});

/** 업로드 정책 (design/spec/policies.md §5.7). */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB

interface ImageKind {
  ext: string;
  contentType: string;
}

// 확장자/헤더는 위조 가능 → 실제 바이트(매직 넘버)로 형식을 판별한다. SVG는 거부(스크립트 주입).
export function sniffImage(buf: Uint8Array): ImageKind | null {
  const b = buf;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47)
    return { ext: 'png', contentType: 'image/png' };
  // JPEG: FF D8 FF
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff)
    return { ext: 'jpg', contentType: 'image/jpeg' };
  // GIF: "GIF8"
  if (b.length >= 4 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38)
    return { ext: 'gif', contentType: 'image/gif' };
  // WebP: "RIFF"...."WEBP"
  if (
    b.length >= 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  )
    return { ext: 'webp', contentType: 'image/webp' };
  return null;
}

// 키 → Content-Type (서빙 시 확장자로 역산). 알 수 없으면 범용 바이너리.
const EXT_CONTENT_TYPE: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
};

export function contentTypeForKey(key: string): string {
  const ext = key.split('.').pop()?.toLowerCase() ?? '';
  return EXT_CONTENT_TYPE[ext] ?? 'application/octet-stream';
}

/** 이미지 바이트를 저장하고 콘텐츠 주소 키(<sha256>.<ext>)를 반환. 동일 내용이면 같은 키. */
export async function putImage(buf: Buffer, kind: ImageKind): Promise<string> {
  const hash = createHash('sha256').update(buf).digest('hex');
  const key = `${hash}.${kind.ext}`;
  await minio.putObject(BUCKET, key, buf, buf.length, {
    'Content-Type': kind.contentType,
  });
  return key;
}

/** 키로 객체 스트림을 반환. 없으면 null. */
export async function getImage(key: string): Promise<Readable | null> {
  try {
    return await minio.getObject(BUCKET, key);
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === 'NoSuchKey' || code === 'NotFound') return null;
    throw err;
  }
}
