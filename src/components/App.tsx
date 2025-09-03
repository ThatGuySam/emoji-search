import type { PGlite } from "@electric-sql/pglite";
import { useState, useEffect, useRef, useCallback } from "react";
import { countRows, search, loadPrebuiltDb } from "../utils/db";
import OptimusWorker from "../utils/worker.ts?worker";
import { R2_TAR_URL } from "../constants";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/Sheet";
import type { EmbeddingRow } from "@/utils/types";

export default function App() {
  const [content, setContent] = useState<string[]>([]);
  const [result, setResult] = useState<string[] | null>(null);
  const [ready, setReady] = useState<boolean | null>(null);
  const [query, setQuery] = useState("");
  // Track if the user has started a query so we can hide
  // initial model loading until it's actually needed.
  const [hasQueried, setHasQueried] = useState(false);
  const [spacerHeight, setSpacerHeight] = useState(0);
  const [sheet, setSheet] = useState<{
    open: boolean;
    char: string;
    name: string;
  }>({ open: false, char: "", name: "" });
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);
  const initializing = useRef(false);

  const worker = useRef<Worker | null>(null);

  const db = useRef<PGlite | null>(null);
  const headerRef = useRef<HTMLHeadingElement | null>(null);
  const noCache = (() => {
    try {
      const usp = new URLSearchParams(location.search);
      return usp.has("no_cache");
    } catch {
      return false;
    }
  })();
  useEffect(() => {
    const setup = async () => {
      initializing.current = true;
      db.current = await loadPrebuiltDb({
        binUrl: R2_TAR_URL,
        noCache,
      });
      let count = await countRows(db.current, "embeddings");
      if (count === 0) {
        count = await countRows(db.current, "embeddings");
      }
      const items = await db.current
        .query<EmbeddingRow>("SELECT content FROM embeddings");
      setContent(items.rows.map((x) => x.content));
    };
    if (!db.current && !initializing.current) setup();
  }, []);

  useEffect(() => {
    if (!worker.current) {
      worker.current = new OptimusWorker();
      // Kick off model download immediately on load.
      // We keep it invisible until the user types.
      worker.current.postMessage({ type: "preload", noCache });
    }
    const onMessageReceived = async (e: MessageEvent) => {
      switch (e.data.status) {
        case "initiate":
          setReady(false);
          break;
        case "ready":
          setReady(true);
          break;
        case "complete":
          if (!db.current) throw new Error("Database not initialized");
          const searchResults = await search(
            db.current,
            e.data.embedding,
          );
          setResult(searchResults.map((x) => x.identifier));
          break;
      }
    };
    worker.current.addEventListener("message", onMessageReceived);
    return () =>
      worker.current?.removeEventListener("message", onMessageReceived);
  }, []);

  const classify = useCallback((text: string) => {
    setHasQueried(true);
    if (worker.current) worker.current.postMessage({ text, noCache });
  }, []);

  const onCopy = (char: string, name: string) => {
    navigator.clipboard.writeText(char).catch(() => {});
    if (navigator.vibrate) navigator.vibrate(10);
    setToast(`Copied ${name} ${char}`);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 1200);
  };

  const results = result ?? [];
  const isCentered = query === "" && results.length === 0;

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
        <label className="flex items-center gap-2 whitespace-nowrap">
          <Input
            placeholder="Search emojis by meaning… try shout, attach, celebrate"
            aria-label="Search emojis by meaning"
            value={query}
            onChange={(e) => {
              const v = e.target.value;
              setQuery(v);
              setResult([]);
              classify(v);
            }}
          />
          <Button
            variant="outline"
            onClick={() => {
              setQuery("");
              setResult([]);
            }}
            aria-label="Clear search"
            title="Clear"
          >
            ✕
          </Button>
          {hasQueried && ready === false && (
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
          {(!query ? [
            "announce",
            "attach",
            "copy",
            "celebrate",
            "secure",
            "search",
          ] : [])
            .slice(0, 6)
            .map((chip) => (
              <Button
                key={chip}
                size="sm"
                variant="outline"
                className="rounded-full"
                onClick={() => {
                  setQuery(chip);
                  setResult([]);
                  classify(chip);
                }}
              >
                {chip}
              </Button>
            ))}
        </div>
      </header>

      <main className="min-h-0 overflow-y-auto p-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        <div className="text-sm font-medium text-muted-foreground mb-2">
          Results
        </div>
        <div
          className="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))]
          gap-3"
          role="list"
        >
          {results.map((row) => {
            const [char, name] = (() => {
              const parts = String(row).split(" ");
              const ch = parts[0] ?? "";
              const nm = parts.slice(1).join(" ") || "emoji";
              return [ch, nm] as const;
            })();
            return (
              <button
                key={row}
                role="listitem"
                aria-label={`Copy ${name} emoji`}
                className="flex items-center justify-center gap-1
                min-h-11 min-w-11 p-2 rounded-2xl border bg-secondary
                shadow-sm hover:shadow transition active:scale-95"
                onClick={() => onCopy(char, name)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setSheet({ open: true, char, name });
                }}
              >
                <span
                  role="img"
                  aria-label={name}
                  className="text-[clamp(22px,4.6vh,32px)] leading-none"
                >
                  {char}
                </span>
              </button>
            );
          })}
        </div>
        {hasQueried && ready !== null && (
          <div className="sr-only" aria-live="polite">
            {!ready || !result ? "Loading..." : "Done"}
          </div>
        )}
      </main>

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

      <Sheet open={sheet.open} onOpenChange={(o) => setSheet(s => ({...s, open:o}))}>
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
            <Button onClick={() => onCopy(sheet.char, sheet.name)}>
              Copy {sheet.char}
            </Button>
            <Button variant="outline" onClick={() => setSheet(s=>({...s, open:false}))}>
              Close
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
