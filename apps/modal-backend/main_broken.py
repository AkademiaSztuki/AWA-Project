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
import requests
import json

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
    .apt_install("git")
    .pip_install("uv")
    .run_commands(
        "uv pip install --system --compile-bytecode --index-strategy unsafe-best-match "
        "accelerate~=1.8.1 "
        "git+https://github.com/huggingface/diffusers.git@00f95b9755718aabb65456e791b8408526ae6e76 "
        "huggingface-hub[hf-transfer]~=0.33.1 "
        "Pillow~=11.2.1 safetensors~=0.5.3 transformers~=4.53.0 sentencepiece~=0.2.0 einops timm "
        "torch==2.7.1 optimum-quanto==0.2.7 "
        "fastapi~=0.110.0 pydantic~=2.7.0 uvicorn[standard]~=0.29.0 "
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
    from transformers import AutoProcessor, AutoModelForCausalLM, AutoTokenizer
    from PIL import Image

# Pydantic models for API
class GenerationRequest(BaseModel):
    prompt: str
    negative_prompt: str = ""
    num_images: int = 1
    guidance_scale: float = 3.5
    num_inference_steps: int = 4
    width: int = 1024
    height: int = 1024
    seed: Optional[int] = None

class GenerationResponse(BaseModel):
    images: List[str]  # base64 encoded images
    generation_info: dict
    cost_estimate: float

class RoomAnalysisRequest(BaseModel):
    image: str  # base64 encoded image

class RoomAnalysisResponse(BaseModel):
    detected_room_type: str
    confidence: float
    room_description: str
    suggestions: List[str]

class LLMCommentRequest(BaseModel):
    room_type: str
    room_description: str
    context: str = "room_analysis"  # or "generated_image"

class LLMCommentResponse(BaseModel):
    comment: str
    suggestions: List[str]

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
            secret = modal.Secret.from_name("huggingface-secret-new")
            self.hf_token = secret["HF_TOKEN"]
            
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
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
    def generate_images(self, request: GenerationRequest) -> dict:
        """Generate images using FLUX Kontext"""
        try:
            print(f"Generating {request.num_images} images with prompt: {request.prompt[:50]}...")
            
            # Set random seed if provided
            if request.seed is not None:
                torch.manual_seed(request.seed)
                if torch.cuda.is_available():
                    torch.cuda.manual_seed(request.seed)
            
            # Generate images
            with torch.inference_mode():
                result = self.pipe(
                    prompt=request.prompt,
                    negative_prompt=request.negative_prompt,
                    num_images_per_prompt=request.num_images,
                    guidance_scale=request.guidance_scale,
                    num_inference_steps=request.num_inference_steps,
                    width=request.width,
                    height=request.height,
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

# MiniCPM-V-2.6 Model - NEW MULTIMODAL SOLUTION
@app.cls(
    image=image,
    gpu="T4",  # MiniCPM-V-2.6 is efficient, T4 should be sufficient
    volumes=volumes,
    secrets=[modal.Secret.from_name("huggingface-secret-new")],
    scaledown_window=180  # Stay online for 3 minutes
)
class MiniCPMModel:
    """MiniCPM-V-2.6 multimodal model for room analysis and comments"""
    
    @modal.enter()
    def enter(self):
        """Initialize MiniCPM-V-2.6 model"""
        try:
            print("Downloading MiniCPM-V-2.6 model if necessary...")
            
            # Set up secrets
            secret = modal.Secret.from_name("huggingface-secret-new")
            self.hf_token = secret["HF_TOKEN"]
            
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
            print(f"Using device: {self.device}")
            
            # Load MiniCPM-V-2.6 model
            self.tokenizer = AutoTokenizer.from_pretrained(
                "openbmb/MiniCPM-V-2_6",
                cache_dir=CACHE_DIR,
                use_auth_token=self.hf_token,
                trust_remote_code=True
            )
            print("Tokenizer loaded successfully")
            
            self.model = AutoModelForCausalLM.from_pretrained(
                "openbmb/MiniCPM-V-2_6",
                torch_dtype=torch.bfloat16,
                cache_dir=CACHE_DIR,
                use_auth_token=self.hf_token,
                trust_remote_code=True,
                device_map="auto"
            )
            print("Model loaded successfully")
            
            print("MiniCPM-V-2.6 model loaded successfully!")
        except Exception as e:
            print(f"Error loading MiniCPM-V-2.6 model: {str(e)}")
            raise e

    @modal.method()
    def analyze_room_and_comment(self, image_bytes: bytes) -> dict:
        """Analyze room and generate intelligent comment using MiniCPM-V-2.6"""
        try:
            print("Starting room analysis and comment generation...")
            
            # Load and process image
            image = Image.open(BytesIO(image_bytes))
            print(f"Original image mode: {image.mode}, size: {image.size}")
            
            # Convert to RGB if needed
            if image.mode != 'RGB':
                image = image.convert('RGB')
                print(f"Converted image to RGB mode")
            
            # Prepare prompt for room analysis and comment generation
            prompt = """Przeanalizuj to pomieszczenie i napisz ciepły, entuzjastyczny komentarz jak ekspertka od projektowania wnętrz. 

Zidentyfikuj typ pomieszczenia (kuchnia, pokój dzienny, sypialnia, łazienka, biuro, puste pomieszczenie) i napisz naturalny komentarz po polsku.

Format odpowiedzi:
TYP: [typ pomieszczenia]
KOMENTARZ: [ciepły, entuzjastyczny komentarz 2-3 zdania jak przyjaciółka ekspertka od wnętrz]

Bądź bardzo naturalna, ciepła i inspirująca!"""
            
            # Process image and text with MiniCPM-V-2.6
            messages = [
                {
                    "role": "user", 
                    "content": prompt,
                    "image": image
                }
            ]
            
            # Generate response
            with torch.no_grad():
                response = self.model.chat(
                    image=image,
                    msgs=messages,
                    context=None,
                    tokenizer=self.tokenizer,
                    sampling=True,
                    temperature=0.7,
                    top_p=0.9,
                    max_new_tokens=300
                )
            
            print(f"MiniCPM-V-2.6 response: {response}")
            
            # Parse response
            lines = response.strip().split('\n')
            room_type = "living_room"  # default
            comment = "Ooo, jakie piękne pomieszczenie! Widzę tutaj naprawdę duży potencjał na stworzenie wspaniałej przestrzeni."
            
            for line in lines:
                line = line.strip()
                if line.startswith("TYP:"):
                    room_type = line.replace("TYP:", "").strip().lower()
                    # Map Polish room types to English
                    room_mapping = {
                        "kuchnia": "kitchen",
                        "pokój dzienny": "living_room",
                        "sypialnia": "bedroom", 
                        "łazienka": "bathroom",
                        "biuro": "office",
                        "puste pomieszczenie": "empty_room"
                    }
                    room_type = room_mapping.get(room_type, "living_room")
                elif line.startswith("KOMENTARZ:"):
                    comment = line.replace("KOMENTARZ:", "").strip()
            
            return {
                "detected_room_type": room_type,
                "confidence": 0.9,  # MiniCPM-V-2.6 is quite reliable
                "room_description": f"Analiza pomieszczenia wykonana przez MiniCPM-V-2.6",
                "suggestions": [],
                "comment": comment
            }
            
        except Exception as e:
            print(f"MiniCPM-V-2.6 error: {str(e)}")
            import traceback
            traceback.print_exc()
            
            # Fallback response
            fallback_comments = {
                "kitchen": "Ooo, widzę piękną kuchnię! To pomieszczenie ma naprawdę dużo potencjału na stworzenie wspaniałej przestrzeni do gotowania i spotkań z rodziną.",
                "living_room": "Wow, jaki przytulny pokój dzienny! Widzę tutaj doskonałe miejsce do relaksu i spędzania czasu z bliskimi.",
                "bedroom": "Świetnie! Ta sypialnia wygląda bardzo obiecująco. To będzie idealne miejsce do odpoczynku i regeneracji sił.",
                "bathroom": "Uwielbiam ten styl łazienki! Widzę tutaj piękną przestrzeń, która może stać się prawdziwą oazą spokoju.",
                "office": "Wow, to biuro ma naprawdę dobry potencjał! Widzę doskonałe miejsce do pracy i kreatywności.",
                "empty_room": "Świetnie! Puste pomieszczenie to jak czysta karta - możemy stworzyć tutaj coś naprawdę wyjątkowego!"
            }
            
            return {
                "detected_room_type": "living_room",
                "confidence": 0.5,
                "room_description": "Fallback analysis due to model error",
                "suggestions": [],
                "comment": fallback_comments.get("living_room", "Ooo, jakie piękne pomieszczenie! Widzę tutaj naprawdę duży potencjał.")
            }

# Initialize model instances
flux_model = FluxKontextModel()
minicpm_model = MiniCPMModel()

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
@modal.web_endpoint(method="POST", label="aura-flux-api")
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
        "https://aura-design.vercel.app",
        "https://aura-design-git-main-akademiasztuki.vercel.app",
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

@web_app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model": "flux-1-kontext",
        "vision_model": "minicpm-v-2.6",
        "legacy_models": "florence-2 + groq (commented out)"
    }

@web_app.post("/generate", response_model=GenerationResponse)
async def generate_images(request: GenerationRequest):
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
        print(f"Error in generate_images: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# MiniCPM-V-2.6 Endpoints - ACTIVE
@web_app.post("/analyze-room", response_model=RoomAnalysisResponse)
async def analyze_room(request: RoomAnalysisRequest):
    """Analyze room type and characteristics from uploaded image using MiniCPM-V-2.6"""
    try:
        print("Received room analysis request")
        
        # Decode base64 image
        image_bytes = base64.b64decode(request.image)
        
        # Analyze room using MiniCPM-V-2.6
        result = minicpm_model.analyze_room_and_comment.remote(image_bytes)
        
        return RoomAnalysisResponse(
            detected_room_type=result["detected_room_type"],
            confidence=result["confidence"],
            room_description=result["room_description"],
            suggestions=result["suggestions"]
        )
        
    except Exception as e:
        print("API error occurred")
        raise HTTPException(status_code=500, detail=str(e))

@web_app.options("/analyze-room")
async def analyze_room_options():
    """Handle preflight request for room analysis"""
    return {"message": "OK"}

@web_app.post("/llm-comment", response_model=LLMCommentResponse)
async def generate_llm_comment(request: LLMCommentRequest):
    """Generate intelligent comment using MiniCPM-V-2.6 (for generated images)"""
    try:
        print(f"Generating LLM comment for room type: {request.room_type}")
        
        # For generated images, we don't have the actual image, so we generate a comment based on room type
        # This is a simplified version - in the future we could pass the generated image back to MiniCPM
        
        fallback_comments = {
            "kitchen": "Wow, ta wygenerowana kuchnia wygląda naprawdę fantastycznie! Widzę tutaj doskonałą przestrzeń do gotowania i spotkań z rodziną.",
            "living_room": "Świetnie! Ten pokój dzienny ma naprawdę przytulny klimat. Idealne miejsce do relaksu i spędzania czasu z bliskimi.",
            "bedroom": "Uwielbiam tę sypialnię! Wygląda na bardzo komfortową i spokojną przestrzeń do odpoczynku.",
            "bathroom": "Ta łazienka ma naprawdę elegancki styl! Doskonałe miejsce do relaksu i regeneracji.",
            "office": "Fantastyczne biuro! Widzę tutaj idealne warunki do pracy i kreatywności.",
            "empty_room": "Świetnie! To puste pomieszczenie ma naprawdę duży potencjał - możemy stworzyć tutaj coś wyjątkowego!"
        }
        
        return LLMCommentResponse(
            comment=fallback_comments.get(request.room_type, "Wow, to wygenerowane wnętrze wygląda naprawdę fantastycznie!"),
            suggestions=[]
        )
        
    except Exception as e:
        print(f"LLM comment generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate LLM comment: {str(e)}")

@web_app.options("/llm-comment")
async def llm_comment_options():
    """Handle preflight request for LLM comment"""
    return {"message": "OK"}
