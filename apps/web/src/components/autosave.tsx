'use client';

// 임시글 자동저장 (design/spec/functional.md §4.1, ui-design.md §7.5 Autosave indicator).
// 60초마다, 직전 저장 이후 변경분이 있을 때만 서버 액션 autosaveDraft 를 호출한다.
// - 새 글: 제목·본문·카테고리가 다 채워지면 draft 를 생성하고, 이후 그 id 로 갱신한다.
//   생성되면 폼의 hidden id 를 채우고 URL 을 편집 페이지로 바꿔 새로고침 시 이어지게 한다.
// - 발행(PUBLISHED)된 글: 자동저장하지 않는다(인디케이터도 표시하지 않음).
// 폼 값은 new FormData(form) 로 통째로 읽는다(BodyEditor 가 본문을 textarea 로 미러링).
import { useEffect, useRef, useState } from 'react';
import { autosaveDraft } from '@/app/admin/actions';

const INTERVAL_MS = 60_000;

// dirty 판정에 쓰는 필드. status 는 자동저장이 건드리지 않으므로 제외한다.
const TRACKED = ['title', 'excerpt', 'categoryId', 'seriesId', 'seriesOrder', 'content'];

type SaveState =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved'; at: string }
  | { kind: 'error' };

function snapshot(form: HTMLFormElement): string {
  const fd = new FormData(form);
  return JSON.stringify(TRACKED.map((k) => String(fd.get(k) ?? '')));
}

export function Autosave({
  formId,
  initialId,
  published,
}: {
  formId: string;
  initialId?: string;
  published: boolean;
}) {
  const [state, setState] = useState<SaveState>({ kind: 'idle' });
  const idRef = useRef(initialId ?? '');
  const lastSavedRef = useRef<string | null>(null);

  useEffect(() => {
    if (published) return; // 발행글은 자동저장하지 않음

    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;
    // 마운트 시점 상태를 기준선으로 삼아, 변경이 없으면 저장하지 않는다.
    lastSavedRef.current = snapshot(form);

    let running = false;
    const timer = setInterval(async () => {
      if (running) return;
      const snap = snapshot(form);
      if (snap === lastSavedRef.current) return; // 변경 없음

      running = true;
      setState({ kind: 'saving' });
      try {
        const fd = new FormData(form);
        if (idRef.current) fd.set('id', idRef.current);
        const result = await autosaveDraft(fd);

        if (result.ok) {
          lastSavedRef.current = snap;
          if (result.id && !idRef.current) {
            // 방금 새로 만들어진 draft: id 를 폼에 반영하고 URL 을 편집 페이지로 교체
            // → 새로고침해도 같은 draft 로 이어지고, 수동 Save 는 PATCH 로 전환된다.
            idRef.current = result.id;
            const idInput = form.elements.namedItem('id');
            if (idInput instanceof HTMLInputElement) idInput.value = result.id;
            window.history.replaceState(null, '', `/admin/posts/${result.id}/edit`);
          }
          setState({ kind: 'saved', at: new Date().toLocaleTimeString() });
        } else if (result.reason === 'incomplete') {
          // 아직 제목·본문·카테고리가 다 안 채워짐 — 조용히 대기(다음 tick 재시도)
          setState({ kind: 'idle' });
        } else {
          setState({ kind: 'error' });
        }
      } catch {
        setState({ kind: 'error' });
      } finally {
        running = false;
      }
    }, INTERVAL_MS);

    return () => clearInterval(timer);
  }, [formId, published]);

  if (published) return null; // §7.5: 자동저장이 없는 화면에선 인디케이터도 표시하지 않음

  const text =
    state.kind === 'saving'
      ? 'Saving…'
      : state.kind === 'saved'
        ? `Saved at ${state.at}`
        : state.kind === 'error'
          ? 'Save failed — will retry'
          : '';

  return (
    <span
      className={`self-center text-sm ${state.kind === 'error' ? 'text-red-600' : 'text-muted'}`}
      aria-live="polite"
    >
      {text}
    </span>
  );
}
