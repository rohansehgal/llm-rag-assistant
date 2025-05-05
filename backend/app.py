# Imports 
from concurrent.futures import ThreadPoolExecutor
import functools
from flask import Flask, request, render_template, redirect, url_for, flash, jsonify, send_from_directory
# ✅ NEW: Required for streaming responses from Flask
from flask import Response, stream_with_context

import ollama
import faiss
import numpy as np
import pickle
from sentence_transformers import SentenceTransformer
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import fitz  # PyMuPDF
import time
import json
import datetime
from werkzeug.utils import secure_filename
import base64
import time
from datetime import datetime


# app creation
app = Flask(
    __name__,
    template_folder="templates",
    static_folder="static"
)
app.secret_key = 'your_secret_key'

# configurations
executor = ThreadPoolExecutor(max_workers=3)  # You can adjust the number of workers as needed
INDEX_PATH = "vector_index.faiss"
CHUNKS_PATH = "chunks.pkl"
STATS_FILE = "stats.json"
UPLOAD_FOLDER_FILES = 'uploads/files'
UPLOAD_FOLDER_RAG = 'uploads/rag'
UPLOAD_FOLDER_IMAGES = 'uploads/images'
ALLOWED_EXTENSIONS = {'pdf', 'jpg', 'jpeg', 'png', 'gif', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'}
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB
CACHE_FILE = "query_cache.json"
# Configuration file path
CONFIG_FILE = "config.json"

def load_config():
    """Load settings from config.json"""
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, "r") as f:
            config = json.load(f)
            print("🔧 Loaded config from config.json:")
            print(json.dumps(config, indent=2))
            return config
    print("⚠️ config.json not found. Using empty config.")
    return {}


def save_config(cfg):
    """Persist settings to config.json"""
    with open(CONFIG_FILE, "w") as f:
        json.dump(cfg, f, indent=2)


# folder creation
os.makedirs(UPLOAD_FOLDER_FILES, exist_ok=True)
os.makedirs(UPLOAD_FOLDER_RAG, exist_ok=True)
os.makedirs(UPLOAD_FOLDER_IMAGES, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


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

    print(f"📝 Logged stat: model={record['model']} | time={record['response_time_ms']} ms | source={record.get('source')} | question='{record['question']}'")


vector_index, chunks = load_index()
embedder = SentenceTransformer("all-MiniLM-L6-v2")

def split_text(text, chunk_size=500, overlap=100):
    words = text.split()
    result = []
    for i in range(0, len(words), chunk_size - overlap):
        result.append(" ".join(words[i:i+chunk_size]))
    return result


def get_all_rag_documents():
    all_files = []

    # PDFs from /uploads/rag
    for filename in os.listdir(UPLOAD_FOLDER_RAG):
        path = os.path.join(UPLOAD_FOLDER_RAG, filename)
        if filename.lower().endswith('.pdf') and os.path.isfile(path):
            all_files.append(path)

    # PDFs and files from /uploads/files
    for filename in os.listdir(UPLOAD_FOLDER_FILES):
        path = os.path.join(UPLOAD_FOLDER_FILES, filename)
        if filename.lower().endswith('.pdf') and os.path.isfile(path):
            all_files.append(path)

    return all_files



@app.route('/upload', methods=['GET', 'POST'])
def upload():
    uploaded_files = []

 # Load all files from uploads/files (Manual Upload)
    for filename in os.listdir(UPLOAD_FOLDER_FILES):
        path = os.path.join(UPLOAD_FOLDER_FILES, filename)
        if os.path.isfile(path):
            uploaded_files.append({
                'name': filename,
                'source': 'Manual Upload',
                'type': filename.split('.')[-1].upper(),
                'size': f"{round(os.path.getsize(path) / 1024, 2)} KB",
                'upload_date': datetime.fromtimestamp(os.path.getmtime(path)).strftime('%Y-%m-%d'),
                'folder': 'files'
            })

    # Load all PDFs from uploads/rag (PDF Analysis)
    for filename in os.listdir(UPLOAD_FOLDER_RAG):
        path = os.path.join(UPLOAD_FOLDER_RAG, filename)
        if os.path.isfile(path):
            uploaded_files.append({
                'name': filename,
                'source': 'PDF Analysis',
                'type': filename.split('.')[-1].upper(),
                'size': f"{round(os.path.getsize(path) / 1024, 2)} KB",
                'upload_date': datetime.fromtimestamp(os.path.getmtime(path)).strftime('%Y-%m-%d'),
                'folder': 'rag'
            })

    # Load all images from uploads/images (Image Analysis)
    for filename in os.listdir(UPLOAD_FOLDER_IMAGES):
        path = os.path.join(UPLOAD_FOLDER_IMAGES, filename)
        if os.path.isfile(path):
            uploaded_files.append({
                'name': filename,
                'source': 'Image Analysis',
                'type': filename.split('.')[-1].upper(),
                'size': f"{round(os.path.getsize(path) / 1024, 2)} KB",
                'upload_date': datetime.fromtimestamp(os.path.getmtime(path)).strftime('%Y-%m-%d'),
                'folder': 'images'
            })


    if request.method == 'POST':
        if 'file' not in request.files:
            flash('No file part in request.', 'danger')
            return redirect(url_for('upload'))

        files = request.files.getlist('file')
        for file in files:
            if file and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                file.save(os.path.join(UPLOAD_FOLDER_FILES, filename))
            else:
                flash('Invalid file type or file too large.', 'danger')
                return redirect(url_for('upload'))

        flash('Files uploaded successfully!', 'success')
        return redirect(url_for('upload'))

    return render_template('upload.html', uploaded_files=uploaded_files, active_page='upload')



@app.route('/uploads/<folder>/<filename>')
def uploaded_file(folder, filename):
    if folder == 'files':
        upload_folder = UPLOAD_FOLDER_FILES
    elif folder == 'rag':
        upload_folder = UPLOAD_FOLDER_RAG
    elif folder == 'images':
        upload_folder = UPLOAD_FOLDER_IMAGES
    else:
        return "Invalid folder", 404

    return send_from_directory(upload_folder, filename)



@app.route("/settings", methods=["GET", "POST"])
def settings():
    config = load_config()

    # These are read-only and come from config.json
    available_text_models = config.get("available_text_models", [])
    available_image_models = config.get("available_image_models", [])

    if request.method == "POST":
        form = request.form

        # Update editable settings
        config["allowed_text_models"] = form.getlist("allowed_text_models")
        config["default_text_model"] = form.get("default_text_model")
        config["allowed_image_models"] = form.getlist("allowed_image_models")
        config["default_image_model"] = form.get("default_image_model")
        config["max_upload_size_mb"] = int(form.get("max_upload_size_mb", 25))
        config["enable_cache"] = "enable_cache" in form
        config["lock_prompt_during_execution"] = "lock_prompt_during_execution" in form

        save_config(config)
        flash("Settings updated successfully!", "success")
        return redirect(url_for("settings"))

    return render_template(
        "settings.html",
        config=config,
        all_text_models=available_text_models,
        all_image_models=available_image_models,
        allowed_file_exts=", ".join(ALLOWED_EXTENSIONS),
        image_exts=".jpg, .jpeg, .png",
        active_page="settings"
    )



@app.route("/", methods=["GET"])
def index():
    config = load_config()
    return render_template(
        "index.html",
        allowed_models=config.get("allowed_text_models", []),
        default_model=config.get("default_text_model"),
        allowed_image_models=config.get("allowed_image_models", []),
        default_image_model=config.get("default_image_model"),
        active_page="home"
    )


@app.route('/delete-file', methods=['POST'])
def delete_file():
    data = request.get_json()
    filename = data.get('filename')
    folder = data.get('folder')

    if folder == 'files':
        folder_path = UPLOAD_FOLDER_FILES
    elif folder == 'rag':
        folder_path = UPLOAD_FOLDER_RAG
    elif folder == 'images':
        folder_path = UPLOAD_FOLDER_IMAGES
    else:
        return jsonify({'error': 'Invalid folder'}), 400

    filepath = os.path.join(folder_path, filename)

    if not filename or not os.path.exists(filepath):
        return jsonify({'error': 'File not found'}), 404

    os.remove(filepath)
    return jsonify({'message': 'File deleted successfully'}), 200


@app.route("/ask", methods=["POST"])
def ask():
    """Handles model queries with caching and automatic streaming."""

    file = request.files.get('file')
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file.save(os.path.join(UPLOAD_FOLDER_RAG, filename))

    prompt = request.form.get('prompt', '').strip()
    model = request.form.get('models', '').strip()

    print("\n🟡 /ask called")
    print("🟡 Prompt:", prompt)
    print("🟡 Model:", model)

    key = f"{prompt}|{model}"
    cache = load_cache()

    # ✅ Return immediately if response is cached
    if key in cache and cache[key] != "IN_PROGRESS":
        print("⚡ Cache hit")
        return jsonify({
            "model": model,
            "answer": cache[key],
            "time_ms": 0
        })

    # ✅ If response is in progress, notify frontend (for polling)
    if cache.get(key) == "IN_PROGRESS":
        print("⏳ Already processing")
        return jsonify({
            "model": model,
            "answer": "Loading...",
            "time_ms": 0
        })

    # ✅ Otherwise, mark as in progress
    cache[key] = "IN_PROGRESS"
    save_cache(cache)

    # ✅ Build RAG context (if index is available)
    context = ""
    if vector_index and chunks:
        query_embedding = embedder.encode([prompt])
        scores, indices = vector_index.search(np.array(query_embedding), k=3)
        context = "\n".join([chunks[i] for i in indices[0]])

    messages = [
        {
            "role": "system",
            "content": f"The following context may be helpful for answering the question:\n\n{context}"
        },
        {
            "role": "user",
            "content": prompt
        }
    ]
    
    def stream_response():
        try:
            response = ollama.chat(
                model=model,
                messages=messages,
                stream=True
            )

            collected = ""
            for chunk in response:
                piece = chunk.get("message", {}).get("content", "")
                if not piece:
                    continue  # Skip empty chunks
            
                collected += piece

                # 🪵 Debug: Print to server logs so we can verify backend is streaming
                print(f"📤 Streaming chunk: {repr(piece)}")

                # ✅ Yield each chunk (plus optional flush trick)
                yield piece
                time.sleep(0.01)  # 💤 Optional: Tiny delay to flush buffer

            # Save full response after stream ends
            cache[key] = collected
            save_cache(cache)

            save_stat({
                "question": prompt,
                "model": model,
                "response_time_ms": 0,
                "timestamp": datetime.now().isoformat(),
                "source": "Text Analysis"
            })

        except Exception as e:
            print(f"❌ Streaming error: {e}")
            cache.pop(key, None)
            save_cache(cache)
            yield f"\n[Error: {str(e)}]"


    # ✅ Return streamed response
    return Response(stream_with_context(stream_response()), content_type="text/plain")


import base64

from flask import Response, stream_with_context

@app.route("/analyze-image", methods=["POST"])
def analyze_image():
    try:
        if 'image' not in request.files:
            return "❌ No image uploaded", 400

        image = request.files['image']
        prompt = request.form.get('image_prompt', 'Describe this image.')

        if image.filename == '':
            return "❌ Empty filename", 400

        if not allowed_file(image.filename):
            return "❌ Unsupported file type", 400

        filename = secure_filename(image.filename)
        image_path = os.path.join(UPLOAD_FOLDER_IMAGES, filename)
        image.save(image_path)

        with open(image_path, "rb") as img_file:
            encoded_image = base64.b64encode(img_file.read()).decode('utf-8')

        model = request.form.get("image_model", "bakllava")
        print("🟡 Streaming image analysis using model:", model)

        def stream_chunks():
            response = ollama.generate(
                model=model,
                prompt=prompt,
                images=[encoded_image],
                stream=True
            )

            collected = ""
            for chunk in response:
                piece = chunk.get("response", "")
                collected += piece
                yield piece

            save_stat({
                "question": prompt,
                "model": model,
                "response_time_ms": 0,
                "timestamp": datetime.now().isoformat(),
                "source": "Image Analysis"
            })

        return Response(stream_chunks(), mimetype='text/plain')

    except Exception as e:
        print(f"❌ Error in /analyze-image: {e}")
        return f"❌ Error: {e}", 500



@app.route("/stats")
def stats():
    stats_data = load_stats()
    return render_template("stats.html", stats=stats_data)

if __name__ == "__main__":
    app.run(debug=True, port=5050)
