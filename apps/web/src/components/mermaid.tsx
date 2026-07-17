'use client';

// ```mermaid 코드블록을 다이어그램으로 렌더. mermaid.js는 브라우저에서만 동작하므로
// 클라이언트 전용 + 동적 import(다이어그램 없는 글엔 번들 로드 안 함).
import { useEffect, useId, useState } from 'react';

export function Mermaid({ chart }: { chart: string }) {
  const [svg, setSvg] = useState('');
  const [failed, setFailed] = useState(false);
  const reactId = useId();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        mermaid.initialize({
          startOnLoad: false,
          theme: dark ? 'dark' : 'default',
          securityLevel: 'strict', // 작성자 콘텐츠지만 라벨은 sanitize
        });
        // render id 는 CSS 선택자로 쓰이므로 영숫자만 남김
        const id = `mermaid-${reactId.replace(/[^a-zA-Z0-9]/g, '')}`;
        const { svg } = await mermaid.render(id, chart);
        if (!cancelled) setSvg(svg);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chart, reactId]);

  // 렌더 실패 시 원문 코드로 폴백
  if (failed) return <code>{chart}</code>;
  // 렌더 전(SSR/하이드레이션 직후)에는 원문을 잠깐 노출 (레이아웃 확보)
  if (!svg) return <code>{chart}</code>;
  return <span className="mermaid" dangerouslySetInnerHTML={{ __html: svg }} />;
}
