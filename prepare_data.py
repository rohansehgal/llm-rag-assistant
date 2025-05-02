# prepare_data.py
from langchain.text_splitter import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer
import fitz  # PyMuPDF
import os
import faiss
import numpy as np
import pickle

UPLOAD_FOLDER_FILES = "uploads/files"
UPLOAD_FOLDER_RAG = "uploads/rag"
ALLOWED_EXTENSIONS = {'.pdf', '.txt'}  # Extend as needed

def extract_text_from_pdf(filepath):
    text = ""
    try:
        doc = fitz.open(filepath)
        for page in doc:
            text += page.get_text()
        doc.close()
    except Exception as e:
        print(f"❌ Failed to extract PDF: {filepath} — {e}")
    return text

def collect_text_from_folder(folder):
    combined_text = ""
    for filename in os.listdir(folder):
        filepath = os.path.join(folder, filename)
        ext = os.path.splitext(filename)[1].lower()
        if not os.path.isfile(filepath) or ext not in ALLOWED_EXTENSIONS:
            continue

        if ext == ".pdf":
            combined_text += extract_text_from_pdf(filepath) + "\n"
        else:
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    combined_text += f.read() + "\n"
            except Exception as e:
                print(f"⚠️ Failed to read {filename}: {e}")
    return combined_text

# Aggregate content from both RAG and Manual Upload folders
all_text = collect_text_from_folder(UPLOAD_FOLDER_FILES) + collect_text_from_folder(UPLOAD_FOLDER_RAG)

# Chunk the text
splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=100)
chunks = splitter.split_text(all_text)

# Embed
model = SentenceTransformer("all-MiniLM-L6-v2")
embeddings = model.encode(chunks)

# Save index and chunks
index = faiss.IndexFlatL2(embeddings[0].shape[0])
index.add(np.array(embeddings))

faiss.write_index(index, "vector_index.faiss")
with open("chunks.pkl", "wb") as f:
    pickle.dump(chunks, f)

print(f"✅ Rebuilt FAISS index with {len(chunks)} text chunks.")
