'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { CornerDownLeft, Search } from 'lucide-react';
import { filterCommandItems, getCommandItems, type CommandItem } from '@/components/layout/command-items';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/providers/auth-provider';
import { cn } from 'cn';

type CommandMenuContextValue = { open: () => void };

const CommandMenuContext = createContext<CommandMenuContextValue | null>(null);

export function useCommandMenu(): CommandMenuContextValue {
  const ctx = useContext(CommandMenuContext);
  if (!ctx) throw new Error('useCommandMenu doit être utilisé dans CommandMenuProvider');
  return ctx;
}

export function isMacPlatform(): boolean {
  return typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);
}

export function CommandMenuProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsOpen((previous) => !previous);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const value = useMemo(() => ({ open: () => setIsOpen(true) }), []);

  return (
    <CommandMenuContext.Provider value={value}>
      {children}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          showCloseButton={false}
          className="top-[15vh] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-lg"
        >
          <DialogTitle className="sr-only">Recherche rapide</DialogTitle>
          {isOpen ? <CommandPalette onClose={() => setIsOpen(false)} /> : null}
        </DialogContent>
      </Dialog>
    </CommandMenuContext.Provider>
  );
}

function CommandPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const items = user ? filterCommandItems(getCommandItems(user.role), query) : [];
  const groups = (['Navigation', 'Actions'] as const)
    .map((group) => ({ group, items: items.filter((item) => item.group === group) }))
    .filter((entry) => entry.items.length > 0);
  const ordered = groups.flatMap((entry) => entry.items);
  const safeIndex = Math.min(activeIndex, Math.max(ordered.length - 1, 0));

  function select(item: CommandItem) {
    onClose();
    router.push(item.href);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((safeIndex + 1) % Math.max(ordered.length, 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((safeIndex - 1 + ordered.length) % Math.max(ordered.length, 1));
    } else if (event.key === 'Enter' && ordered[safeIndex]) {
      event.preventDefault();
      select(ordered[safeIndex]);
    }
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2.5 border-b border-border px-4">
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <input
          autoFocus
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="Rechercher une page ou une action…"
          className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          role="combobox"
          aria-expanded
          aria-controls="command-menu-list"
          aria-activedescendant={ordered[safeIndex] ? `command-${ordered[safeIndex].id}` : undefined}
          aria-label="Rechercher une page ou une action"
        />
        <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          Échap
        </kbd>
      </div>

      <div id="command-menu-list" role="listbox" className="max-h-80 overflow-y-auto p-2">
        {ordered.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">Aucun résultat pour « {query} ».</p>
        ) : (
          groups.map((entry) => (
            <div key={entry.group} role="group" aria-label={entry.group} className="mb-1 last:mb-0">
              <p className="px-2 pt-2 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                {entry.group}
              </p>
              {entry.items.map((item) => {
                const index = ordered.indexOf(item);
                const active = index === safeIndex;
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    id={`command-${item.id}`}
                    role="option"
                    aria-selected={active}
                    onMouseMove={() => setActiveIndex(index)}
                    onClick={() => select(item)}
                    className={cn(
                      'flex h-10 cursor-pointer items-center gap-3 rounded-lg px-2.5 text-sm transition-colors',
                      active ? 'bg-secondary text-primary' : 'text-foreground',
                    )}
                  >
                    <Icon className={cn('size-4 shrink-0', active ? 'text-primary' : 'text-muted-foreground')} aria-hidden />
                    <span className="flex-1 truncate">{item.label}</span>
                    {active ? <CornerDownLeft className="size-3.5 text-primary/70" aria-hidden /> : null}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
