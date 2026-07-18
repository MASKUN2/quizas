'use client';

// 포스트 삭제 확인 모달 (design/spec/ui-design.md §7.5 Confirm dialog).
// 트리거를 누르면 바로 삭제하지 않고 네이티브 <dialog> 를 띄워 확인을 받는다.
// 확인 시에만 기존 deletePost 서버 액션 폼을 제출한다. 취소·ESC·바깥클릭으로 닫힌다.
import { useRef } from 'react';
import { deletePost } from '@/app/admin/actions';

export function DeletePostButton({
  id,
  label = 'Delete',
  triggerClassName = 'text-red-600 hover:underline',
}: {
  id: string;
  label?: string;
  triggerClassName?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className={triggerClassName}
      >
        {label}
      </button>

      <dialog
        ref={dialogRef}
        // 바깥(backdrop)을 클릭하면 닫는다. dialog 자체가 클릭 대상일 때만.
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current.close();
        }}
        className="m-auto rounded-lg border border-border bg-background p-6 text-foreground shadow-lg backdrop:bg-black/50"
      >
        <form action={deletePost} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={id} />
          <div>
            <h2 className="text-base font-semibold">Delete this post?</h2>
            <p className="mt-1 text-sm text-muted">
              This permanently deletes the post and its comments. This can&apos;t
              be undone.
            </p>
          </div>
          <div className="flex justify-end gap-3 text-sm">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="rounded-md px-3 py-1.5 text-muted hover:bg-subtle hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-red-600 px-3 py-1.5 text-white hover:opacity-90"
            >
              Delete
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
