"""
Aura Modal Backend - FLUX 2 Dev Integration
FastAPI endpoints for interior design image generation
Using FLUX 2 Dev model from Hugging Face
"""

from io import BytesIO
from pathlib import Path
import base64
import hashlib
import json
import modal
import os
import threading
import time
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import requests

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

# Modal configuration
app = modal.App("aura-flux-api")

# Model configuration - FLUX.2 Dev 4-bit quantized (fits in 24GB L4)
MODEL_NAME = "diffusers/FLUX.2-dev-bnb-4bit"

# Image configuration
CACHE_DIR = "/cache"
volumes = {CACHE_DIR: modal.Volume.from_name("aura-flux-cache", create_if_missing=True)}

# Modal image with dependencies - FLUX.2 CONFIG
image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("git", "ffmpeg", "libsndfile1")
    .pip_install(
        # Core ML packages
        "torch==2.7.1",
        "torchaudio==2.7.1", 
        extra_index_url="https://download.pytorch.org/whl/cu128"
    )
    .pip_install(
        # Install latest diffusers from main branch (has Flux2Pipeline for FLUX.2)
        "git+https://github.com/huggingface/diffusers.git",
        "accelerate>=1.8.1",
        "huggingface-hub[hf-transfer]>=0.34.0",
        "transformers>=4.52.0",
        "safetensors>=0.5.3",
        "sentencepiece>=0.2.0",
        "Pillow>=11.2.1",
        "einops",
        "timm",
        "bitsandbytes>=0.45.0",  # For 4-bit quantization
    )
    .pip_install(
        # API packages
        "fastapi>=0.110.0",
        "pydantic>=2.7.0",
        "uvicorn[standard]>=0.29.0",
        "soundfile",
        "librosa",
        "av",
    )
    .env({
        "HF_HUB_ENABLE_HF_TRANSFER": "1",
        "HF_HOME": "/cache",
    })
)

# Import statements for Modal
with image.imports():
    import torch
    from diffusers import Flux2Pipeline  # For FLUX.2-dev
    from diffusers.utils import load_image
    from transformers import AutoProcessor, AutoModelForCausalLM, AutoTokenizer
    from PIL import Image

# Pydantic models for API
class GenerationRequest(BaseModel):
    prompt: str
    base_image: Optional[str] = None  # base64 encoded input image for image-to-image
    inspiration_images: Optional[List[str]] = None  # Additional reference images for multi-reference (base64)
    negative_prompt: str = ""  # Not used in FLUX 2, kept for compatibility
    num_images: int = 1
    guidance_scale: float = 4.0  # FLUX 2 default
    guidance: Optional[float] = None  # Alias for guidance_scale (from frontend)
    num_inference_steps: int = 20  # Default: 20 for preview, can be overridden
    steps: Optional[int] = None  # Alias for num_inference_steps (from frontend)
    width: Optional[int] = None  # Changed to None to detect if actually sent
    height: Optional[int] = None  # Changed to None to detect if actually sent
    image_size: Optional[int] = 512  # Default to 512 for preview mode - CRITICAL for initial generations
    seed: Optional[int] = None

class GenerationResponse(BaseModel):
    images: List[str]  # base64 encoded images
    generation_info: dict
    cost_estimate: float

class RoomAnalysisMetadata(BaseModel):
    session_id: Optional[str] = None
    source: Optional[str] = None
    cache_key: Optional[str] = None
    client_timestamp: Optional[str] = None
    request_id: Optional[str] = None
    cache_hit: Optional[bool] = None


class RoomAnalysisRequest(BaseModel):
    image: str  # base64 encoded image
    metadata: Optional[RoomAnalysisMetadata] = None

class RoomAnalysisResponse(BaseModel):
    detected_room_type: str
    confidence: float
    room_description: str
    suggestions: List[str]
    comment: str
    human_comment: Optional[str] = None  # Lightweight human comment (optional)

class LLMCommentRequest(BaseModel):
    room_type: str
    room_description: str
    context: str = "room_analysis"  # or "generated_image"

class LLMCommentResponse(BaseModel):
    comment: str
    suggestions: List[str]

class InspirationAnalysisRequest(BaseModel):
    image: str  # base64 encoded image

class InspirationAnalysisResponse(BaseModel):
    styles: List[str]
    colors: List[str]
    materials: List[str]
    biophilia: int  # 0-3 scale
    description: str


ROOM_ANALYSIS_SESSION_LIMIT = int(os.environ.get("ROOM_ANALYSIS_SESSION_LIMIT", "1"))
ROOM_ANALYSIS_SESSION_WINDOW_SECONDS = int(os.environ.get("ROOM_ANALYSIS_SESSION_WINDOW_SECONDS", "3600"))
_room_analysis_usage: dict[str, dict[str, float]] = {}
_room_analysis_usage_lock = threading.Lock()
GROQ_API_URL = os.environ.get("GROQ_API_URL", "https://api.groq.com/openai/v1/chat/completions")
GROQ_LLM_MODEL = os.environ.get("GROQ_LLM_MODEL", "llama-3.1-8b-instant")


def _check_room_analysis_quota(session_id: Optional[str]) -> None:
    """Ensure a session does not exceed the configured number of analyses per time window."""
    if not session_id:
        return

    now = time.time()
    with _room_analysis_usage_lock:
        entry = _room_analysis_usage.get(session_id)
        if not entry or now - entry["start"] > ROOM_ANALYSIS_SESSION_WINDOW_SECONDS:
            _room_analysis_usage[session_id] = {"count": 1, "start": now}
            return

        entry["count"] += 1
        if entry["count"] > ROOM_ANALYSIS_SESSION_LIMIT:
            raise HTTPException(
                status_code=429,
                detail="Room analysis quota exceeded for this session. Please wait before retrying.",
            )


def _call_groq_for_comment(room_type: str, room_description: str, context: str = "room_analysis") -> Optional[str]:
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        return None

    try:
        if context == "room_analysis":
            prompt = (
                f"Zdjęcie przedstawia {room_description or 'wnętrze'}. "
                f"Użytkownik prosi o krótki, ciepły komentarz dotyczący pomieszczenia typu {room_type}. "
                "Napisz 2-3 zdania po polsku, przyjaznym tonem, zachęcając do wspólnego projektowania."
            )
        else:
            prompt = (
                f"Wygenerowane wnętrze ({room_type}) opisane jako: {room_description or 'brak opisu'}. "
                "Przygotuj krótki komentarz (2-3 zdania) po polsku, zachęcający użytkownika do dalszych iteracji."
            )

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": GROQ_LLM_MODEL,
            "messages": [
                {"role": "system", "content": "Jesteś IDA - empatyczną architektką wnętrz mówiącą po polsku."},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.7,
            "max_tokens": 320,
        }

        response = requests.post(GROQ_API_URL, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        data = response.json()
        content = data["choices"][0]["message"]["content"]
        return content.strip()
    except Exception as exc:
        print(f"[GROQ] Comment generation failed: {exc}")
        return None

@app.cls(
    image=image,
    gpu="A100",  # A100 (40GB) - 4-bit FLUX.2 needs ~30GB
    volumes=volumes,
    secrets=[modal.Secret.from_name("huggingface-secret-new")],
    scaledown_window=120,  # 2 minutes to save costs
    max_containers=1,  # Only one container at a time - sequential processing
    min_containers=0   # Allow container to scale down to zero when idle
)
class Flux2Model:
    @modal.enter()
    def enter(self):
        """Initialize FLUX 2 Dev model"""
        try:
            print("Downloading FLUX 2 Dev model if necessary...")
            
            # Set up secrets
            import os
            self.hf_token = os.environ["HF_NEWTOKEN"]
            
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
            self.seed = 42  # Default seed for consistency
            print(f"Using device: {self.device}")
            
            # Load FLUX.2 Dev 4-bit quantized model (fits in 24GB L4)
            print("Loading FLUX.2 Dev 4-bit model...")
            self.pipe = Flux2Pipeline.from_pretrained(
                MODEL_NAME,
                torch_dtype=torch.bfloat16,
                cache_dir=CACHE_DIR,
                token=self.hf_token,
            ).to(self.device)
            
            print("FLUX.2 Dev 4-bit model loaded successfully!")
        except Exception as e:
            print(f"Error loading FLUX Dev model: {str(e)}")
            raise e

    @modal.method()
    def generate_images(self, request: GenerationRequest, image_bytes: bytes = None, inspiration_images_bytes: Optional[List[bytes]] = None, image_size_override: Optional[int] = None) -> dict:
        """Generate images using FLUX 2 Dev - IMAGE-TO-IMAGE MODE with optional multi-reference"""
        try:
            # CRITICAL FIX: Force image_size to 512 if it's None or invalid
            # This ensures preview images are ALWAYS 512x512, not 1024x1024
            if request.image_size is None or request.image_size <= 0:
                request.image_size = 512
                print(f"[PARAMS] FORCED image_size to 512 (was None or invalid)")
            
            # Debug: log all size-related parameters - CRITICAL for debugging
            print(f"[PARAMS DEBUG] image_size={request.image_size} (type: {type(request.image_size)}), width={request.width}, height={request.height}")
            print(f"[PARAMS DEBUG] image_size_override={image_size_override} (type: {type(image_size_override)})")
            print(f"[PARAMS DEBUG] request.model_dump(): image_size={request.model_dump().get('image_size')}")
            
            # Resolve parameter aliases (frontend sends steps/guidance/image_size)
            actual_steps = request.steps if request.steps is not None else request.num_inference_steps
            actual_guidance = request.guidance if request.guidance is not None else request.guidance_scale
            
            # CRITICAL: Determine actual_size - prioritize image_size_override, then request.image_size, then defaults
            # IMPORTANT: ALWAYS default to 512 for preview mode (NOT 1024)
            # This is the critical fix - preview images should be 512x512, not 1024x1024
            if image_size_override is not None and image_size_override > 0:
                actual_size = image_size_override
                # Force set on request object (Modal may not pass keyword args correctly)
                request.image_size = image_size_override
                print(f"[PARAMS] ✓ Using image_size_override: {actual_size} (set on request.image_size)")
            elif request.image_size is not None and request.image_size > 0:
                actual_size = request.image_size
                print(f"[PARAMS] ✓ Using image_size from request: {actual_size}")
            elif request.width is not None and request.height is not None:
                # Only use width/height if both are explicitly provided (not None)
                actual_size = max(request.width, request.height)
                print(f"[PARAMS] ⚠ Using max(width={request.width}, height={request.height}) as fallback: {actual_size}")
                print(f"[PARAMS] ⚠ WARNING: image_size was None or 0! Frontend should send image_size for preview mode.")
            elif request.width is not None:
                actual_size = request.width
                print(f"[PARAMS] Using width={request.width} as fallback")
            elif request.height is not None:
                actual_size = request.height
                print(f"[PARAMS] Using height={request.height} as fallback")
            else:
                # CRITICAL: ALWAYS default to 512 for preview mode, NOT 1024
                # This is the key fix - preview images must be 512x512
                actual_size = 512
                # Force set on request object to ensure it's used
                request.image_size = 512
                print(f"[PARAMS] ⚠ Using default size: {actual_size} (no image_size, width, or height provided) - FORCED to 512 for preview mode")
            
            # Update request values for consistency
            request.num_inference_steps = actual_steps
            request.guidance_scale = actual_guidance
            request.width = actual_size
            request.height = actual_size
            
            print(f"Generating {request.num_images} images with prompt: {request.prompt[:100]}...")
            print(f"[PARAMS] steps={actual_steps}, guidance={actual_guidance}, size={actual_size}")
            
            if not image_bytes:
                raise ValueError("FLUX 2 requires a base image for image-to-image editing!")
            
            # FLUX 2 supports much longer prompts (32K tokens), so we just log length
            prompt_tokens = len(request.prompt.split())
            print(f"[PROMPT] Token count: {prompt_tokens} (FLUX 2 supports up to 32K tokens)")
            
            # Load and prepare base image
            # Use actual_size from request (can be 512 for preview, 1024+ for full quality)
            target_size = actual_size  # Use the resolved size from request (no minimum enforced)
            init_image = Image.open(BytesIO(image_bytes)).convert('RGB').resize((target_size, target_size))
            print(f"Loaded base image, resized to: {init_image.size}")
            
            # Prepare image list for FLUX 2 (supports multi-reference)
            image_list = [init_image]
            
            # Add inspiration images if provided (for multi-reference editing)
            if inspiration_images_bytes:
                print(f"Adding {len(inspiration_images_bytes)} inspiration images for multi-reference editing")
                for i, insp_bytes in enumerate(inspiration_images_bytes[:6]):  # FLUX 2 dev supports up to 6 reference images
                    try:
                        insp_img = Image.open(BytesIO(insp_bytes)).convert('RGB')
                        # Resize to match base image aspect ratio approximately
                        insp_img = insp_img.resize((target_size, target_size))
                        image_list.append(insp_img)
                        print(f"Loaded inspiration image {i+1}, size: {insp_img.size}")
                    except Exception as e:
                        print(f"Failed to load inspiration image {i+1}: {e}")
                        # Continue with other images
                print(f"Total images for multi-reference: {len(image_list)}")
            
            # Set random seed if provided
            if request.seed is not None:
                torch.manual_seed(request.seed)
                if torch.cuda.is_available():
                    torch.cuda.manual_seed(request.seed)
                seed = request.seed
            else:
                # Use fixed seed for consistency
                seed = self.seed
                torch.manual_seed(seed)
                if torch.cuda.is_available():
                    torch.cuda.manual_seed(seed)
            
            # Generate images with FLUX 2
            print(f"Running FLUX 2 Dev image-to-image inference with {len(image_list)} reference image(s)...")
            with torch.inference_mode():
                result = self.pipe(
                    prompt=request.prompt,
                    image=image_list,  # FLUX 2 accepts list of images for multi-reference
                    guidance_scale=request.guidance_scale,
                    num_inference_steps=request.num_inference_steps,
                    output_type="pil",
                    generator=torch.Generator(device=self.device).manual_seed(seed),
                    num_images_per_prompt=request.num_images,
                )
            
            # Convert images to base64
            images_b64 = []
            for image in result.images:
                buffer = BytesIO()
                image.save(buffer, format="PNG")
                img_b64 = base64.b64encode(buffer.getvalue()).decode()
                images_b64.append(img_b64)
            
            # Calculate cost estimate (rough approximation - FLUX 2 is free for dev model)
            cost_estimate = 0.0  # Dev model is free, only compute costs
            
            return {
                "images": images_b64,
                "generation_info": {
                    "model": MODEL_NAME,
                    "prompt": request.prompt[:200],  # Truncate for logging
                    "num_images": request.num_images,
                    "guidance_scale": request.guidance_scale,
                    "num_inference_steps": request.num_inference_steps,
                    "width": request.width,
                    "height": request.height,
                    "seed": seed,
                    "multi_reference": len(image_list) > 1,
                    "reference_count": len(image_list)
                },
                "cost_estimate": cost_estimate
            }
            
        except Exception as e:
            print(f"Error generating images: {str(e)}")
            raise e

# Gemma 3 4B-IT Model - MULTIMODAL MODEL WITH EXCELLENT POLISH SUPPORT
@app.cls(
    image=image,
    gpu="T4",  # Changed from H100 to T4 for cost savings (~$0.59/h vs $4.76/h) - 4B model fits in 16GB
    volumes=volumes,
    secrets=[modal.Secret.from_name("huggingface-secret-new")],
    scaledown_window=120  # Reduced to 2 minutes to save costs
)
class Gemma3VisionModel:
    """Gemma 3 4B-IT multimodal model for room analysis and comments with excellent Polish support
    
    Using H100 (same as FLUX) for:
    - Single cold start instead of two separate GPUs
    - Faster initialization (parallel loading with FLUX)
    - Better resource utilization (80GB VRAM is plenty for both)
    """
    
    @modal.enter()
    def enter(self):
        """Initialize Gemma 3 4B-IT model"""
        try:
            print("Downloading Gemma 3 4B-IT model if necessary...")
            
            # Set up secrets
            import os
            self.hf_token = os.environ["HF_NEWTOKEN"]
            
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
            print(f"Using device: {self.device}")
            
            # Load Gemma 3 4B-IT model (multimodal vision-language model, supports 140+ languages including Polish)
            from transformers import Gemma3ForConditionalGeneration
            
            self.model = Gemma3ForConditionalGeneration.from_pretrained(
                "google/gemma-3-4b-it",
                torch_dtype=torch.bfloat16,
                cache_dir=CACHE_DIR,
                token=self.hf_token,
                device_map="auto",
                low_cpu_mem_usage=True
            )
            print("Gemma 3 vision model loaded successfully")
            
            # Load processor for image-text tasks
            self.processor = AutoProcessor.from_pretrained(
                "google/gemma-3-4b-it",
                cache_dir=CACHE_DIR,
                token=self.hf_token
            )
            print("Processor loaded successfully")
            
            print("Gemma 3 4B-IT model loaded successfully!")
        except Exception as e:
            print(f"Error loading Gemma 3 4B-IT model: {str(e)}")
            raise e

    @modal.method()
    def analyze_room_and_comment(self, image_bytes: bytes) -> dict:
        """Analyze room and generate intelligent comment using Gemma 3 4B-IT"""
        import time
        start_time = time.time()
        
        try:
            print(f"Starting room analysis and comment generation... Image size: {len(image_bytes)} bytes")
            
            # Load and process image
            image_start = time.time()
            image = Image.open(BytesIO(image_bytes))
            print(f"Image loaded in {time.time() - image_start:.2f}s - mode: {image.mode}, size: {image.size}")
            
            # Convert to RGB if needed
            if image.mode != 'RGB':
                image = image.convert('RGB')
                print(f"Converted image to RGB mode")
            
            # Prepare messages for Gemma 3 multimodal API
            messages = [
                {
                    "role": "user",
                    "content": [
                        {"type": "image", "image": image},
                        {"type": "text", "text": "Przeanalizuj to pomieszczenie i napisz krótki komentarz.\n\nTYP: [kuchnia/pokój dzienny/sypialnia/łazienka/biuro/puste pomieszczenie]\nKOMENTARZ: [maksymalnie 2 krótkie zdania, naturalne, bez ozdóbek]"}
                    ]
                }
            ]
            
            # Apply chat template and process inputs
            inputs = self.processor.apply_chat_template(
                messages, 
                add_generation_prompt=True, 
                tokenize=True,
                return_dict=True, 
                return_tensors="pt"
            ).to(self.model.device)
            
            # Generate response with optimized parameters for speed
            generation_start = time.time()
            print("Starting Gemma 3 4B-IT inference...")
            
            input_len = inputs["input_ids"].shape[-1]
            
            with torch.no_grad():
                generation = self.model.generate(
                    **inputs,
                    max_new_tokens=80,
                    do_sample=False,  # Greedy decoding for speed
                    temperature=0.1,
                    top_p=0.4
                )
                generation = generation[0][input_len:]
            
            # Decode response
            response = self.processor.decode(generation, skip_special_tokens=True)
            
            generation_time = time.time() - generation_start
            print(f"Gemma 3 4B-IT inference completed in {generation_time:.2f}s")
            print(f"Gemma 3 4B-IT response: {response}")
            
            # Parse response
            lines = response.strip().split('\n')
            room_type = "living_room"  # default
            comment = "Świetne pomieszczenie! Widzę tutaj ogromny potencjał na stworzenie wspaniałej przestrzeni."
            
            print(f"Parsing {len(lines)} lines from response")
            for i, line in enumerate(lines):
                line = line.strip()
                print(f"Line {i}: '{line}'")
                if line.startswith("TYP:"):
                    room_type_raw = line.replace("TYP:", "").strip().lower()
                    print(f"Found room type: {room_type_raw}")
                    # Map Polish room types to internal format
                    room_mapping = {
                        "kuchnia": "kitchen",
                        "pokój dzienny": "living_room",
                        "pokoj dzienny": "living_room", 
                        "sypialnia": "bedroom",
                        "łazienka": "bathroom",
                        "lazienka": "bathroom",
                        "biuro": "office",
                        "puste pomieszczenie": "empty_room"
                    }
                    room_type = room_mapping.get(room_type_raw, "living_room")
                    print(f"Mapped room type: {room_type}")
                elif line.startswith("KOMENTARZ:"):
                    comment = line.replace("KOMENTARZ:", "").strip()
                    print(f"Found comment: {comment}")
            
            # Generate human Polish comment using Gemma 3's excellent Polish capabilities
            human_comment = self._generate_human_comment(room_type, comment)
            
            total_time = time.time() - start_time
            result = {
                "detected_room_type": room_type,
                "confidence": 0.9,  # Gemma 3 is very reliable
                "room_description": f"Analiza pomieszczenia wykonana przez Gemma 3 4B-IT",
                "suggestions": [],
                "comment": comment,  # Polish comment from Gemma 3
                "human_comment": human_comment  # Human Polish comment from IDA
            }
            print(f"Total analysis time: {total_time:.2f}s")
            print(f"Returning result: {result}")
            return result
            
        except Exception as e:
            print(f"Gemma 3 error: {str(e)}")
            import traceback
            traceback.print_exc()
            
            # Fallback response - krótkie i naturalne
            fallback_comments = {
                "kitchen": "Świetna kuchnia! Dużo miejsca na gotowanie.",
                "living_room": "Przytulny pokój dzienny. Idealne miejsce na relaks.",
                "bedroom": "Spokojna sypialnia. Będzie się tu dobrze spało.",
                "bathroom": "Elegancka łazienka. Ma dobry potencjał.",
                "office": "Funkcjonalne biuro. Dobre miejsce do pracy.",
                "empty_room": "Puste pomieszczenie - czysta karta do aranżacji."
            }
            
            return {
                "detected_room_type": "living_room",
                "confidence": 0.5,
                "room_description": "Fallback analysis due to model error",
                "suggestions": [],
                "comment": fallback_comments.get("living_room", "Świetne pomieszczenie! Ma dobry potencjał."),
                "human_comment": "O, widzę że dzisiaj będziemy aranżować wspólnie to wnętrze! Mam już kilka pomysłów."
            }
    
    def _generate_human_comment(self, room_type: str, polish_comment: str) -> str:
        """Generate lightweight human-style comment without extra GPU usage."""
        room_templates = {
            "kitchen": "O, widzę że dziś zajmiemy się Twoją kuchnią!",
            "living_room": "Świetnie! Ten salon ma ogromny potencjał.",
            "bedroom": "Uwielbiam taką sypialnię – możemy z niej wyczarować prawdziwą strefę relaksu.",
            "bathroom": "Ta łazienka już teraz wygląda obiecująco!",
            "office": "To biuro ma doskonałą bazę pod kreatywne zmiany.",
            "empty_room": "Puste pomieszczenie to najlepiej – możemy zaprojektować wszystko od zera!"
        }
        base = room_templates.get(room_type, "O, widzę że dzisiaj będziemy aranżować coś wyjątkowego!")
        tail = polish_comment.strip()
        if tail:
            return f"{base} {tail}"
        return base
    
    @modal.method()
    def analyze_inspiration(self, image_bytes: bytes) -> dict:
        """Analyze inspiration image and extract design elements using Gemma 3 4B-IT"""
        import time
        start_time = time.time()
        
        try:
            print(f"Starting inspiration analysis... Image size: {len(image_bytes)} bytes")
            
            # Load and process image
            image_start = time.time()
            image = Image.open(BytesIO(image_bytes))
            print(f"Image loaded in {time.time() - image_start:.2f}s - mode: {image.mode}, size: {image.size}")
            
            # Convert to RGB if needed
            if image.mode != 'RGB':
                image = image.convert('RGB')
                print(f"Converted image to RGB mode")
            
            # Prepare messages for Gemma 3 multimodal API
            messages = [
                {
                    "role": "user",
                    "content": [
                        {"type": "image", "image": image},
                        {"type": "text", "text": """Przeanalizuj to zdjęcie wnętrza i wyciągnij kluczowe elementy designu.

STYLE: [scandinavian, modern, industrial, bohemian, minimalist, rustic, contemporary, traditional, mid-century, art-deco, etc.]
KOLORY: [warm neutrals, cool grays, earth tones, pastels, bold colors, monochrome, etc.]
MATERIAŁY: [wood, metal, glass, stone, fabric, leather, concrete, ceramic, etc.]
BIOPHILIA: [0-3 gdzie 0=brak roślin, 1=minimalne, 2=umiarkowane, 3=dużo roślin/natury]
OPIS: [krótki opis stylu i atmosfery w języku angielskim dla AI prompt]

Format odpowiedzi:
STYLE: [lista stylów oddzielonych przecinkami]
KOLORY: [lista kolorów oddzielonych przecinkami]  
MATERIAŁY: [lista materiałów oddzielonych przecinkami]
BIOPHILIA: [liczba 0-3]
OPIS: [krótki opis w języku angielskim]"""}
                    ]
                }
            ]
            
            # Apply chat template and process inputs
            inputs = self.processor.apply_chat_template(
                messages, 
                add_generation_prompt=True, 
                tokenize=True,
                return_dict=True, 
                return_tensors="pt"
            ).to(self.model.device)
            
            # Generate response with optimized parameters for speed
            generation_start = time.time()
            print("Starting Gemma 3 4B-IT inference for inspiration analysis...")
            
            input_len = inputs["input_ids"].shape[-1]
            
            with torch.no_grad():
                generation = self.model.generate(
                    **inputs,
                    max_new_tokens=120,
                    do_sample=False,  # Greedy decoding for speed
                    temperature=0.1,
                    top_p=0.8,
                    pad_token_id=self.processor.tokenizer.eos_token_id
                )
                generation = generation[0][input_len:]
            
            # Decode response
            response = self.processor.decode(generation, skip_special_tokens=True).strip()
            print(f"Gemma 3 response: {response}")
            
            # Parse response
            styles = []
            colors = []
            materials = []
            biophilia = 1
            description = "Interior design inspiration"
            
            for line in response.split('\n'):
                line = line.strip()
                if line.startswith("STYLE:"):
                    styles_raw = line.replace("STYLE:", "").strip()
                    styles = [s.strip() for s in styles_raw.split(',') if s.strip()]
                elif line.startswith("KOLORY:"):
                    colors_raw = line.replace("KOLORY:", "").strip()
                    colors = [c.strip() for c in colors_raw.split(',') if c.strip()]
                elif line.startswith("MATERIAŁY:"):
                    materials_raw = line.replace("MATERIAŁY:", "").strip()
                    materials = [m.strip() for m in materials_raw.split(',') if m.strip()]
                elif line.startswith("BIOPHILIA:"):
                    biophilia_raw = line.replace("BIOPHILIA:", "").strip()
                    try:
                        biophilia = max(0, min(3, int(biophilia_raw)))
                    except:
                        biophilia = 1
                elif line.startswith("OPIS:"):
                    description = line.replace("OPIS:", "").strip()
            
            # Fallback values if parsing failed
            if not styles:
                styles = ["modern"]
            if not colors:
                colors = ["neutral"]
            if not materials:
                materials = ["wood"]
            
            total_time = time.time() - start_time
            result = {
                "styles": styles,
                "colors": colors,
                "materials": materials,
                "biophilia": biophilia,
                "description": description
            }
            print(f"Total inspiration analysis time: {total_time:.2f}s")
            print(f"Returning result: {result}")
            return result
            
        except Exception as e:
            print(f"Gemma 3 inspiration analysis error: {str(e)}")
            import traceback
            traceback.print_exc()
            
            # Fallback response
            return {
                "styles": ["modern"],
                "colors": ["neutral"],
                "materials": ["wood"],
                "biophilia": 1,
                "description": "Modern interior design inspiration"
            }

# Initialize model instances
flux_model = Flux2Model()
gemma3_vision_model = Gemma3VisionModel()

def build_prompt(request: GenerationRequest) -> str:
    """Build comprehensive prompt from user preferences"""
    # Use the prompt directly from frontend - it's already comprehensive
    full_prompt = request.prompt
    return full_prompt

@app.function(
    image=image,
    timeout=600,  # 10 minutes timeout
    secrets=[modal.Secret.from_name("huggingface-secret-new")],
)
@modal.fastapi_endpoint(method="OPTIONS", label="aura-flux-api")
def generate_images_options():
    """Handle CORS preflight requests"""
    from fastapi import Response
    return Response(
        content="",
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Max-Age": "3600"
        }
    )

@app.function(
    image=image,
    timeout=600,  # 10 minutes timeout
    secrets=[modal.Secret.from_name("huggingface-secret-new")],
)
@modal.fastapi_endpoint(method="POST", label="aura-flux-api")
def generate_images_endpoint(request: GenerationRequest):
    """Generate images endpoint with CORS support"""
    from fastapi import Response
    import json
    try:
        print(f"[ENDPOINT DEBUG] Received generation request: {request.prompt[:100]}...")
        print(f"[ENDPOINT DEBUG] Request object: image_size={request.image_size}, width={request.width}, height={request.height}, steps={request.steps}, num_inference_steps={request.num_inference_steps}, guidance={request.guidance}, guidance_scale={request.guidance_scale}")
        
        if not request.base_image:
            raise HTTPException(status_code=400, detail="FLUX 2 requires a base_image for image-to-image editing")
        
        # Build comprehensive prompt
        full_prompt = build_prompt(request)
        
        # Decode base64 image to bytes
        image_bytes = decode_base64_image(request.base_image)
        print(f"Decoded base image: {len(image_bytes)} bytes")
        
        # Decode inspiration images if provided (for multi-reference)
        inspiration_images_bytes = None
        if request.inspiration_images and len(request.inspiration_images) > 0:
            inspiration_images_bytes = []
            for i, insp_b64 in enumerate(request.inspiration_images[:6]):  # Limit to 6 for FLUX.2 [dev]
                try:
                    insp_bytes = decode_base64_image(insp_b64)
                    inspiration_images_bytes.append(insp_bytes)
                    print(f"Decoded inspiration image {i+1}, size: {len(insp_bytes)} bytes")
                except Exception as e:
                    print(f"Failed to decode inspiration image {i+1}: {e}")
                    # Continue with other images
            print(f"Decoded {len(inspiration_images_bytes)} inspiration images for multi-reference")
        
        # CRITICAL: Pass image_size, steps, and guidance to the model
        # Resolve aliases: steps/num_inference_steps, guidance/guidance_scale
        actual_steps = request.steps if request.steps is not None else request.num_inference_steps
        actual_guidance = request.guidance if request.guidance is not None else request.guidance_scale
        
        # CRITICAL: ALWAYS default to 512 for preview mode if image_size is not explicitly provided
        # This ensures preview images are generated at 512x512, not 1024x1024
        if request.image_size is not None and request.image_size > 0:
            actual_image_size = request.image_size
        else:
            # FORCE 512 for preview mode - this is the critical fix
            actual_image_size = 512
        print(f"[ENDPOINT] Final resolved params: image_size={actual_image_size} (from request: {request.image_size}), steps={actual_steps}, guidance={actual_guidance}")
        print(f"[ENDPOINT] Creating GenerationRequest with image_size={actual_image_size} (FORCED to 512 if None)")
        
        # Generate images in image-to-image mode with optional multi-reference
        # CRITICAL: Modal may lose fields during Pydantic serialization, so we use model_dump() and recreate
        # This ensures all fields including image_size are preserved
        request_dict = {
            "prompt": full_prompt,
            "base_image": request.base_image,
            "inspiration_images": request.inspiration_images,
            "negative_prompt": request.negative_prompt,
            "num_images": request.num_images,
            "guidance_scale": actual_guidance,
            "guidance": request.guidance,
            "num_inference_steps": actual_steps,
            "steps": request.steps,
            "image_size": actual_image_size,  # CRITICAL: Explicitly set image_size
            "width": request.width,
            "height": request.height,
            "seed": request.seed,
        }
        print(f"[ENDPOINT] Request dict: image_size={request_dict['image_size']}, steps={request_dict['steps']}, guidance={request_dict.get('guidance')}")
        
        # Recreate GenerationRequest from dict to ensure all fields are set
        new_request = GenerationRequest(**request_dict)
        # CRITICAL: ALWAYS set image_size to actual_image_size using model_copy
        # This ensures Modal serializes the correct value, regardless of what was in the original request
        # FORCE image_size to 512 if it's None or 0 (preview mode)
        final_image_size = actual_image_size if actual_image_size > 0 else 512
        new_request = new_request.model_copy(update={"image_size": final_image_size})
        print(f"[ENDPOINT] Created request object: image_size={new_request.image_size}, steps={new_request.steps}, guidance={new_request.guidance}")
        print(f"[ENDPOINT] Request model_dump: image_size={new_request.model_dump().get('image_size')}")
        print(f"[ENDPOINT] About to call generate_images.remote with image_size_override={final_image_size} (type: {type(final_image_size)})")
        print(f"[ENDPOINT] CRITICAL: new_request.image_size is now: {new_request.image_size} (FORCED to {final_image_size})")
        
        result = flux_model.generate_images.remote(
            new_request,
            image_bytes,  # Pass the decoded bytes
            inspiration_images_bytes,  # Pass inspiration images bytes
            image_size_override=actual_image_size  # CRITICAL: Pass image_size separately to avoid Modal serialization issues
        )
        print(f"[ENDPOINT] generate_images.remote call completed")
        
        response_data = GenerationResponse(
            images=result["images"],
            generation_info=result["generation_info"],
            cost_estimate=result["cost_estimate"]
        )
        
        # Add CORS headers - return Pydantic model directly, Modal will serialize it
        # We'll use a custom response to add headers
        response_dict = response_data.model_dump()
        
        response = Response(
            content=json.dumps(response_dict),
            media_type="application/json",
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
                "Access-Control-Max-Age": "3600"
            }
        )
        
        return response
        
    except HTTPException as e:
        print(f"HTTP Error in generate_images_endpoint: {str(e)}")
        from fastapi import Response
        import json
        error_response = Response(
            content=json.dumps({"detail": str(e.detail)}),
            media_type="application/json",
            status_code=e.status_code,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization"
            }
        )
        return error_response
    except Exception as e:
        print(f"Error in generate_images_endpoint: {str(e)}")
        from fastapi import Response
        import json
        error_response = Response(
            content=json.dumps({"detail": str(e)}),
            media_type="application/json",
            status_code=500,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization"
            }
        )
        return error_response

# FastAPI app for additional endpoints
web_app = FastAPI(title="Aura FLUX API", version="1.0.0")

# CORS configuration
web_app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001", 
        "http://localhost:3002",
        "http://localhost:3003",
        "https://aura-design.vercel.app",
        "https://aura-design-git-main-akademiasztuki.vercel.app",
        "https://www.project-ida.com",
        "https://project-ida.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.function(
    image=image,
    timeout=600,
    secrets=[modal.Secret.from_name("huggingface-secret-new")],
)
@modal.asgi_app()
def fastapi_app():
    """FastAPI app for additional endpoints"""
    return web_app

@web_app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Aura FLUX API", "status": "running", "model": "flux-2-dev"}

@app.function(
    image=image,
    timeout=60,
    secrets=[modal.Secret.from_name("huggingface-secret-new")],
)
@modal.fastapi_endpoint(method="GET", label="aura-flux-api")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model": "flux-2-dev",
        "vision_model": "gemma-3-4b-it",
        "legacy_models": "minicpm-o-2.6 (commented out), florence-2 (hidden but available)"
    }

@web_app.get("/health")
async def health_check_web():
    """Health check endpoint for web app"""
    return {
        "status": "healthy",
        "model": "flux-2-dev",
        "vision_model": "gemma-3-4b-it",
        "legacy_models": "minicpm-o-2.6 (commented out), florence-2 (hidden but available)"
    }

@web_app.post("/generate", response_model=GenerationResponse)
async def generate_images(request: GenerationRequest):
    """Generate images endpoint - DUPLICATE of modal.fastapi_endpoint, kept for compatibility"""
    try:
        print(f"[ENDPOINT DEBUG] Received generation request: {request.prompt[:100]}...")
        print(f"[ENDPOINT DEBUG] Request: image_size={request.image_size}, width={request.width}, height={request.height}, steps={request.steps}, guidance={request.guidance}")
        
        if not request.base_image:
            raise HTTPException(status_code=400, detail="FLUX 2 requires a base_image for image-to-image editing")
        
        # Build comprehensive prompt
        full_prompt = build_prompt(request)
        
        # Decode base64 image to bytes
        image_bytes = decode_base64_image(request.base_image)
        print(f"Decoded base image: {len(image_bytes)} bytes")
        
        # Decode inspiration images if provided (for multi-reference)
        inspiration_images_bytes = None
        if request.inspiration_images and len(request.inspiration_images) > 0:
            inspiration_images_bytes = []
            for i, insp_b64 in enumerate(request.inspiration_images[:6]):  # Limit to 6 for FLUX.2 [dev]
                try:
                    insp_bytes = decode_base64_image(insp_b64)
                    inspiration_images_bytes.append(insp_bytes)
                    print(f"Decoded inspiration image {i+1}, size: {len(insp_bytes)} bytes")
                except Exception as e:
                    print(f"Failed to decode inspiration image {i+1}: {e}")
            print(f"Decoded {len(inspiration_images_bytes)} inspiration images for multi-reference")
        
        # CRITICAL: Resolve parameters and ensure image_size is set
        actual_steps = request.steps if request.steps is not None else request.num_inference_steps
        actual_guidance = request.guidance if request.guidance is not None else request.guidance_scale
        actual_image_size = request.image_size if request.image_size is not None and request.image_size > 0 else 512
        print(f"[ENDPOINT] Resolved: image_size={actual_image_size} (from request: {request.image_size}), steps={actual_steps}, guidance={actual_guidance}")
        print(f"[ENDPOINT] About to call generate_images.remote with image_size_override={actual_image_size} (type: {type(actual_image_size)})")
        
        # Generate images in image-to-image mode with optional multi-reference
        result = flux_model.generate_images.remote(
            GenerationRequest(
                prompt=full_prompt,
                base_image=request.base_image,
                inspiration_images=request.inspiration_images,
                negative_prompt=request.negative_prompt,
                num_images=request.num_images,
                guidance_scale=actual_guidance,
                guidance=request.guidance,
                num_inference_steps=actual_steps,
                steps=request.steps,
                image_size=actual_image_size,  # CRITICAL: Pass image_size!
                width=request.width,
                height=request.height,
                seed=request.seed,
            ),
            image_bytes,
            inspiration_images_bytes,
            image_size_override=actual_image_size  # CRITICAL: Pass image_size separately to avoid Modal serialization issues
        )
        print(f"[ENDPOINT] generate_images.remote call completed")
        
        return GenerationResponse(
            images=result["images"],
            generation_info=result["generation_info"],
            cost_estimate=result["cost_estimate"]
        )
        
    except Exception as e:
        print(f"Error in generate_images: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Gemma 3 4B-IT Endpoints - ACTIVE
@web_app.post("/analyze-room", response_model=RoomAnalysisResponse)
async def analyze_room(request: RoomAnalysisRequest):
    """Analyze room type and characteristics from uploaded image using Gemma 3 4B-IT"""
    try:
        print("Received room analysis request")

        metadata_dict = request.metadata.dict() if request.metadata else {}
        session_id = metadata_dict.get("session_id")
        _check_room_analysis_quota(session_id)
        
        # Decode base64 image
        image_bytes = decode_base64_image(request.image)
        print(f"Image decoded, size: {len(image_bytes)} bytes")
        
        image_hash = hashlib.sha256(image_bytes).hexdigest()
        metadata_dict["image_hash"] = image_hash
        print(
            f"[ROOM_ANALYSIS] hash={image_hash[:16]} size={len(image_bytes)} source={metadata_dict.get('source')} "
            f"session={session_id} cache_key={metadata_dict.get('cache_key')} request_id={metadata_dict.get('request_id')}"
        )
        
        # Analyze room using Gemma 3 4B-IT with timeout
        import asyncio
        result = await asyncio.wait_for(
            gemma3_vision_model.analyze_room_and_comment.remote.aio(image_bytes),
            timeout=300.0  # 5 minute timeout (T4 is slower, cold start can take longer)
        )
        
        return RoomAnalysisResponse(
            detected_room_type=result["detected_room_type"],
            confidence=result["confidence"],
            room_description=result["room_description"],
            suggestions=result["suggestions"],
            comment=result["comment"],
            human_comment=result["human_comment"]
        )
        
    except asyncio.TimeoutError:
        print("Room analysis timed out after 3 minutes")
        raise HTTPException(status_code=408, detail="Analysis timed out - model may still be loading (cold start)")
    except HTTPException as http_exc:
        print(f"Room analysis quota or client error: {http_exc.detail}")
        raise http_exc
    except Exception as e:
        print(f"API error occurred: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@web_app.options("/analyze-room")
async def analyze_room_options():
    """Handle preflight request for room analysis"""
    return {"message": "OK"}

@web_app.post("/llm-comment", response_model=LLMCommentResponse)
async def generate_llm_comment(request: LLMCommentRequest):
    """Generate intelligent comment using Gemma 3 4B-IT (for generated images)"""
    try:
        print(f"Generating LLM comment for room type: {request.room_type}")
        
        groq_comment = _call_groq_for_comment(request.room_type, request.room_description, request.context)
        if groq_comment:
            return LLMCommentResponse(comment=groq_comment, suggestions=[])
        
        # For generated images, we don't have the actual image, so we generate a comment based on room type
        # This is a simplified version - in the future we could pass the generated image back to Gemma 3 4B-IT
        
        fallback_comments = {
            "kitchen": "Świetnie! Ta wygenerowana kuchnia wygląda naprawdę fantastycznie! Widzę idealne miejsce do gotowania i spotkań rodzinnych.",
            "living_room": "Świetnie! Ten pokój dzienny ma naprawdę przytulną atmosferę. Idealne miejsce na relaks i spędzanie czasu z bliskimi.",
            "bedroom": "Uwielbiam tę sypialnię! Wygląda na bardzo komfortowe i spokojne miejsce do wypoczynku.",
            "bathroom": "Ta łazienka ma naprawdę elegancki styl! Idealne miejsce na relaks i regenerację.",
            "office": "Fantastyczne biuro! Widzę tu idealne warunki do pracy i kreatywności.",
            "empty_room": "Świetnie! To puste pomieszczenie ma naprawdę duży potencjał - możemy stworzyć tu coś wyjątkowego!"
        }
        
        return LLMCommentResponse(
            comment=fallback_comments.get(request.room_type, "Świetnie! To wygenerowane wnętrze wygląda naprawdę fantastycznie!"),
            suggestions=[]
        )
        
    except Exception as e:
        print(f"LLM comment generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate LLM comment: {str(e)}")

@web_app.options("/llm-comment")
async def llm_comment_options():
    """Handle preflight request for LLM comment"""
    return {"message": "OK"}

@web_app.post("/analyze-inspiration", response_model=InspirationAnalysisResponse)
async def analyze_inspiration(request: InspirationAnalysisRequest):
    """Analyze inspiration image and extract design elements using Gemma 3 4B-IT"""
    try:
        print("Received inspiration analysis request")
        
        # Decode base64 image
        image_bytes = decode_base64_image(request.image)
        print(f"Image decoded, size: {len(image_bytes)} bytes")
        
        # Analyze inspiration using Gemma 3 4B-IT with timeout
        import asyncio
        result = await asyncio.wait_for(
            gemma3_vision_model.analyze_inspiration.remote.aio(image_bytes),
            timeout=300.0  # 5 minute timeout (T4 is slower, cold start can take longer)
        )
        
        return InspirationAnalysisResponse(
            styles=result["styles"],
            colors=result["colors"],
            materials=result["materials"],
            biophilia=result["biophilia"],
            description=result["description"]
        )
        
    except asyncio.TimeoutError:
        print("Inspiration analysis timed out after 3 minutes")
        raise HTTPException(status_code=408, detail="Analysis timed out - model may still be loading (cold start)")
    except Exception as e:
        print(f"API error occurred: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@web_app.options("/analyze-inspiration")
async def analyze_inspiration_options():
    """Handle preflight request for inspiration analysis"""
    return {"message": "OK"}

# =========================================
# PROMPT REFINEMENT (for prompt synthesis)
# =========================================

class PromptRefinementRequest(BaseModel):
    prompt: str
    target_tokens: int = 65
    instructions: List[str] = []

class PromptRefinementResponse(BaseModel):
    refined_prompt: str
    original_tokens: int
    refined_tokens: int
    improvement: str

@web_app.post("/refine-prompt", response_model=PromptRefinementResponse)
async def refine_prompt(request: PromptRefinementRequest):
    """
    Refine FLUX prompt using lightweight LLM
    
    Purpose:
    - Condense verbose template prompts
    - Remove redundancy
    - Keep token count under 65 (CLIP optimal)
    - Maintain semantic meaning
    """
    try:
        print(f"Refining prompt (length: {len(request.prompt)} chars)")
        
        original_tokens = len(request.prompt.split())
        print(f"Original tokens: {original_tokens}")
        
        # If already short enough, return as-is
        if original_tokens <= request.target_tokens:
            return PromptRefinementResponse(
                refined_prompt=request.prompt,
                original_tokens=original_tokens,
                refined_tokens=original_tokens,
                improvement="Already optimal"
            )
        
        # Simple rule-based refinement (no LLM needed for basic cases)
        refined = request.prompt
        
        # Remove redundant words
        redundant_phrases = [
            ("featuring a ", "with "),
            ("that has ", "with "),
            ("which includes ", "including "),
            (", and also ", ", "),
            ("very ", ""),
            ("really ", ""),
            ("quite ", "")
        ]
        
        for old, new in redundant_phrases:
            refined = refined.replace(old, new)
        
        # Remove double spaces
        refined = ' '.join(refined.split())
        
        refined_tokens = len(refined.split())
        print(f"Refined tokens: {refined_tokens}")
        
        # If still too long, use more aggressive truncation
        if refined_tokens > request.target_tokens:
            words = refined.split()
            refined = ' '.join(words[:request.target_tokens])
            refined_tokens = request.target_tokens
        
        return PromptRefinementResponse(
            refined_prompt=refined,
            original_tokens=original_tokens,
            refined_tokens=refined_tokens,
            improvement=f"Reduced by {original_tokens - refined_tokens} tokens"
        )
        
    except Exception as e:
        print(f"Prompt refinement error: {str(e)}")
        # Fallback: return original
        return PromptRefinementResponse(
            refined_prompt=request.prompt,
            original_tokens=len(request.prompt.split()),
            refined_tokens=len(request.prompt.split()),
            improvement="Error, returned original"
        )

@web_app.options("/refine-prompt")
async def refine_prompt_options():
    """Handle preflight request for prompt refinement"""
    return {"message": "OK"}
