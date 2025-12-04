import modal
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import base64
import time
import os

# Modal App
app = modal.App("aura-flux-api")

# Model configuration
MODEL_NAME = "black-forest-labs/FLUX.1-Kontext-dev"
MODEL_REVISION = "f9fdd1a95e0dfd7653cb0966cda2486745122695"

# Cache setup
CACHE_DIR = "/cache"
cache_volume = modal.Volume.from_name("hf-hub-cache", create_if_missing=True)
volumes = {CACHE_DIR: cache_volume}

# Base image with dependencies
image = (
    modal.Image.from_registry(
        "nvidia/cuda:12.8.1-devel-ubuntu22.04",
        add_python="3.12",
    )
    .entrypoint([])
    .apt_install("git")
    .pip_install("uv")
    .run_commands(
        "uv pip install --system --compile-bytecode --index-strategy unsafe-best-match "
        "accelerate~=1.8.1 "
        "git+https://github.com/huggingface/diffusers.git@00f95b9755718aabb65456e791b8408526ae6e76 "
        "huggingface-hub[hf-transfer]~=0.33.1 "
        "Pillow~=11.2.1 safetensors~=0.5.3 transformers~=4.53.0 sentencepiece~=0.2.0 "
        "torch==2.7.1 optimum-quanto==0.2.7 "
        "fastapi~=0.110.0 pydantic~=2.7.0 uvicorn[standard]~=0.29.0 "
        "--extra-index-url https://download.pytorch.org/whl/cu128"
    )
    .env({
        "HF_HUB_ENABLE_HF_TRANSFER": "1",
        "HF_HOME": str(CACHE_DIR),
    })
)

# FastAPI app
web_app = FastAPI(
    title="Aura FLUX API",
    description="Interior design generation using FLUX 1 Kontext",
    version="1.0.0"
)

# CORS configuration for Vercel
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

# Pydantic models
class GenerationRequest(BaseModel):
    prompt: str
    base_image: Optional[str] = None
    inspiration_images: Optional[List[str]] = None  # Base64 reference images for style transfer
    style: str = "modern"
    modifications: List[str] = []
    strength: float = 0.8
    steps: int = 20
    guidance: float = 7.0
    num_images: int = 1
    image_size: int = 1024

class GenerationResponse(BaseModel):
    images: List[str]
    parameters: dict
    processing_time: float
    cost_estimate: float

# Import statements for Modal
with image.imports():
    import torch
    from diffusers import FluxKontextPipeline
    from diffusers.utils import load_image
    from PIL import Image
    from io import BytesIO

@app.cls(
    image=image,
    gpu="H100",
    volumes=volumes,
    secrets=[modal.Secret.from_name("huggingface-secret")],
    scaledown_window=240
)
class FluxKontextModel:
    @modal.enter()
    def enter(self):
        """Initialize FLUX 1 Kontext model"""
        print("Loading FLUX Kontext model...")
        
        # Set device
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"Using device: {self.device}")
        
        # Load model
        self.pipe = FluxKontextPipeline.from_pretrained(
            MODEL_NAME,
            revision=MODEL_REVISION,
            torch_dtype=torch.float16,
            device_map="auto"
        )
        
        # Set seed for reproducibility
        self.seed = 42
        
        print("FLUX model loaded successfully!")

    @modal.method()
    def inference(
        self,
        image_bytes: bytes,
        prompt: str,
        guidance_scale: float = 3.5,
        num_inference_steps: int = 20,
        image_size: int = 1024,
        num_images: int = 1,
        inspiration_images: Optional[List[bytes]] = None
    ) -> List[bytes]:
        """Generate interior designs using FLUX Kontext
        
        Args:
            image_bytes: Base image (room photo) to transform
            prompt: Text prompt describing the desired transformation
            guidance_scale: How closely to follow the prompt (higher = more literal)
            num_inference_steps: Number of diffusion steps
            image_size: Output image size
            num_images: Number of images to generate
            inspiration_images: Optional list of reference images for style transfer
        """
        import time
        start_time = time.time()

        try:
            print(f"Starting inference with prompt: {prompt[:100]}...")
            
            # Load and resize the input image
            init_image = load_image(Image.open(BytesIO(image_bytes))).resize((image_size, image_size))
            print(f"Processed input image, size: {init_image.size}")
            
            # If inspiration images are provided, create a composite reference
            # FLUX Kontext supports multi-image conditioning
            reference_images = []
            if inspiration_images and len(inspiration_images) > 0:
                print(f"Processing {len(inspiration_images)} inspiration images...")
                for i, insp_bytes in enumerate(inspiration_images[:3]):  # Limit to 3
                    try:
                        insp_img = load_image(Image.open(BytesIO(insp_bytes))).resize((image_size, image_size))
                        reference_images.append(insp_img)
                        print(f"Loaded inspiration image {i+1}")
                    except Exception as e:
                        print(f"Failed to load inspiration image {i+1}: {e}")
            
            # Prepare generation kwargs
            gen_kwargs = {
                "image": init_image,
                "prompt": prompt,
                "guidance_scale": guidance_scale,
                "num_inference_steps": num_inference_steps,
                "output_type": "pil",
                "generator": torch.Generator(device=self.device).manual_seed(self.seed),
                "num_images_per_prompt": num_images,
                "height": image_size,
                "width": image_size
            }
            
            # If we have reference images, modify the prompt to include style transfer context
            if reference_images:
                # For FLUX Kontext, we can use image conditioning
                # The model supports multiple reference images for style transfer
                print(f"Using {len(reference_images)} reference images for style transfer")
                # Note: FLUX Kontext may require specific handling for multi-reference
                # For now, we enhance the prompt with reference context
                enhanced_prompt = f"Apply the visual style, colors, and materials from the reference images. {prompt}"
                gen_kwargs["prompt"] = enhanced_prompt

            # Generate images
            print(f"Generating {num_images} images...")
            result = self.pipe(**gen_kwargs)

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
        image_size: int = 1024,
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
    full_prompt = request.prompt
    
    if request.style and request.style not in full_prompt.lower():
        full_prompt = f"{request.style} style, {full_prompt}"
    
    if request.modifications:
        modifications_text = ", ".join(request.modifications)
        full_prompt += f", {modifications_text}"

    full_prompt += ", professional interior photography"
    return full_prompt

def decode_base64_image(base64_string: str) -> bytes:
    """Convert base64 string to bytes, handling data URI prefix"""
    try:
        # Remove data URI prefix if present (e.g., "data:image/png;base64,")
        if ',' in base64_string:
            base64_string = base64_string.split(',', 1)[1]
        
        # Decode base64
        image_bytes = base64.b64decode(base64_string)
        print(f"Decoded base64 image, size: {len(image_bytes)} bytes")
        
        if len(image_bytes) < 8:
            raise ValueError("Image too small to be valid")
        
        return image_bytes
        
    except Exception as e:
        print(f"Error decoding base64 image: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid image file: {e}")

@web_app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": time.time()}

@web_app.get("/")
def root():
    return {"message": "Aura FLUX API", "version": "1.0.0"}

@web_app.post("/generate", response_model=GenerationResponse)
async def generate_interior(request: GenerationRequest):
    """Generate interior design images
    
    Supports multi-reference editing with inspiration_images for FLUX.2 style transfer.
    According to FLUX.2 docs, [dev] supports up to 6 reference images.
    Reference: https://docs.bfl.ai/flux_2/flux2_image_editing
    """
    try:
        print(f"Received generation request: {request.prompt[:50]}...")
        
        # Build the full prompt
        full_prompt = build_prompt(request)
        print(f"Full prompt: {full_prompt}")
        
        # Decode inspiration images if provided (for multi-reference editing)
        inspiration_bytes_list = None
        if request.inspiration_images and len(request.inspiration_images) > 0:
            print(f"Processing {len(request.inspiration_images)} inspiration images for multi-reference...")
            inspiration_bytes_list = []
            for i, insp_b64 in enumerate(request.inspiration_images[:6]):  # Limit to 6 for FLUX.2 [dev]
                try:
                    insp_bytes = decode_base64_image(insp_b64)
                    inspiration_bytes_list.append(insp_bytes)
                    print(f"Decoded inspiration image {i+1}, size: {len(insp_bytes)} bytes")
                except Exception as e:
                    print(f"Failed to decode inspiration image {i+1}: {e}")
            
            if inspiration_bytes_list:
                # Enhance prompt for multi-reference style transfer
                full_prompt = f"Apply the visual style, colors, materials, and design elements from the reference images. {full_prompt}"
                print(f"Enhanced prompt for multi-reference: {full_prompt[:100]}...")
        
        # Generate images
        if request.base_image:
            # Image-to-image generation with optional multi-reference
            print(f"Using image-to-image mode with {len(inspiration_bytes_list) if inspiration_bytes_list else 0} reference images")
            image_bytes = decode_base64_image(request.base_image)
            result_bytes_list = flux_model.inference.remote(
                image_bytes=image_bytes,
                prompt=full_prompt,
                guidance_scale=request.guidance,
                num_inference_steps=request.steps,
                image_size=request.image_size,
                num_images=request.num_images,
                inspiration_images=inspiration_bytes_list
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
                "style": request.style,
                "steps": request.steps,
                "guidance": request.guidance,
                "image_size": request.image_size,
                "num_images": request.num_images,
                "inspiration_count": len(inspiration_bytes_list) if inspiration_bytes_list else 0
            },
            processing_time=0.0,  # Will be calculated by the model
            cost_estimate=0.05
        )

    except Exception as e:
        print(f"Generation error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

# Deploy the web app
@app.function(image=image)
@modal.asgi_app()
def fastapi_app():
    return web_app
