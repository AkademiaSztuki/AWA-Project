import modal

app = modal.App("test-app")

@app.function()
def hello():
    return "Hello World"

@app.local_entrypoint()
def main():
    print(hello.remote())
