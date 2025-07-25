"""
Aura Modal Backend - FLUX 1 Kontext Integration
FastAPI endpoints for interior design image generation
Based on official Modal Flux Kontext example
"""

from io import BytesIO
from pathlib import Path
import modal
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import base64

# Modal configuration
app = modal.App("aura-flux-api")

# Model configuration - using official settings
MODEL_NAME = "black-forest-labs/FLUX.1-Kontext-dev"
MODEL_REVISION = "f9fdd1a95e0dfd7653cb0966cda2486745122695"
diffusers_commit_sha = "00f95b9755718aabb65456e791b8408526ae6e76"

# Cache setup
CACHE_DIR = Path("/cache")
cache_volume = modal.Volume.from_name("hf-hub-cache", create_if_missing=True)
volumes = {CACHE_DIR: cache_volume}

# Base image with dependencies - following official example
image = (
    modal.Image.from_registry(
        "nvidia/cuda:12.8.1-devel-ubuntu22.04",
        add_python="3.12",
    )
    .entrypoint([])  # remove verbose logging by base image on entry
    .apt_install("git")
    .pip_install("uv")
    .run_commands(
        f"uv pip install --system --compile-bytecode --index-strategy unsafe-best-match "
        f"accelerate~=1.8.1 "
        f"git+https://github.com/huggingface/diffusers.git@{diffusers_commit_sha} "
        f"huggingface-hub[hf-transfer]~=0.33.1 "
        f"Pillow~=11.2.1 safetensors~=0.5.3 transformers~=4.53.0 sentencepiece~=0.2.0 "
        f"torch==2.7.1 optimum-quanto==0.2.7 "
        f"fastapi~=0.110.0 pydantic~=2.7.0 uvicorn[standard]~=0.29.0 "
        f"--extra-index-url https://download.pytorch.org/whl/cu128"
    )
    .env({
        "HF_HUB_ENABLE_HF_TRANSFER": "1",  # Allows faster model downloads
        "HF_HOME": str(CACHE_DIR),  # Points the Hugging Face cache to a Volume
    })
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
    num_images: int = 1
    image_size: int = 512

class GenerationResponse(BaseModel):
    images: List[str]  # base64 encoded images
    parameters: dict
    processing_time: float
    cost_estimate: float

# Import statements for Modal
with image.imports():
    import torch
    from diffusers import FluxKontextPipeline
    from diffusers.utils import load_image
    from PIL import Image

@app.cls(
    image=image,
    gpu="H100",  # Changed from B200 to H100 as specified in your original code
    volumes=volumes,
    secrets=[modal.Secret.from_name("huggingface-secret")],
    scaledown_window=240  # Stay online for 4 minutes to avoid cold starts
)
class FluxKontextModel:
    @modal.enter()
    def enter(self):
        """Initialize FLUX 1 Kontext model - following official example"""
        print(f"Downloading {MODEL_NAME} if necessary...")

        dtype = torch.bfloat16
        self.seed = 42
        self.device = "cuda"

        self.pipe = FluxKontextPipeline.from_pretrained(
            MODEL_NAME,
            revision=MODEL_REVISION,
            torch_dtype=dtype,
            cache_dir=CACHE_DIR,
        ).to(self.device)

        print("FLUX model loaded successfully!")

    @modal.method()
    def inference(
        self,
        image_bytes: bytes,
        prompt: str,
        guidance_scale: float = 3.5,
        num_inference_steps: int = 20,
        image_size: int = 512,
        num_images: int = 1
    ) -> List[bytes]:
        """Generate interior designs using FLUX Kontext - following official example"""
        import time
        start_time = time.time()

        try:
            print(f"Starting inference with prompt: {prompt[:100]}...")
            
            # Load and resize the input image
            init_image = load_image(Image.open(BytesIO(image_bytes))).resize((image_size, image_size))
            print(f"Processed input image, size: {init_image.size}")

            # Generate images
            print(f"Generating {num_images} images...")
            result = self.pipe(
                image=init_image,
                prompt=prompt,
                guidance_scale=guidance_scale,
                num_inference_steps=num_inference_steps,
                output_type="pil",
                generator=torch.Generator(device=self.device).manual_seed(self.seed),
                num_images_per_prompt=num_images,
                height=image_size,
                width=image_size
            )

            # Convert images to bytes
            image_bytes_list = []
            for i, img in enumerate(result.images):
                print(f"Processing output image {i+1}/{len(result.images)}")
                byte_stream = BytesIO()
                img.save(byte_stream, format="PNG")
                image_bytes_list.append(byte_stream.getvalue())

            processing_time = time.time() - start_time
            print(f"Inference completed in {processing_time:.2f} seconds")

            return image_bytes_list

        except Exception as e:
            print(f"Inference error: {str(e)}")
            import traceback
            traceback.print_exc()
            raise e

    @modal.method()
    def text_to_image(
        self,
        prompt: str,
        guidance_scale: float = 7.0,
        num_inference_steps: int = 20,
        image_size: int = 512,
        num_images: int = 1
    ) -> List[bytes]:
        """Generate images from text only"""
        import time
        start_time = time.time()

        try:
            print(f"Starting text-to-image with prompt: {prompt[:100]}...")
            
            # Generate images without input image
            result = self.pipe(
                prompt=prompt,
                guidance_scale=guidance_scale,
                num_inference_steps=num_inference_steps,
                output_type="pil",
                generator=torch.Generator(device=self.device).manual_seed(self.seed),
                num_images_per_prompt=num_images,
                height=image_size,
                width=image_size
            )

            # Convert images to bytes
            image_bytes_list = []
            for i, img in enumerate(result.images):
                print(f"Processing output image {i+1}/{len(result.images)}")
                byte_stream = BytesIO()
                img.save(byte_stream, format="PNG")
                image_bytes_list.append(byte_stream.getvalue())

            processing_time = time.time() - start_time
            print(f"Text-to-image completed in {processing_time:.2f} seconds")

            return image_bytes_list

        except Exception as e:
            print(f"Text-to-image error: {str(e)}")
            import traceback
            traceback.print_exc()
            raise e

# Initialize model instance
flux_model = FluxKontextModel()

def build_prompt(request: GenerationRequest) -> str:
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

def decode_base64_image(base64_string: str) -> bytes:
    """Convert base64 string to bytes"""
    try:
        # Remove data URL prefix if present
        if base64_string.startswith('data:'):
            base64_string = base64_string.split(',')[1]
        
        image_bytes = base64.b64decode(base64_string)
        print(f"Decoded base64 image, size: {len(image_bytes)} bytes")
        return image_bytes
    except Exception as e:
        print(f"Error decoding base64 image: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid base64 image: {e}")

@web_app.post("/generate", response_model=GenerationResponse)
async def generate_interior(request: GenerationRequest):
    """Generate interior design images"""
    try:
        print(f"Received generation request: {request.prompt[:50]}...")
        
        # Build the full prompt
        full_prompt = build_prompt(request)
        print(f"Full prompt: {full_prompt}")
        
        # Generate images
        if request.base_image:
            # Image-to-image generation
            print("Using image-to-image mode")
            image_bytes = decode_base64_image(request.base_image)
            result_bytes_list = flux_model.inference.remote(
                image_bytes=image_bytes,
                prompt=full_prompt,
                guidance_scale=request.guidance,
                num_inference_steps=request.steps,
                image_size=request.image_size,
                num_images=request.num_images
            )
        else:
            # Text-to-image generation
            print("Using text-to-image mode")
            result_bytes_list = flux_model.text_to_image.remote(
                prompt=full_prompt,
                guidance_scale=request.guidance,
                num_inference_steps=request.steps,
                image_size=request.image_size,
                num_images=request.num_images
            )

        # Convert bytes to base64 for frontend
        images_b64 = []
        for img_bytes in result_bytes_list:
            img_b64 = base64.b64encode(img_bytes).decode()
            images_b64.append(img_b64)

        print("Generation completed successfully")
        
        return GenerationResponse(
            images=images_b64,
            parameters={
                "prompt": full_prompt,
                "steps": request.steps,
                "guidance": request.guidance,
                "model": "flux-1-kontext",
                "style": request.style,
                "modifications": request.modifications
            },
            processing_time=0.0,  # Will be calculated by Modal
            cost_estimate=0.001  # Placeholder
        )

    except Exception as e:
        print(f"API error: {str(e)}")
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
