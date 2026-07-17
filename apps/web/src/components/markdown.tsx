// 마크다운 렌더러 (공개 글 본문 + 에디터 미리보기 공용). 동일 렌더러라 미리보기 == 실제.
//   - remark-gfm: 표·체크박스 등 GFM
//   - rehype-highlight: ```java 등 코드블록 syntax 하이라이팅(hljs 클래스, 색상은 globals.css)
//   - code 오버라이드: ```mermaid 는 다이어그램(클라이언트)로 렌더
import type { ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Mermaid } from './mermaid';

function toText(node: ReactNode): string {
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(toText).join('');
  return '';
}

const components: Components = {
  // className/children 만 사용(hast node 등은 DOM으로 새어나가지 않게 전달 안 함)
  code({ className, children }) {
    const lang = /language-(\w+)/.exec(className ?? '')?.[1];
    if (lang === 'mermaid') {
      return <Mermaid chart={toText(children).trim()} />;
    }
    return <code className={className}>{children}</code>;
  },
};

export function Markdown({ children }: { children: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { ignoreMissing: true }]]}
        components={components}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
