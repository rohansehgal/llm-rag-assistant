# hello.py

import ollama

print("Hello, World!")

response = ollama.generate(model='llama3.2', prompt='What is the capital of France?')
print(response['response'])

