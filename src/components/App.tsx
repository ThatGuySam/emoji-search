import type { PGlite } from "@electric-sql/pglite";
import { useState, useEffect, useRef, useCallback } from "react";
import type { EmbeddingEntry } from "../utils/db";
import { countRows, search, loadDBFromEmbedBin } from "../utils/db";
import OptimusWorker from "../utils/worker.ts?worker";
import embeddingsBinUrl from
  '../artifacts/embeddings.bin.br?url'

export default function App() {
  // Keep track of the classification result and the model loading status.
  const [content, setContent] = useState<string[]>([]);
  const [result, setResult] = useState<string[] | null>(null);
  const [ready, setReady] = useState<boolean | null>(null);
  const initailizing = useRef(false);

  // Create a reference to the worker object.
  const worker = useRef<Worker | null>(null);

  // Set up DB
  const db = useRef<PGlite | null>(null);
  useEffect(() => {
    const setup = async () => {
      initailizing.current = true;
      console.log('Loading DB from', embeddingsBinUrl)
      db.current = await loadDBFromEmbedBin({
        binUrl: embeddingsBinUrl
      });
      let count = await countRows(db.current, "embeddings");
      console.log(`Found ${count} rows`);
      if (count === 0) {
        count = await countRows(db.current, "embeddings");
        console.log(`Seeded ${count} rows`);
      }
      // Get Items
      const items = await db.current.query<EmbeddingEntry>("SELECT content FROM embeddings");
      setContent(items.rows.map((x) => x.content));
    };
    if (!db.current && !initailizing.current) {
      setup();
    }
  }, []);

  // We use the `useEffect` hook to set up the worker as soon as the `App` component is mounted.
  useEffect(() => {
    // console.log('Worker useEffect', { optimusWorker })
    if (!worker.current) {
      // Create the worker if it does not yet exist.
      worker.current = new OptimusWorker()
    }

    // Create a callback function for messages from the worker thread.
    const onMessageReceived = async (e: MessageEvent) => {
        console.log('Message received', e.data)
        switch (e.data.status) {
            case "initiate":
                setReady(false);
                break;
            case "ready":
                setReady(true);
                break;
            case "complete":
                // Cosine similarity search in pgvector
                if (!db.current) {
                    throw new Error('Database not initialized')
                }
                const searchResults = await search(db.current, e.data.embedding);
                console.log({ searchResults });
                setResult(searchResults.map((x) => x.content));
                break;
      }
    };

    console.log('Worker created', worker.current)

    // Attach the callback function as an event listener.
    worker.current.addEventListener("message", onMessageReceived);

    // Define a cleanup function for when the component is unmounted.
    return () =>
      worker.current?.removeEventListener("message", onMessageReceived);
  }, []);

  const classify = useCallback((text: string) => {
    if (worker.current) {
      worker.current.postMessage({ text });
    }
  }, []);
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-12">
      <h1 className="text-5xl font-bold mb-2 text-center">Transformers.js</h1>
      <h2 className="text-2xl mb-4 text-center">
        100% in-browser Semantic Search with{" "}
        <a
          className="underline"
          href="https://huggingface.co/docs/transformers.js"
        >
          Transformers.js
        </a>
        {", "}
        <a className="underline" href="https://github.com/electric-sql/pglite">
          PGlite
        </a>{" "}
        {" + "}
        <a className="underline" href="https://github.com/pgvector/pgvector">
          pgvector!
        </a>
      </h2>
      <p className="text-center">Items in database:</p>
      <pre className="bg-gray-100 p-2 mb-4 rounded">
        {JSON.stringify(content)}
      </pre>
      <form>
        <input
          type="text"
          className="w-full max-w-xs p-2 border border-gray-300 rounded mb-4"
          placeholder="Enter text here"
          onInput={(e: React.FormEvent<HTMLInputElement>) => {
            setResult([]);
            const value = (e.target as HTMLInputElement).value
            classify(value);
            // setInput(e.target.value as string);
          }}
        />
        <button
          type="submit"
          className="bg-blue-500 text-white p-2 mb-4 rounded w-full max-w-xs"
        >
          Semantic Search
        </button>
      </form>

      {ready !== null && (
        <>
          <p className="text-center">Similarity Search results:</p>
          <pre className="bg-gray-100 p-2 rounded">
            {!ready || !result ? "Loading..." : JSON.stringify(result)}
          </pre>
        </>
      )}
    </main>
  );
}