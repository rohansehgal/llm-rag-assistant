# LLM RAG Assistant

A local LLM assistant built using Flask and Ollama. Supports:
- Prompting multiple models (LLaMA, Mistral, Phi-3)
- Uploading PDFs for context-aware RAG
- Streaming response display with stats tracking
- Optional image understanding using models like Bakllava

## Setup (local)

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
