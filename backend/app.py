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
from docx import Document
import json
import subprocess

import markdown
import re




# app creation
app = Flask(
    __name__,
    template_folder="templates",
    static_folder="static",
    static_url_path="/static"
)
app.secret_key = 'your_secret_key'

# configurations
executor = ThreadPoolExecutor(max_workers=3)  # You can adjust the number of workers as needed
APP_DIR = os.path.dirname(os.path.abspath(__file__))
INDEX_PATH = os.path.join(APP_DIR, "vector_index.faiss")
CHUNKS_PATH = os.path.join(APP_DIR, "chunks.pkl")
STATS_FILE = "stats.json"
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
UPLOAD_FOLDER_FILES = os.path.join(BASE_DIR, "uploads", "files")
UPLOAD_FOLDER_RAG = os.path.join(BASE_DIR, "uploads", "rag")
UPLOAD_FOLDER_IMAGES = os.path.join(BASE_DIR, "uploads", "images")
ALLOWED_EXTENSIONS = {'pdf', 'jpg', 'jpeg', 'png', 'gif', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'}
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB
CACHE_FILE = "query_cache.json"
# Configuration file path
CONFIG_FILE = os.path.join(os.path.dirname(__file__), "..", "config.json")

# Project root path
PROJECTS_DIR = os.path.join(BASE_DIR, "projects")
os.makedirs(PROJECTS_DIR, exist_ok=True)

def slugify(name):
    """Convert a project name to a safe folder name"""
    return re.sub(r'[^a-zA-Z0-9\-]', '-', name.strip().lower()).replace(' ', '-')


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
    print(f"📂 Checking for {INDEX_PATH} and {CHUNKS_PATH}...")
    if os.path.exists(INDEX_PATH) and os.path.exists(CHUNKS_PATH):
        try:
            index = faiss.read_index(INDEX_PATH)
            with open(CHUNKS_PATH, "rb") as f:
                chunks = pickle.load(f)
            print(f"✅ Loaded FAISS index with {index.ntotal} vectors and {len(chunks)} chunks.")
            return index, chunks
        except Exception as e:
            print(f"❌ Error loading FAISS index or chunks: {e}")
    else:
        print("❌ One or both files do not exist.")
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

if vector_index is None:
    print("⚠️ vector_index is NOT loaded.")
else:
    print(f"✅ vector_index loaded successfully. Index type: {type(vector_index)}")

if not chunks:
    print("⚠️ chunks are empty or not loaded.")
else:
    print(f"✅ chunks loaded successfully. Total chunks: {len(chunks)}")

embedder = SentenceTransformer("all-MiniLM-L6-v2")

def split_text(text, chunk_size=500, overlap=100):
    words = text.split()
    result = []
    for i in range(0, len(words), chunk_size - overlap):
        result.append(" ".join(words[i:i+chunk_size]))
    return result


def extract_text_from_file(path):
    """Extracts text from PDF, DOCX, or TXT files."""
    ext = path.lower().split('.')[-1]
    text = ""

    try:
        if ext == "pdf":
            with fitz.open(path) as doc:
                for page in doc:
                    text += page.get_text()
        elif ext == "docx":
            doc = Document(path)
            text = "\n".join([para.text for para in doc.paragraphs])
        elif ext == "txt":
            with open(path, "r", encoding="utf-8") as f:
                text = f.read()
    except Exception as e:
        print(f"❌ Error reading {path}: {e}")
    
    return text


def get_all_rag_documents():
    """Return list of full paths to all compatible RAG files from both uploads/rag and uploads/files."""
    all_files = []

    # Define compatible extensions for RAG indexing
    rag_extensions = {'.pdf', '.docx', '.txt', '.pptx', '.xls', '.xlsx'}

    # Helper to check valid extension
    def is_rag_file(filename):
        return any(filename.lower().endswith(ext) for ext in rag_extensions)

    # Scan /uploads/rag
    for filename in os.listdir(UPLOAD_FOLDER_RAG):
        path = os.path.join(UPLOAD_FOLDER_RAG, filename)
        if os.path.isfile(path) and is_rag_file(filename):
            all_files.append(path)

    # Scan /uploads/files
    for filename in os.listdir(UPLOAD_FOLDER_FILES):
        path = os.path.join(UPLOAD_FOLDER_FILES, filename)
        if os.path.isfile(path) and is_rag_file(filename):
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


@app.route("/projects", methods=["POST"])
def create_project():
    data = request.get_json()
    name = data.get("name", "").strip()

    if not name:
        return jsonify({"success": False, "error": "Project name is required"}), 400

    slug = slugify(name)
    project_path = os.path.join(PROJECTS_DIR, slug)

    if os.path.exists(project_path):
        return jsonify({"success": False, "error": "A project with this name already exists"}), 409

    # Create subfolders
    os.makedirs(os.path.join(project_path, "files"), exist_ok=True)
    os.makedirs(os.path.join(project_path, "outputs"), exist_ok=True)

    # Load global model config (if available)
    config = load_config()
    default_text_model = config.get("default_text_model", "llama3")
    default_image_model = config.get("default_image_model", "bakllava")

    metadata = {
        "name": name,
        "slug": slug,
        "created_at": datetime.now().isoformat(),
        "text_model": default_text_model,
        "image_model": default_image_model
    }

    with open(os.path.join(project_path, "metadata.json"), "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"✅ Project created: {name} → {slug}")
    return jsonify({"success": True, "slug": slug})

@app.route("/projects", methods=["GET"])
def list_projects():
    """Return all available projects (for the sidebar)"""
    results = []

    for slug in os.listdir(PROJECTS_DIR):
        project_path = os.path.join(PROJECTS_DIR, slug)
        meta_path = os.path.join(project_path, "metadata.json")

        if os.path.isdir(project_path) and os.path.exists(meta_path):
            with open(meta_path) as f:
                meta = json.load(f)
                results.append({
                    "name": meta.get("name", slug),
                    "slug": slug
                })

    return jsonify(results)

@app.route("/project/<slug>")
def project_dashboard(slug):
    """Render the project dashboard UI"""
    project_path = os.path.join(PROJECTS_DIR, slug)
    meta_path = os.path.join(project_path, "metadata.json")

    if not os.path.exists(meta_path):
        return "Project not found", 404

    with open(meta_path) as f:
        metadata = json.load(f)

    return render_template("project.html", project_name=metadata["name"], project_slug=slug)



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
    
    uploaded_text = ""
    dynamic_chunks = []
    dynamic_context = ""

    prompt = request.form.get('prompt', '').strip()
    model = request.form.get('models', '').strip()

    # 🐛 Debug logs for input validation
    print(f"🟢 Model received: {repr(model)}")
    print(f"🟢 Prompt received: {repr(prompt)}")


    # 🚫 Validate prompt and model input
    if not model:
        print("❌ No model selected.")
        return jsonify({
            "model": "",
            "answer": "[Error: No model selected.]",
            "time_ms": 0
        })

    if not prompt:
        print("❌ Prompt is empty.")
        return jsonify({
            "model": model,
            "answer": "[Error: Prompt cannot be empty.]",
            "time_ms": 0
        })


    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        uploaded_path = os.path.join(UPLOAD_FOLDER_RAG, filename)
        file.save(uploaded_path)

    # 🧠 Extract + split uploaded file content
    uploaded_path = None
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        uploaded_path = os.path.join(UPLOAD_FOLDER_RAG, filename)
        file.save(uploaded_path)

    # 🧠 Extract + split uploaded file content only if uploaded_path exists
    if uploaded_path:
        uploaded_text = extract_text_from_file(uploaded_path)    
        if uploaded_text:
            from langchain.text_splitter import RecursiveCharacterTextSplitter
            splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=100)
            dynamic_chunks = splitter.split_text(uploaded_text)
            print(f"🟡 Extracted {len(dynamic_chunks)} chunks from uploaded file.")

    # 🧠 Embed and select top 10 chunks
    if dynamic_chunks:
        try:
            query_embedding = embedder.encode([prompt])
            chunk_embeddings = embedder.encode(dynamic_chunks)
            distances = np.linalg.norm(chunk_embeddings - query_embedding, axis=1)
            top_indices = distances.argsort()[:10]
            dynamic_context = "\n".join([dynamic_chunks[i] for i in top_indices])
            print(f"📌 Selected top {len(top_indices)} relevant chunks for dynamic RAG context.")
            print(f"🆕 Dynamic context: {dynamic_context[:500]}")

        except Exception as e:
            print(f"❌ Error embedding uploaded file: {e}")



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
        try:
            query_embedding = embedder.encode([prompt])
            scores, indices = vector_index.search(np.array(query_embedding), k=3)
            prebuilt_context = "\n".join([chunks[i] for i in indices[0]])
            print(f"🧩 Prebuilt context: {prebuilt_context[:500]}")
            context = dynamic_context + "\n" + prebuilt_context if dynamic_context else prebuilt_context
        except Exception as e:
            print(f"❌ Error retrieving from vector index: {e}")
            context = dynamic_context  # Fallback
    else:
        print("⚠️ vector_index or chunks missing; using only dynamic context.")
        context = dynamic_context


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
    # More precise logging
    if not context.strip():
        print("🧠 Final context sent to model is EMPTY.")
    else:
        print(f"🧠 Final context sent to model (len={len(context)}):")
        print(context[:1000] + ("..." if len(context) > 1000 else ""))




    
    def stream_response():
        try:
            print("📨 Final messages to model:")
            for m in messages:
                print(f"- {m['role']}: {m['content'][:500]}" + ("..." if len(m['content']) > 500 else ""))

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
            # Convert to HTML after full stream
            html_response = markdown.markdown(collected)
            cache[key] = html_response
            save_cache(cache)
            print("✅ Streaming complete. Final response:")

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

@app.route("/image", methods=["GET"])
def image_page():
    config = load_config()
    return render_template(
        "image.html",
        allowed_models=config.get("allowed_image_models", []),
        default_image_model=config.get("default_image_model", ""),
        active_page="image"
    )


@app.route("/stats")
def stats():
    stats_data = load_stats()
    return render_template("stats.html", stats=stats_data)



@app.route("/rebuild-index", methods=["POST"])
def rebuild_index():
    """Manual trigger to regenerate the FAISS index by calling prepare_data.py"""
    print("📍 Index generation started via prepare_data.py...")
    try:
        result = subprocess.run(["python3", "backend/prepare_data.py"], capture_output=True, text=True)

        if result.returncode == 0:
            print("✅ prepare_data.py executed successfully.")
            print(result.stdout)
            return jsonify({"status": "success", "message": "✅ Index generated successfully!"})
        else:
            print("❌ prepare_data.py returned an error:")
            print(result.stderr)
            return jsonify({"status": "error", "message": "❌ Index generation failed."})

    except Exception as e:
        print(f"❌ Exception during index generation: {e}")
        return jsonify({"status": "error", "message": "❌ Internal error occurred."})


@app.route("/cache", methods=["POST"])
def get_cached_response():
    data = request.get_json()
    prompt = data.get("prompt", "").strip()
    model = data.get("model", "").strip()
    key = f"{prompt}|{model}"
    cache = load_cache()
    return jsonify({
        "answer": cache.get(key, "[No cached response]")
    })




if __name__ == "__main__":
    app.run(debug=True, port=5050)
