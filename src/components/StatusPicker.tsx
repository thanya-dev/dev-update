import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import type { StatusOption } from '../api';

interface StatusPickerProps {
  value: string;
  options: StatusOption[];
  className: string;
  onChange?: (status: string) => void;
}

/** Status badge that opens a dropdown to change the status. Read-only badge when no onChange. */
export function StatusPicker({ value, options, className, onChange }: StatusPickerProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // The menu is portaled with fixed positioning so the sticky rows below can't cover it.
  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const menuHeight = menuRef.current?.offsetHeight ?? 0;
    const flipUp = r.bottom + 4 + menuHeight > window.innerHeight;
    setPos({ left: r.left, top: flipUp ? r.top - 4 - menuHeight : r.bottom + 4 });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !btnRef.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onScroll = (e: Event) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  if (!onChange) {
    return <span className={clsx('px-2 py-0.5 rounded-full border font-medium', className)}>{value}</span>;
  }

  // Keep the current value selectable even if it was removed from the master list.
  const list = options.some(o => o.status === value) || !value ? options : [{ status: value, description: '' }, ...options];

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        title="Change status"
        onClick={e => {
          e.stopPropagation();
          setOpen(o => !o);
        }}
        className={clsx(
          'flex items-center gap-0.5 pl-2 pr-1 py-0.5 rounded-full border font-medium hover:brightness-95 transition',
          className
        )}
      >
        {value || 'No status'}
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            onClick={e => e.stopPropagation()}
            className="fixed z-[70] w-72 max-h-80 overflow-auto bg-white border border-gray-200 rounded-lg shadow-xl py-1"
            style={pos}
          >
            {list.map(opt => {
              const selected = opt.status === value;
              return (
                <button
                  key={opt.status}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    if (!selected) onChange(opt.status);
                  }}
                  className={clsx('w-full flex items-start gap-2 px-3 py-1.5 text-left hover:bg-gray-50', selected && 'bg-blue-50/60')}
                >
                  <Check className={clsx('w-4 h-4 mt-0.5 flex-none text-blue-600', !selected && 'invisible')} />
                  <span className="min-w-0">
                    <span className="block text-sm text-gray-900">{opt.status}</span>
                    {opt.description && <span className="block text-xs text-gray-500">{opt.description}</span>}
                  </span>
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}
