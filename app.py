# Imports 
from concurrent.futures import ThreadPoolExecutor
import functools
from flask import Flask, request, render_template, redirect, url_for, flash, jsonify, send_from_directory
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
from werkzeug.utils import secure_filename
import base64
import time
from datetime import datetime


# app creation
app = Flask(__name__)
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
                'upload_date': datetime.datetime.fromtimestamp(os.path.getmtime(path)).strftime('%Y-%m-%d'),
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
                'upload_date': datetime.datetime.fromtimestamp(os.path.getmtime(path)).strftime('%Y-%m-%d'),
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
                'upload_date': datetime.datetime.fromtimestamp(os.path.getmtime(path)).strftime('%Y-%m-%d'),
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



@app.route('/settings')
def settings():
    return render_template('settings.html', active_page='settings')


@app.route("/", methods=["GET"])
def index():
    return render_template("index.html")

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
    
    # (rest of your code is fine)

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
        future = executor.submit(functools.partial(ollama.generate, model=model, prompt=full_prompt))
        print("waiting for ollama result")
        result = dict(future.result())
        print("ollama result recieved")
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
            "timestamp": datetime.now().isoformat(),
            "source": "Text Analysis"
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


import base64

@app.route("/analyze-image", methods=["POST"])
def analyze_image():
    try:
        start_time = time.time()
        if 'image' not in request.files:
            flash('No image part in request.', 'danger')
            return redirect(url_for('index'))

        image = request.files['image']
        prompt = request.form.get('image_prompt', '')

        if image.filename == '':
            flash('No selected image.', 'danger')
            return redirect(url_for('index'))

        if image and allowed_file(image.filename):
            filename = secure_filename(image.filename)

            # Save image into uploads/images/
            image_path = os.path.join(UPLOAD_FOLDER_IMAGES, filename)
            image.save(image_path)

            # Base64 encode the image
            with open(image_path, "rb") as img_file:
                encoded_image = base64.b64encode(img_file.read()).decode('utf-8')

            # Send to Ollama for image analysis (BakLLaVA model)
            print("🟡 Analyzing image using BakLLaVA model")
            response = ollama.generate(
                model="bakllava",  # spelling must match your local ollama model name
                prompt=prompt or "Analyze the image and describe its contents.",
                images=[encoded_image]
            )

            image_response = response.get('response', '[No response]')
            time_ms = int((time.time() - start_time) * 1000)
            save_stat({
                "question": prompt or "Image submitted without prompt",
                "model": "baklava",
                "response_time_ms": time_ms,
                "timestamp": datetime.now().isoformat(),
                "source": "Image Analysis"
        })

            return render_template("index.html", image_response=image_response)

        else:
            flash('Unsupported file type. Please upload JPG or PNG images.', 'danger')
            return redirect(url_for('index'))

    except Exception as e:
        print(f"❌ Image Analysis Error: {e}")
        flash('An error occurred while analyzing the image.', 'danger')
        return redirect(url_for('index'))



@app.route("/stats")
def stats():
    stats_data = load_stats()
    return render_template("stats.html", stats=stats_data)

if __name__ == "__main__":
    app.run(debug=True, port=5050)
