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
import { EmojiSearchView } from "@/components/EmojiSearchView";
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
import {
  buildEmojiCopyMessage,
  copyEmojiToClipboard,
} from "@/lib/copyEmoji";
import {
  RECENT_EMOJIS_STORAGE_KEY,
  addRecentEmoji,
  loadRecentEmojis,
  saveRecentEmojis,
  type RecentEmoji,
} from "@/lib/recentEmojis";
import { mergeRecentEmojiResults } from "@/lib/recentEmojiResults";
/**
 * App
 * Emoji semantic search UI using a worker
 * and an embedded vector database.
 */
export function App() {
  const [query, setQuery] = useState("");
  const [recentEmojis, setRecentEmojis] = useState<
    RecentEmoji[]
  >([]);
  const [recentEmojisReady, setRecentEmojisReady] =
    useState(false);
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

  useEffect(() => {
    const syncRecentEmojis = () => {
      setRecentEmojis(loadRecentEmojis());
      setRecentEmojisReady(true);
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === RECENT_EMOJIS_STORAGE_KEY) {
        syncRecentEmojis();
      }
    };

    syncRecentEmojis();
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);
  const [sheet, setSheet] = useState<{
    open: boolean;
    char: string;
    name: string;
  }>({ open: false, char: "", name: "" });
  const [toast, setToast] = useState<string | null>(null);

  const toastTimer = useRef<number | null>(null);
  
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
    backendError,
    searchError,
  } = useEmojiSearch({
    noCache,
    searchConfig,
  });

  /**
   * Copy the selected emoji and show a toast.
   */
  const onCopy = (options: { char: string; name: string }) => {
    const { char, name } = options;
    void copyEmojiToClipboard(char).then((copied) => {
      if (!copied) {
        return;
      }

      setRecentEmojis((current) => {
        const next = addRecentEmoji(current, {
          char,
          name,
        });

        return saveRecentEmojis(next);
      });
    });
    setToast(buildEmojiCopyMessage({
      char,
      name,
    }));
    if (toastTimer.current)
      window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(
      () => setToast(null),
      1200,
    );
  };

  const hasQuery = query.trim().length > 0;
  const searchResults = matched ?? [];
  const results =
    hasQuery && !isSearching
      ? mergeRecentEmojiResults(
          searchResults,
          recentEmojis,
        )
      : searchResults;
  const isCentered =
    recentEmojisReady &&
    !hasQuery &&
    results.length === 0 &&
    recentEmojis.length === 0;
  return (
    <>
      <EmojiSearchView
        query={query}
        results={results}
        recentEmojis={recentEmojis}
        isSearching={isSearching}
        backendError={backendError}
        searchError={searchError}
        isCentered={isCentered}
        onQueryChange={(next) => {
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
        onPick={onCopy}
        onMenu={(emoji) => setSheet({
          open: true,
          char: emoji.char,
          name: emoji.name,
        })}
      />

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
    </>
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
    searchError: null as string | null,
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
          searchError: core.errorMessage,
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
    searchError: state.searchError,
    classify,
  };
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
