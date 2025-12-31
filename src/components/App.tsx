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
import { R2_TAR_URL } from "@/constants";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
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
/**
 * App
 * Emoji semantic search UI using a worker
 * and an embedded vector database.
 */
export function App() {
  const [query, setQuery] = useState("");
  const [spacerHeight, setSpacerHeight] = useState(0);
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
  const { matched, isSearching, classify } =
    useEmojiSearch({ noCache });

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
          showSpinner={hasQueried && ready === false}
          onChange={(next) => {
            setQuery(next);
            setMatchedIds([]);
            setHasQueried(true);
            classify(next);
          }}
          onClear={() => {
            setQuery("");
            setMatchedIds([]);
          }}
          onChip={(chip) => {
            setQuery(chip);
            setMatchedIds([]);
            setHasQueried(true);
            classify(chip);
          }}
        />
      </header>

      <main className="min-h-0 overflow-y-auto p-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        <div className="text-sm font-medium text-muted-foreground mb-2">
          Results
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
        {hasQueried && ready !== null && (
          <div className="sr-only" aria-live="polite">
            {!ready || !matchedIds ? "Loading..." : "Done"}
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
 * Encapsulates worker + database init and
 * returns status, results, and classify.
 */
function useEmojiSearch(options: { noCache: boolean }) {
  const { noCache } = options;
  const initializing = useRef(false);
  const worker = useRef<Worker | null>(null);
  const database = useRef<PGlite | null>(null);

  // Promise that resolves when DB is ready.
  // Allows queries to wait instead of failing.
  const dbReadyPromise = useRef<Promise<PGlite> | null>(null);
  const dbReadyResolve = useRef<
    ((db: PGlite) => void) | null
  >(null);

  const [status, setStatus] = useState<boolean | null>(null);
  const [matched, setMatched] =
    useState<string[] | null>(null);

  // Initialize database once.
  useEffect(() => {
    const setup = async () => {
      initializing.current = true;
      const db = await loadPrebuiltDb({
        binUrl: R2_TAR_URL,
        noCache,
      });
      database.current = db;
      await countRows(db, "embeddings");
      // Resolve the ready promise so waiting
      // queries can proceed.
      if (dbReadyResolve.current) {
        dbReadyResolve.current(db);
      }
    };
    if (!database.current && !initializing.current) {
      // Create promise before starting setup so
      // early queries can await it.
      dbReadyPromise.current = new Promise((resolve) => {
        dbReadyResolve.current = resolve;
      });
      setup();
    }
  }, [noCache]);

  // Initialize worker and handle messages.
  useEffect(() => {
    if (!worker.current) {
      worker.current = new OptimusWorker();
      // Preload model immediately. Hidden until use.
      worker.current.postMessage({ type: "preload", noCache });
    }
    /**
     * Handle worker messages and update state.
     */
    const onMessageReceived = async (e: MessageEvent) => {
      switch (e.data.status) {
        case "initiate":
          setStatus(false);
          return;
        case "ready":
          setStatus(true);
          return;
        case "complete": {
          // Wait for DB if not ready yet. This
          // prevents race condition on iOS Safari
          // where model finishes before DB loads.
          let db = database.current;
          if (!db && dbReadyPromise.current) {
            db = await dbReadyPromise.current;
          }
          if (!db) {
            console.error("DB failed to initialize");
            return;
          }
          const results = await search(
            db,
            e.data.embedding,
          );
          setMatched(results.map(x => x.identifier));
          return;
        }
        default:
          // Unknown worker message; ignore to
          // avoid noisy console during dev.
          return;
      }
    };
    worker.current.addEventListener("message", onMessageReceived);
    return () =>
      worker.current?.removeEventListener("message", onMessageReceived);
  }, [noCache]);

  /**
   * Classify the given text using the worker.
   */
  const classify = useCallback((text: string) => {
    worker.current?.postMessage({ text, noCache });
  }, [noCache]);

  return { matched, status, classify } as const;
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
    "announce",
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
 * ResultGrid
 * Responsive grid of emoji results.
 */
function ResultGrid(props: {
  results: string[];
  onCopy: (x: { char: string; name: string }) => void;
  onMenu: (x: { char: string; name: string }) => void;
}) {
  const { results, onCopy, onMenu } = props;
  return (
    <div
      className="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))]
      gap-3"
      role="list"
    >
      {results.map((row) => {
        const [emojiChar, emojiName] = (() => {
          const parts = String(row).split(" ");
          const ec = parts[0] ?? "";
          const en = parts.slice(1).join(" ") || "emoji";
          return [ec, en] as const;
        })();
        return (
          <button
            key={row}
            role="listitem"
            aria-label={`Copy ${emojiName} emoji`}
            className="flex items-center justify-center gap-1
            min-h-11 min-w-11 p-2 rounded-2xl border bg-secondary
            shadow-sm hover:shadow transition active:scale-95"
            onClick={() => onCopy({
              char: emojiChar,
              name: emojiName,
            })}
            onContextMenu={(e) => {
              e.preventDefault();
              onMenu({ char: emojiChar, name: emojiName });
            }}
          >
            <span
              role="img"
              aria-label={emojiName}
              className="text-[clamp(22px,4.6vh,32px)] leading-none"
            >
              {emojiChar}
            </span>
          </button>
        );
      })}
    </div>
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
