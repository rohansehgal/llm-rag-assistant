from flask import Flask, request, render_template, redirect, jsonify
import ollama
import faiss
import numpy as np
import pickle
from sentence_transformers import SentenceTransformer
import os
import fitz  # PyMuPDF
import time
import json
import datetime

app = Flask(__name__)
UPLOAD_FOLDER = "uploaded_docs"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

INDEX_PATH = "vector_index.faiss"
CHUNKS_PATH = "chunks.pkl"
STATS_FILE = "stats.json"

CACHE_FILE = "query_cache.json"

def load_cache():
    if not os.path.exists(CACHE_FILE):
        return {}

    try:
        with open(CACHE_FILE, "r") as f:
            return json.load(f)
    except (json.JSONDecodeError, ValueError) as e:
        print(f"⚠️ Failed to load cache — corrupted or empty file. Returning empty. Error: {e}")
        return {}

def save_cache(cache):
    with open(CACHE_FILE, "w") as f:
        json.dump(cache, f, indent=2)


def load_index():
    if os.path.exists(INDEX_PATH) and os.path.exists(CHUNKS_PATH):
        index = faiss.read_index(INDEX_PATH)
        with open(CHUNKS_PATH, "rb") as f:
            chunks = pickle.load(f)
        return index, chunks
    else:
        return None, []

def load_stats():
    if os.path.exists(STATS_FILE):
        with open(STATS_FILE, "r") as f:
            return json.load(f)
    return []

def save_stat(record):
    stats = load_stats()

    # Prevent duplicates: only log if this prompt+model combo hasn't been logged
    for row in stats:
        if row["question"] == record["question"] and row["model"] == record["model"]:
            print(f"⚠️ Stat already exists for model={record['model']} | question='{record['question']}'")
            return  # Skip duplicate

    stats.append(record)
    with open(STATS_FILE, "w") as f:
        json.dump(stats, f, indent=2)

    print(f"📝 Logged stat: model={record['model']} | time={record['response_time_ms']} ms | question='{record['question']}'")


vector_index, chunks = load_index()
embedder = SentenceTransformer("all-MiniLM-L6-v2")

def split_text(text, chunk_size=500, overlap=100):
    words = text.split()
    result = []
    for i in range(0, len(words), chunk_size - overlap):
        result.append(" ".join(words[i:i+chunk_size]))
    return result

@app.route("/upload", methods=["POST"])
def upload():
    global vector_index, chunks
    uploaded_file = request.files["file"]
    if uploaded_file.filename.endswith(".pdf"):
        filepath = os.path.join(UPLOAD_FOLDER, uploaded_file.filename)
        uploaded_file.save(filepath)

        doc = fitz.open(filepath)
        full_text = "\n".join([page.get_text() for page in doc])
        new_chunks = split_text(full_text)
        new_embeddings = embedder.encode(new_chunks)

        if vector_index is None:
            vector_index = faiss.IndexFlatL2(new_embeddings[0].shape[0])

        vector_index.add(np.array(new_embeddings))
        chunks.extend(new_chunks)

        faiss.write_index(vector_index, INDEX_PATH)
        with open(CHUNKS_PATH, "wb") as f:
            pickle.dump(chunks, f)

    return redirect("/")

@app.route("/", methods=["GET"])
def index():
    return render_template("index.html")


@app.route("/ask", methods=["POST"])
def ask():
    import time
    from datetime import datetime

    data = request.get_json()
    prompt = data.get("prompt", "").strip()
    model = data.get("model", "").strip()

    print("\n🟡 /ask called")
    print("🟡 Prompt:", prompt)
    print("🟡 Model:", model)

    key = f"{prompt}|{model}"
    cache = load_cache()

    # Handle cache hit or in-progress
    if key in cache:
        cached = cache[key]
        if cached == "IN_PROGRESS":
            print(f"⏳ Already in progress for: {key}")
            return jsonify({
                "model": model,
                "answer": "Loading...",
                "time_ms": 0
            })
        else:
            print(f"⚡ Cache hit for: {key}")
            return jsonify({
                "model": model,
                "answer": cached,
                "time_ms": 0
            })

    # Mark this query as in-progress
    print(f"⚙️ Caching in-progress for: {key}")
    cache[key] = "IN_PROGRESS"
    save_cache(cache)

    # Build optional RAG context
    context = ""
    if vector_index and chunks:
        query_embedding = embedder.encode([prompt])
        scores, indices = vector_index.search(np.array(query_embedding), k=3)
        context = "\n".join([chunks[i] for i in indices[0]])

    full_prompt = f"Context:\n{context}\n\nQuestion: {prompt}\n\nAnswer:"

    try:
        start_time = time.time()
        result = dict(ollama.generate(model=model, prompt=full_prompt))
        response_text = result.get("response", "[No response returned]")
        time_ms = int((time.time() - start_time) * 1000)

        # Cache the final result
        cache[key] = response_text
        save_cache(cache)
        print(f"✅ Cached response in {time_ms} ms for: {key}")

        # Save stats
        save_stat({
            "question": prompt,
            "model": model,
            "response_time_ms": time_ms,
            "timestamp": datetime.now().isoformat()
        })

        return jsonify({
            "model": model,
            "answer": response_text,
            "time_ms": time_ms
        })

    except Exception as e:
        print(f"❌ Error while generating model response: {e}")
        cache.pop(key, None)  # Clear in-progress on error
        save_cache(cache)

        return jsonify({
            "model": model,
            "answer": f"Error: {str(e)}",
            "time_ms": 0
        }), 500




@app.route("/stats")
def stats():
    stats_data = load_stats()
    return render_template("stats.html", stats=stats_data)

if __name__ == "__main__":
    app.run(debug=True, port=5050)
