import modal
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import base64
import time

# Modal App
app = modal.App("aura-simple-api")

# Simple image with basic dependencies
image = modal.Image.debian_slim(python_version="3.11").pip_install([
    "fastapi==0.104.1",
    "uvicorn==0.24.0",
    "pydantic==2.4.2",
    "pillow==10.0.1"
])

# FastAPI app
web_app = FastAPI(title="Aura Simple API")

# CORS for Vercel
web_app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://awa-project-frontend-fhka.vercel.app",
        "https://awa-project-frontend-fhka-git-main-pali89s-projects.vercel.app", 
        "https://awa-project-frontend-fhka-jgdebq34v-pali89s-projects.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class GenerationRequest(BaseModel):
    prompt: str
    base_image: Optional[str] = None
    style: str = "modern"
    modifications: List[str] = []
    strength: float = 0.8
    steps: int = 20
    guidance: float = 7.0
    num_images: int = 1
    image_size: int = 512

class GenerationResponse(BaseModel):
    images: List[str]
    parameters: dict
    processing_time: float
    cost_estimate: float

@web_app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": time.time()}

@web_app.get("/")
def root():
    return {"message": "Aura Simple API", "version": "1.0.0"}

@web_app.post("/generate", response_model=GenerationResponse)
def generate_mock(request: GenerationRequest):
    """Mock generation endpoint for testing"""
    # For now, return a mock response
    # TODO: Replace with actual FLUX generation
    
    mock_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
    
    return GenerationResponse(
        images=[mock_base64] * request.num_images,
        parameters={
            "prompt": request.prompt,
            "style": request.style,
            "steps": request.steps,
            "guidance": request.guidance
        },
        processing_time=2.5,
        cost_estimate=0.05
    )

# Deploy the web app
@app.function(image=image)
@modal.asgi_app()
def fastapi_app():
    return web_app
