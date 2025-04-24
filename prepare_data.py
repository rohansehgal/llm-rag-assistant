# prepare_data.py
from langchain.text_splitter import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer
import os
import faiss
import numpy as np
import pickle

# Load and split your files
all_text = ""
for filename in os.listdir("my_data"):
    with open(os.path.join("my_data", filename), "r") as f:
        all_text += f.read() + "\n"

splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=100)
chunks = splitter.split_text(all_text)

# Embed
model = SentenceTransformer("all-MiniLM-L6-v2")
embeddings = model.encode(chunks)

# Build FAISS index
index = faiss.IndexFlatL2(embeddings[0].shape[0])
index.add(np.array(embeddings))

# Save index and chunks
faiss.write_index(index, "vector_index.faiss")
with open("chunks.pkl", "wb") as f:
    pickle.dump(chunks, f)
