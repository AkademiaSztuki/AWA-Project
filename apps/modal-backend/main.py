"""
Aura Modal Backend - FLUX 1 Kontext Integration
FastAPI endpoints for interior design image generation
"""

import modal
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import io
import base64
from PIL import Image
import torch

# Modal configuration
app = modal.App("aura-flux-api")

# Base image with dependencies
image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install_from_requirements("requirements.txt")
    .pip_install("black-forest-labs-flux[kontext]")  # FLUX Kontext model
)

# FastAPI app
web_app = FastAPI(
    title="Aura FLUX API",
    description="Interior design generation using FLUX 1 Kontext",
    version="1.0.0"
)

# CORS configuration for frontend
web_app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://your-vercel-app.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class GenerationRequest(BaseModel):
    prompt: str
    base_image: Optional[str] = None  # base64 encoded
    style: str = "modern"
    modifications: List[str] = []
    strength: float = 0.8
    steps: int = 20
    guidance: float = 7.0

class GenerationResponse(BaseModel):
    images: List[str]  # base64 encoded images
    parameters: dict
    processing_time: float
    cost_estimate: float

@app.cls(
    image=image,
    gpu="H100",  # FLUX requires powerful GPU
    secrets=[modal.Secret.from_name("huggingface-secret")],
    timeout=300
)
class FluxKontextModel:
    def __init__(self):
        self.pipe = None

    @modal.enter()
    def setup(self):
        """Initialize FLUX 1 Kontext model"""
        print("Loading FLUX 1 Kontext model...")

        from diffusers import FluxKontextPipeline

        self.pipe = FluxKontextPipeline.from_pretrained(
            "black-forest-labs/FLUX.1-Kontext-dev",
            torch_dtype=torch.bfloat16,
            use_safetensors=True
        ).to("cuda")

        # Enable memory efficient attention
        self.pipe.enable_model_cpu_offload()
        self.pipe.enable_sequential_cpu_offload()

        print("FLUX model loaded successfully!")

    @modal.method()
    def generate_interior(self, request: GenerationRequest) -> GenerationResponse:
        """Generate interior designs using FLUX Kontext"""
        import time
        start_time = time.time()

        try:
            # Build prompt from visual DNA and modifications
            full_prompt = self.build_prompt(request)

            # Process base image if provided
            base_image = None
            if request.base_image:
                base_image = self.decode_base64_image(request.base_image)

            # Generate images
            if base_image:
                # Image-to-image generation
                result = self.pipe(
                    prompt=full_prompt,
                    image=base_image,
                    strength=request.strength,
                    num_inference_steps=request.steps,
                    guidance_scale=request.guidance,
                    num_images_per_prompt=4,
                    generator=torch.Generator("cuda").manual_seed(42)
                )
            else:
                # Text-to-image generation
                result = self.pipe(
                    prompt=full_prompt,
                    num_inference_steps=request.steps,
                    guidance_scale=request.guidance,
                    num_images_per_prompt=4,
                    generator=torch.Generator("cuda").manual_seed(42)
                )

            # Convert images to base64
            images_b64 = []
            for img in result.images:
                buffered = io.BytesIO()
                img.save(buffered, format="PNG")
                img_b64 = base64.b64encode(buffered.getvalue()).decode()
                images_b64.append(img_b64)

            processing_time = time.time() - start_time

            return GenerationResponse(
                images=images_b64,
                parameters={
                    "prompt": full_prompt,
                    "steps": request.steps,
                    "guidance": request.guidance,
                    "model": "flux-1-kontext"
                },
                processing_time=processing_time,
                cost_estimate=processing_time * 0.001  # Estimated cost per second
            )

        except Exception as e:
            print(f"Generation error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

    def build_prompt(self, request: GenerationRequest) -> str:
        """Build comprehensive prompt from user preferences"""
        base_prompt = request.prompt
        style_prompt = f"Interior design in {request.style} style"

        # Add modifications
        modifications_text = ""
        if request.modifications:
            modifications_text = ", ".join(request.modifications)

        # Combine all elements
        full_prompt = f"{style_prompt}, {base_prompt}"
        if modifications_text:
            full_prompt += f", {modifications_text}"

        # Add quality enhancers for interior design
        full_prompt += ", high quality, professional interior photography, detailed, realistic lighting, beautiful composition"

        return full_prompt

    def decode_base64_image(self, base64_string: str) -> Image.Image:
        """Convert base64 string to PIL Image"""
        image_data = base64.b64decode(base64_string)
        image = Image.open(io.BytesIO(image_data)).convert("RGB")
        return image

# Initialize model instance
flux_model = FluxKontextModel()

@web_app.post("/generate", response_model=GenerationResponse)
async def generate_interior(request: GenerationRequest):
    """Generate interior design images"""
    try:
        result = flux_model.generate_interior.remote(request)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@web_app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "model": "flux-1-kontext"}

@web_app.get("/")
async def root():
    """API root endpoint"""
    return {
        "message": "Aura FLUX API",
        "version": "1.0.0",
        "endpoints": ["/generate", "/health"]
    }

# Deploy the FastAPI app
@app.function(image=image)
@modal.asgi_app()
def fastapi_app():
    return web_app
