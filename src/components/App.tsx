import {
  useState,
  useEffect,
  useRef,
} from "react";
import {
  search,
  loadPrebuiltDb,
} from "@/utils/db";
import OptimusWorker from "@/utils/worker.ts?worker";
import {
  R2_TAR_URL,
  SQLITE_DB_URL,
} from "@/constants";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { ResultGrid } from "@/components/ResultGrid";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/Sheet";
import {
  EmojiSearchCore,
  type EmojiSearchDeps,
} from "@/hooks/useEmojiSearch";
import {
  resolveSearchConfig,
  type SearchBackend,
  type SearchConfig,
} from "@/utils/searchConfig";
import {
  loadSqliteDb,
  searchSqlite,
  type SqliteSearchDb,
} from "@/utils/sqlite";
/**
 * App
 * Emoji semantic search UI using a worker
 * and an embedded vector database.
 */
export function App() {
  const [query, setQuery] = useState("");
  const [spacerHeight, setSpacerHeight] = useState(0);
  const searchConfig = resolveSearchConfig();

  // Log cross-origin isolation status on mount
  // for debugging SharedArrayBuffer availability
  useEffect(() => {
    console.log("[CrossOriginIsolation]", {
      crossOriginIsolated,
      hasSharedArrayBuffer:
        typeof SharedArrayBuffer !== "undefined",
      hasAtomics: typeof Atomics !== "undefined",
      origin: location.origin,
    });
  }, []);
  const [sheet, setSheet] = useState<{
    open: boolean;
    char: string;
    name: string;
  }>({ open: false, char: "", name: "" });
  const [toast, setToast] = useState<string | null>(null);

  const toastTimer = useRef<number | null>(null);
  const headerRef = useRef<HTMLHeadingElement | null>(null);
  
  const noCache = (() => {
    try {
      const usp = new URLSearchParams(location.search);
      return usp.has("no_cache");
    } catch {
      return false;
    }
  })();
  const {
    matched,
    isSearching,
    classify,
    backend,
    backendError,
  } = useEmojiSearch({
    noCache,
    searchConfig,
  });

  /**
   * Copy the selected emoji and show a toast.
   */
  const onCopy = (options: { char: string; name: string }) => {
    const { char, name } = options;
    navigator.clipboard.writeText(char).catch(() => {});
    if (navigator.vibrate) navigator.vibrate(10);
    setToast(`Copied ${name} ${char}`);
    if (toastTimer.current)
      window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(
      () => setToast(null),
      1200,
    );
  };

  const results = matched ?? [];
  const isCentered = query === "" && results.length === 0;

  // Allow desktop-only autofocus for a11y.
  const allowAutofocus = (() => {
    try {
      const ua = navigator.userAgent.toLowerCase();
      const isMobile = /iphone|ipad|android|mobile/
        .test(ua);
      const coarse = window.matchMedia?.(
        "(pointer: coarse)",
      ).matches;
      return !isMobile && !coarse;
    } catch {
      return false;
    }
  })();

  useEffect(() => {
    /**
     * Measure header and compute spacer so the
     * search field appears vertically centered
     * on first load. Collapses once typing.
     */
    const updateSpacer = () => {
      if (!headerRef.current) return;
      if (!isCentered) {
        setSpacerHeight(0);
        return;
      }
      const headerBox =
        headerRef.current.getBoundingClientRect();
      const viewport = window.innerHeight;
      const target = Math.max(
        0,
        viewport / 2 - headerBox.height / 2 - 12,
      );
      setSpacerHeight(Math.floor(target));
    };
    updateSpacer();
    window.addEventListener("resize", updateSpacer);
    return () =>
      window.removeEventListener("resize", updateSpacer);
  }, [isCentered]);

  return (
    <div className="min-h-dvh max-w-xl grid grid-rows-[auto_auto_minmax(0,1fr)] mx-auto p-4">
      <div
        aria-hidden
        className="transition-[height] duration-300"
        style={{ height: `${spacerHeight}px` }}
      />
      <header
        className="sticky top-0 z-10 border-b backdrop-blur
        bg-background/80 supports-[backdrop-filter]:bg-background/60
        px-3 pt-[max(8px,env(safe-area-inset-top))] pb-2"
        ref={headerRef}
      >
        <SearchHeader
          query={query}
          allowAutofocus={allowAutofocus}
          showSpinner={isSearching}
          onChange={(next) => {
            setQuery(next);
            classify(next);
          }}
          onClear={() => {
            setQuery("");
            classify("");
          }}
          onChip={(chip) => {
            setQuery(chip);
            classify(chip);
          }}
        />
      </header>

      <main className="min-h-0 overflow-y-auto p-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        <div className="text-sm font-medium text-muted-foreground mb-2">
          Results
          <span className="ml-2 text-xs font-normal uppercase tracking-wide">
            {backend}
          </span>
          {backendError ? (
            <span className="ml-2 text-xs font-normal text-amber-700">
              fallback
            </span>
          ) : null}
        </div>
        <ResultGrid
          results={results}
          onCopy={(x) => onCopy(x)}
          onMenu={(x) => setSheet({
            open: true,
            char: x.char,
            name: x.name,
          })}
        />
        {isSearching && (
          <div className="sr-only" aria-live="polite">
            Loading...
          </div>
        )}
      </main>

      <CopyToast toast={toast} />

      <EmojiSheet
        sheet={sheet}
        onCopy={() => onCopy({
          char: sheet.char,
          name: sheet.name,
        })}
        onClose={() => setSheet(s=>({...s, open:false}))}
        onOpenChange={(o) => setSheet(s => ({...s, open:o}))}
      />
    </div>
  );
}

/**
 * useEmojiSearch
 * React hook wrapper around EmojiSearchCore.
 * Returns search state and classify function.
 */
type SearchDbHandle =
  | {
      kind: 'pglite'
      db: Parameters<typeof search>[0]
    }
  | {
      kind: 'sqlite'
      db: SqliteSearchDb
    }

function useEmojiSearch(options: {
  noCache: boolean
  searchConfig: SearchConfig
}) {
  const { noCache, searchConfig } = options;
  const coreRef = useRef<EmojiSearchCore | null>(null);

  // State synced from core
  const [state, setState] = useState({
    matched: null as string[] | null,
    isSearching: false,
    backend: 'pglite' as SearchBackend,
    backendError: null as string | null,
  });

  useEffect(() => {
    let cancelled = false;

    const setBackendState = (
      backend: SearchBackend,
      backendError: string | null = null,
    ) => {
      if (cancelled) return;
      setState((prev) => ({
        ...prev,
        backend,
        backendError,
      }));
    };

    // Create dependencies for the core
    const deps: EmojiSearchDeps = {
      loadDb: async () => {
        if (searchConfig.backend === "sqlite") {
          try {
            const db = await loadSqliteDb({
              dbUrl: SQLITE_DB_URL,
              noCache,
            });
            setBackendState("sqlite");
            return {
              kind: "sqlite",
              db,
            } satisfies SearchDbHandle;
          } catch (error) {
            console.error(
              "[sqlite experiment] init failed",
              error,
            );

            if (searchConfig.strictBackend) {
              throw error;
            }

            setBackendState(
              "pglite",
              "sqlite init failed",
            );
          }
        }

        const db = await loadPrebuiltDb({
          binUrl: R2_TAR_URL,
          noCache,
        });
        setBackendState("pglite");
        return {
          kind: "pglite",
          db,
        } satisfies SearchDbHandle;
      },
      search: async (db, embedding) => {
        const handle = db as SearchDbHandle;

        if (handle.kind === "sqlite") {
          return searchSqlite(handle.db, embedding);
        }

        return search(handle.db, embedding);
      },
      createWorker: () => new OptimusWorker(),
    };

    // Create core instance
    const core = new EmojiSearchCore({
      deps,
      onStateChange: () => {
        // Sync core state to React state
        setState((prev) => ({
          ...prev,
          matched: core.matched,
          isSearching: core.isSearching,
        }));
      },
    });
    coreRef.current = core;

    // Initialize (loads DB + preloads model)
    core.initialize({ noCache });

    return () => {
      cancelled = true;
      core.destroy();
      coreRef.current = null;
    };
  }, [
    noCache,
    searchConfig.backend,
    searchConfig.strictBackend,
  ]);

  /**
   * Trigger a search query.
   */
  const classify = (text: string) => {
    coreRef.current?.classify(text, { noCache });
  };

  return {
    matched: state.matched,
    isSearching: state.isSearching,
    backend: state.backend,
    backendError: state.backendError,
    classify,
  };
}

/**
 * SearchHeader
 * Input + clear + spinner + chips.
 */
function SearchHeader(props: {
  query: string;
  allowAutofocus: boolean;
  showSpinner: boolean;
  onChange: (next: string) => void;
  onClear: () => void;
  onChip: (chip: string) => void;
}) {
  const {
    query,
    allowAutofocus,
    showSpinner,
    onChange,
    onClear,
    onChip,
  } = props;
  const chips = (!query ? [
    "shout",
    "attach",
    "copy",
    "celebrate",
    "secure",
    "search",
  ] : []).slice(0, 6);
  return (
    <>
      <label className="flex items-center gap-2 whitespace-nowrap">
        <Input
          placeholder="Search emojis by meaning… try shout, attach, celebrate"
          aria-label="Search emojis by meaning"
          autoFocus={allowAutofocus}
          value={query}
          onChange={(e) => onChange(e.target.value)}
        />
        <Button
          variant="outline"
          disabled={query.length === 0}
          onClick={onClear}
          aria-label="Clear search"
          title="Clear"
        >
          ✕
        </Button>
        {showSpinner && (
          <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <span
              aria-hidden="true"
              className="inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin"
            />
            <span>Searching…</span>
          </span>
        )}
      </label>
      <div className="mt-2 flex flex-wrap gap-2" aria-live="polite">
        {chips.map((chip) => (
          <Button
            key={chip}
            size="sm"
            variant="outline"
            className="rounded-full"
            onClick={() => onChip(chip)}
          >
            {chip}
          </Button>
        ))}
      </div>
    </>
  );
}

/**
 * CopyToast
 * Lightweight toast presenter.
 */
function CopyToast(props: { toast: string | null }) {
  const { toast } = props;
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`fixed left-1/2 -translate-x-1/2
        bottom-[calc(env(safe-area-inset-bottom)+16px)]
        rounded-2xl border bg-background px-4 py-3 shadow-xl
        transition ${toast ? "opacity-100" : "opacity-0 translate-y-2"}`}
    >
      {toast}
    </div>
  );
}

/**
 * EmojiSheet
 * Bottom sheet for a selected emoji.
 */
function EmojiSheet(props: {
  sheet: { open: boolean; char: string; name: string };
  onCopy: () => void;
  onClose: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  const { sheet, onCopy, onClose, onOpenChange } = props;
  return (
    <Sheet open={sheet.open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div
              role="img"
              aria-label={sheet.name}
              className="text-[44px]"
            >
              {sheet.char}
            </div>
            <div>
              <SheetTitle>{sheet.name}</SheetTitle>
              <SheetDescription>
                Related: —
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>
        <div className="mt-3 flex gap-2 flex-wrap">
          <Button onClick={onCopy}>
            Copy {sheet.char}
          </Button>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
