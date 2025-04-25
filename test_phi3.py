import ollama
import time

prompt = "Who is MK Gandhi?"
start = time.time()

print("🟡 Calling phi3 with:", prompt)
result = ollama.generate(model="phi3", prompt=prompt)
end = time.time()

print("✅ Response:")
print(result["response"])
print(f"⏱️ Took {round(end - start, 2)} seconds")
