#!/usr/bin/env python3

import argparse
import json
import os
import sys
from typing import Any


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Score semantic similarity pairs with EmbeddingGemma. "
            "Reads JSON from stdin in the form "
            '{"pairs":[{"id":"...","field":"query","source":"...","candidate":"..."}]}.'
        )
    )
    parser.add_argument(
        "--model",
        default="google/embeddinggemma-300m",
        help="Sentence Transformers model name to load.",
    )
    return parser.parse_args()


def load_payload() -> dict[str, Any]:
    raw = sys.stdin.read().strip()
    if not raw:
        raise ValueError("Expected JSON payload on stdin.")
    return json.loads(raw)


def fail(message: str, code: int = 1) -> None:
    sys.stderr.write(message + "\n")
    raise SystemExit(code)


def main() -> None:
    args = parse_args()
    payload = load_payload()
    pairs = payload.get("pairs", [])

    if not isinstance(pairs, list) or len(pairs) == 0:
        fail("Expected a non-empty 'pairs' array in stdin JSON.")

    try:
        from sentence_transformers import SentenceTransformer
    except ImportError as exc:
        fail(
            "Missing Python dependency 'sentence-transformers'. "
            "Install it with `python3 -m pip install sentence-transformers` "
            "before using EmbeddingGemma QA.\n"
            f"Original error: {exc}",
            code=2,
        )

    if not os.environ.get("HF_TOKEN"):
        fail(
            "HF_TOKEN is not set. Accept the Hugging Face license for "
            f"{args.model} and export HF_TOKEN before using EmbeddingGemma QA.",
            code=3,
        )

    try:
        model = SentenceTransformer(args.model)
    except Exception as exc:  # pragma: no cover - best effort helper
        fail(
            "Failed to load EmbeddingGemma. Make sure you accepted the model "
            "license on Hugging Face and that HF_TOKEN has access.\n"
            f"Original error: {exc}",
            code=4,
        )

    texts: list[str] = []
    for pair in pairs:
        texts.append(pair["source"])
        texts.append(pair["candidate"])

    try:
        embeddings = model.encode(
            texts,
            normalize_embeddings=True,
            show_progress_bar=False,
        )
    except Exception as exc:  # pragma: no cover - best effort helper
        fail(f"EmbeddingGemma encode failed: {exc}", code=5)

    scores = []
    for index, pair in enumerate(pairs):
        source_embedding = embeddings[index * 2]
        candidate_embedding = embeddings[index * 2 + 1]
        similarity = float(source_embedding.dot(candidate_embedding))
        scores.append(
            {
                "id": pair["id"],
                "field": pair["field"],
                "similarity": similarity,
            }
        )

    sys.stdout.write(
        json.dumps(
            {
                "model": args.model,
                "scores": scores,
            }
        )
    )


if __name__ == "__main__":
    main()
