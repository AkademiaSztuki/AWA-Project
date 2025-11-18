"""
Aura Modal Backend - FLUX 1 Kontext Integration
FastAPI endpoints for interior design image generation
Based on official Modal Flux Kontext example
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

# Modal configuration
app = modal.App("aura-flux-api")

# Model configuration - using official settings
MODEL_NAME = "black-forest-labs/FLUX.1-Kontext-dev"

# Image configuration
CACHE_DIR = "/cache"
volumes = {CACHE_DIR: modal.Volume.from_name("aura-flux-cache", create_if_missing=True)}

# Modal image with dependencies
image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("git", "ffmpeg", "libsndfile1")  # Added audio dependencies
    .pip_install("uv")
    .run_commands(
        "uv pip install --system --compile-bytecode --index-strategy unsafe-best-match "
        "accelerate~=1.8.1 "
        "git+https://github.com/huggingface/diffusers.git@00f95b9755718aabb65456e791b8408526ae6e76 "
        "huggingface-hub[hf-transfer]~=0.33.1 "
        "Pillow~=11.2.1 safetensors~=0.5.3 transformers>=4.50.0 sentencepiece~=0.2.0 einops timm "
        "torch==2.7.1 torchaudio==2.7.1 optimum-quanto==0.2.7 "
        "fastapi~=0.110.0 pydantic~=2.7.0 uvicorn[standard]~=0.29.0 "
        "soundfile librosa av librosa[display] "  # Added audio packages for MiniCPM-o-2.6
        "vector-quantize-pytorch vocos "  # Added TTS packages for MiniCPM-o-2.6
        "--extra-index-url https://download.pytorch.org/whl/cu128"
    )
    .env({
        "HF_HUB_ENABLE_HF_TRANSFER": "1",  # Allows faster model downloads
        "HF_HOME": "/cache",  # Fixed: use string literal instead of str(CACHE_DIR)
    })
)

# Import statements for Modal
with image.imports():
    import torch
    from diffusers import FluxKontextPipeline
    from diffusers.utils import load_image
    from transformers import AutoProcessor, AutoModelForCausalLM, AutoTokenizer
    from PIL import Image

# Pydantic models for API
class GenerationRequest(BaseModel):
    prompt: str
    base_image: Optional[str] = None  # base64 encoded input image for image-to-image
    negative_prompt: str = ""
    num_images: int = 1
    guidance_scale: float = 3.5
    num_inference_steps: int = 20
    width: int = 1024
    height: int = 1024
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
    gpu="H100",  # Changed from B200 to H100 as specified in your original code
    volumes=volumes,
    secrets=[modal.Secret.from_name("huggingface-secret-new")],
    scaledown_window=240  # Stay online for 4 minutes to avoid cold starts
)
class FluxKontextModel:
    @modal.enter()
    def enter(self):
        """Initialize FLUX Kontext model"""
        try:
            print("Downloading FLUX Kontext model if necessary...")
            
            # Set up secrets
            import os
            self.hf_token = os.environ["HF_NEWTOKEN"]
            
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
            self.seed = 42  # Default seed for consistency
            print(f"Using device: {self.device}")
            
            # Load model with official settings
            self.pipe = FluxKontextPipeline.from_pretrained(
                MODEL_NAME,
                torch_dtype=torch.bfloat16,
                cache_dir=CACHE_DIR,
                use_auth_token=self.hf_token,
            ).to(self.device)
            
            print("FLUX Kontext model loaded successfully!")
        except Exception as e:
            print(f"Error loading FLUX Kontext model: {str(e)}")
            raise e

    @modal.method()
    def generate_images(self, request: GenerationRequest, image_bytes: bytes = None) -> dict:
        """Generate images using FLUX Kontext - IMAGE-TO-IMAGE MODE"""
        try:
            print(f"Generating {request.num_images} images with prompt: {request.prompt[:50]}...")
            
            if not image_bytes:
                raise ValueError("FLUX Kontext requires a base image for image-to-image editing!")
            
            # Validate prompt length (CLIP limit is 77 tokens)
            prompt_tokens = len(request.prompt.split())
            print(f"[PROMPT] Token count: {prompt_tokens}")
            if prompt_tokens > 77:
                print(f"[WARNING] Prompt exceeds CLIP limit (77 tokens)! {prompt_tokens - 77} tokens will be truncated!")
                print(f"[WARNING] Truncated portion: {' '.join(request.prompt.split()[77:])}")
            elif prompt_tokens > 65:
                print(f"[WARNING] Prompt is long ({prompt_tokens} tokens). Recommended max: 65 tokens.")
            else:
                print(f"[OK] Prompt length OK ({prompt_tokens} tokens < 65 recommended)")
            
            # Load and resize the input image (following official example)
            # Use proper resolution for FLUX Kontext - minimum 1024px for good quality
            target_size = max(1024, min(request.width, request.height))
            init_image = Image.open(BytesIO(image_bytes)).convert('RGB').resize((target_size, target_size))
            print(f"Loaded base image, resized to: {init_image.size}")
            
            # Set random seed if provided
            if request.seed is not None:
                torch.manual_seed(request.seed)
                if torch.cuda.is_available():
                    torch.cuda.manual_seed(request.seed)
            else:
                # Use fixed seed for consistency
                self.seed = 42
                torch.manual_seed(self.seed)
                if torch.cuda.is_available():
                    torch.cuda.manual_seed(self.seed)
            
            # Generate images in IMAGE-TO-IMAGE mode (following official example)
            print("Running FLUX Kontext image-to-image inference...")
            with torch.inference_mode():
                result = self.pipe(
                    image=init_image,  # ← BASE IMAGE for editing
                    prompt=request.prompt,
                    guidance_scale=request.guidance_scale,
                    num_inference_steps=request.num_inference_steps,
                    output_type="pil",
                    generator=torch.Generator(device=self.device).manual_seed(self.seed),
                    num_images_per_prompt=request.num_images,
                )
            
            # Convert images to base64
            images_b64 = []
            for image in result.images:
                buffer = BytesIO()
                image.save(buffer, format="PNG")
                img_b64 = base64.b64encode(buffer.getvalue()).decode()
                images_b64.append(img_b64)
            
            # Calculate cost estimate (rough approximation)
            cost_estimate = request.num_images * 0.05  # $0.05 per image estimate
            
            return {
                "images": images_b64,
                "generation_info": {
                    "model": MODEL_NAME,
                    "prompt": request.prompt,
                    "negative_prompt": request.negative_prompt,
                    "num_images": request.num_images,
                    "guidance_scale": request.guidance_scale,
                    "num_inference_steps": request.num_inference_steps,
                    "width": request.width,
                    "height": request.height,
                    "seed": request.seed,
                },
                "cost_estimate": cost_estimate
            }
            
        except Exception as e:
            print(f"Error generating images: {str(e)}")
            raise e

# Gemma 3 4B-IT Model - MULTIMODAL MODEL WITH EXCELLENT POLISH SUPPORT
@app.cls(
    image=image,
    gpu="H100",  # Same H100 as FLUX - both models fit together (H100 has 80GB VRAM)
    volumes=volumes,
    secrets=[modal.Secret.from_name("huggingface-secret-new")],
    scaledown_window=180  # Scale down after 3 minutes of inactivity to save costs
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
flux_model = FluxKontextModel()
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
@modal.fastapi_endpoint(method="POST", label="aura-flux-api")
def generate_images_endpoint(request: GenerationRequest):
    """Generate images endpoint"""
    try:
        print(f"Received generation request: {request.prompt[:100]}...")
        
        # Build comprehensive prompt
        full_prompt = build_prompt(request)
        
        # Generate images
        result = flux_model.generate_images.remote(
            GenerationRequest(
                prompt=full_prompt,
                negative_prompt=request.negative_prompt,
                num_images=request.num_images,
                guidance_scale=request.guidance_scale,
                num_inference_steps=request.num_inference_steps,
                width=request.width,
                height=request.height,
                seed=request.seed,
            )
        )
        
        return GenerationResponse(
            images=result["images"],
            generation_info=result["generation_info"],
            cost_estimate=result["cost_estimate"]
        )
        
    except Exception as e:
        print(f"Error in generate_images_endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

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
    return {"message": "Aura FLUX API", "status": "running", "model": "flux-1-kontext"}

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
        "model": "flux-1-kontext",
        "vision_model": "gemma-3-4b-it",
        "legacy_models": "minicpm-o-2.6 (commented out), florence-2 (hidden but available)"
    }

@web_app.get("/health")
async def health_check_web():
    """Health check endpoint for web app"""
    return {
        "status": "healthy",
        "model": "flux-1-kontext",
        "vision_model": "gemma-3-4b-it",
        "legacy_models": "minicpm-o-2.6 (commented out), florence-2 (hidden but available)"
    }

@web_app.post("/generate", response_model=GenerationResponse)
async def generate_images(request: GenerationRequest):
    """Generate images endpoint"""
    try:
        print(f"Received generation request: {request.prompt[:100]}...")
        
        if not request.base_image:
            raise HTTPException(status_code=400, detail="FLUX Kontext requires a base_image for image-to-image editing")
        
        # Build comprehensive prompt
        full_prompt = build_prompt(request)
        
        # Decode base64 image to bytes
        image_bytes = base64.b64decode(request.base_image)
        print(f"Decoded base image: {len(image_bytes)} bytes")
        
        # Generate images in image-to-image mode
        result = flux_model.generate_images.remote(
            GenerationRequest(
                prompt=full_prompt,
                base_image=request.base_image,
                negative_prompt=request.negative_prompt,
                num_images=request.num_images,
                guidance_scale=request.guidance_scale,
                num_inference_steps=request.num_inference_steps,
                width=request.width,
                height=request.height,
                seed=request.seed,
            ),
            image_bytes  # Pass the decoded bytes
        )
        
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
        image_bytes = base64.b64decode(request.image)
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
            timeout=180.0  # 3 minute timeout (H100 cold start can take ~60-90s)
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
        image_bytes = base64.b64decode(request.image)
        print(f"Image decoded, size: {len(image_bytes)} bytes")
        
        # Analyze inspiration using Gemma 3 4B-IT with timeout
        import asyncio
        result = await asyncio.wait_for(
            gemma3_vision_model.analyze_inspiration.remote.aio(image_bytes),
            timeout=180.0  # 3 minute timeout (H100 cold start can take ~60-90s)
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
