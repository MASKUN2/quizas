'use client';

// 본문 마크다운 에디터. 이미지를 붙여넣기(⌘V)/드래그/파일선택으로 올리면 즉시 업로드하고
// 커서 위치에 ![](url) 을 자동 삽입한다. 업로드 중엔 플레이스홀더를 두었다가 완료 시 치환.
// [편집|미리보기] 토글로 공개 글과 동일 렌더러로 확인. 폼 제출은 항상 살아있는 textarea(name)로.
import { useRef, useState } from 'react';
import { Markdown } from './markdown';

const field = 'rounded-md border border-border bg-background px-3 py-2';

export function BodyEditor({
  name = 'content',
  defaultValue = '',
  rows = 16,
}: {
  name?: string;
  defaultValue?: string;
  rows?: number;
}) {
  const [value, setValue] = useState(defaultValue);
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const idRef = useRef(0);
  const fileRef = useRef<HTMLInputElement>(null);

  function insertAtCursor(text: string) {
    const ta = taRef.current;
    if (!ta) {
      setValue((v) => v + text);
      return;
    }
    const start = ta.selectionStart ?? value.length;
    const end = ta.selectionEnd ?? value.length;
    setValue((v) => v.slice(0, start) + text + v.slice(end));
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + text.length;
      ta.setSelectionRange(pos, pos);
    });
  }

  async function uploadFile(file: File) {
    const token = `uploading-${++idRef.current}`;
    const placeholder = `![Uploading…](${token})`;
    insertAtCursor(`${placeholder}\n`);
    setBusy((n) => n + 1);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/admin/api/upload', { method: 'POST', body: fd });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Upload failed.');
      setValue((v) => v.replace(placeholder, `![](${data.url})`));
    } catch (err) {
      setValue((v) => v.replace(`${placeholder}\n`, '').replace(placeholder, ''));
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setBusy((n) => n - 1);
    }
  }

  function handleFiles(files: FileList | File[]) {
    const images = Array.from(files).filter((f) => f.type.startsWith('image/'));
    images.forEach(uploadFile);
  }

  function onPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const files = Array.from(e.clipboardData.items)
      .filter((it) => it.kind === 'file' && it.type.startsWith('image/'))
      .map((it) => it.getAsFile())
      .filter((f): f is File => f !== null);
    if (files.length) {
      e.preventDefault();
      handleFiles(files);
    }
  }

  function onDrop(e: React.DragEvent<HTMLTextAreaElement>) {
    if (Array.from(e.dataTransfer.files).some((f) => f.type.startsWith('image/'))) {
      e.preventDefault();
      handleFiles(e.dataTransfer.files);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3 text-sm">
        <div className="inline-flex overflow-hidden rounded-md border border-border">
          <button
            type="button"
            onClick={() => setMode('edit')}
            className={`px-3 py-1 ${mode === 'edit' ? 'bg-subtle font-medium' : 'text-muted'}`}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setMode('preview')}
            className={`px-3 py-1 ${mode === 'preview' ? 'bg-subtle font-medium' : 'text-muted'}`}
          >
            Preview
          </button>
        </div>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="text-muted hover:underline"
        >
          Add image
        </button>
        {busy > 0 ? <span className="text-muted">⏳ Uploading… ({busy})</span> : null}
        {error ? <span className="text-red-600">{error}</span> : null}
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {/* textarea 는 항상 마운트(폼 제출용). 미리보기에선 숨김. */}
      <textarea
        ref={taRef}
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onPaste={onPaste}
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        placeholder="Body (Markdown) — paste, drag, or pick images"
        required
        rows={rows}
        className={`${field} font-mono ${mode === 'preview' ? 'hidden' : ''}`}
      />
      {mode === 'preview' ? (
        <div className={`${field} min-h-40`}>
          {value.trim() ? (
            <Markdown>{value}</Markdown>
          ) : (
            <p className="text-muted">Nothing to preview.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
