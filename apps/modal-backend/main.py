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
    # Use the prompt directly from frontend - it's already comprehensive
    full_prompt = request.prompt
    
    # Only add style prefix if it's not already in the prompt
    if request.style and request.style not in full_prompt.lower():
        full_prompt = f"{request.style} style, {full_prompt}"
    
    # Add modifications if any
    if request.modifications:
        modifications_text = ", ".join(request.modifications)
        full_prompt += f", {modifications_text}"

    # Add minimal quality enhancers to stay under token limit
    full_prompt += ", professional interior photography"

    return full_prompt

def decode_base64_image(base64_string: str) -> bytes:
    """Convert base64 string to bytes"""
    try:
        # Base64 string is already clean (no MIME header)
        image_bytes = base64.b64decode(base64_string)
        print(f"Decoded base64 image, size: {len(image_bytes)} bytes")
        
        # Verify it's a valid image by checking first few bytes
        if len(image_bytes) < 8:
            raise ValueError("Image too small to be valid")
        
        # Check for common image format signatures
        if image_bytes[:2] == b'\xff\xd8':  # JPEG
            print("Detected JPEG format")
        elif image_bytes[:8] == b'\x89PNG\r\n\x1a\n':  # PNG
            print("Detected PNG format")
        elif image_bytes[:4] in [b'II*\x00', b'MM\x00*']:  # TIFF (little-endian and big-endian)
            print("Detected TIFF format")
        elif image_bytes[:4] in [b'\x00\x00\x00\x20', b'\x00\x00\x00\x1c'] and b'ftyp' in image_bytes[:20]:
            # Check if it's AVIF, HEIC, or MP4 by looking for format identifiers
            print(f"Found ftyp box, checking for format. First 50 bytes: {image_bytes[:50].hex()}")
            print(f"Looking for 'avif' in first 50 bytes: {b'avif' in image_bytes[:50]}")
            print(f"Looking for 'heic' in first 50 bytes: {b'heic' in image_bytes[:50]}")
            print(f"Looking for 'heix' in first 50 bytes: {b'heix' in image_bytes[:50]}")
            
            if b'avif' in image_bytes[:50]:  # AVIF
                print("Detected AVIF format - converting to PNG")
                # Convert AVIF to PNG using Pillow
                from PIL import Image
                import io
                try:
                    # Try to open AVIF with Pillow (requires pillow-avif-plugin)
                    img = Image.open(io.BytesIO(image_bytes))
                    # Convert to PNG
                    png_buffer = io.BytesIO()
                    img.save(png_buffer, format='PNG')
                    png_bytes = png_buffer.getvalue()
                    print(f"Converted AVIF to PNG, new size: {len(png_bytes)} bytes")
                    return png_bytes
                except Exception as avif_error:
                    print(f"Failed to convert AVIF: {avif_error}")
                    raise ValueError("AVIF format not supported. Please convert to JPG, PNG, or TIFF before uploading.")
            elif b'heic' in image_bytes[:50] or b'heix' in image_bytes[:50]:  # HEIC
                print("Detected HEIC format - converting to PNG")
                # Convert HEIC to PNG using Pillow
                from PIL import Image
                import io
                try:
                    # Try to open HEIC with Pillow (requires pillow-heif)
                    img = Image.open(io.BytesIO(image_bytes))
                    # Convert to PNG
                    png_buffer = io.BytesIO()
                    img.save(png_buffer, format='PNG')
                    png_bytes = png_buffer.getvalue()
                    print(f"Converted HEIC to PNG, new size: {len(png_bytes)} bytes")
                    return png_bytes
                except Exception as heic_error:
                    print(f"Failed to convert HEIC: {heic_error}")
                    raise ValueError("HEIC format not supported. Please convert to JPG, PNG, or TIFF before uploading.")
            else:  # MP4
                print("Detected MP4 format - rejecting")
                raise ValueError("MP4 video file detected. Please upload an image file (JPG, PNG, TIFF).")
        else:
            print(f"Unknown image format, first bytes: {image_bytes[:8].hex()}")
            # Still try to process it, but warn
            print("Warning: Unknown format, attempting to process anyway...")
        
        return image_bytes
    except Exception as e:
        print(f"Error decoding base64 image: {e}")
        if "Incorrect padding" in str(e):
            raise HTTPException(status_code=400, detail="Invalid base64 encoding. Please try uploading the image again.")
        elif "MP4 video file" in str(e):
            raise HTTPException(status_code=400, detail=str(e))
        elif "AVIF format not supported" in str(e):
            raise HTTPException(status_code=400, detail=str(e))
        else:
            raise HTTPException(status_code=400, detail=f"Invalid image file: {e}")

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
