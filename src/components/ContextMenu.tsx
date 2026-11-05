import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';

export interface ContextMenuItem {
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  onSelect: () => void;
}

interface Props {
  x: number;
  y: number;
  items: ContextMenuItem[];
  /** Extra content above the items (e.g. a date input). */
  children?: ReactNode;
  onClose: () => void;
}

/** Small right-click menu rendered at the cursor; closes on outside click, Esc, scroll or resize. */
export function ContextMenu({ x, y, items, children, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && onClose();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const onScroll = (e: Event) => !ref.current?.contains(e.target as Node) && onClose();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onClose);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onClose);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={ref}
      onContextMenu={e => e.preventDefault()}
      onClick={e => e.stopPropagation()}
      className="fixed z-[80] min-w-52 bg-white border border-gray-200 rounded-lg shadow-xl py-1"
      style={{ left: Math.min(x, window.innerWidth - 230), top: Math.min(y, window.innerHeight - 140) }}
    >
      {children}
      {items.map(item => (
        <button
          key={item.label}
          type="button"
          onClick={() => {
            onClose();
            item.onSelect();
          }}
          className={clsx(
            'w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left',
            item.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'
          )}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>,
    document.body
  );
}
