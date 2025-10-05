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

# Import statements for Modal
with image.imports():
    import torch
    from diffusers import FluxKontextPipeline
    from transformers import AutoProcessor, AutoModelForCausalLM

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

# Florence-2 model for room analysis
# Florence-2 Model - COMMENTED OUT FOR NOW, AVAILABLE FOR FUTURE USE
# @app.cls(
#     image=image,
#     gpu="T4",  # Florence-2 is smaller, T4 is sufficient
#     volumes=volumes,
#     secrets=[modal.Secret.from_name("huggingface-secret-new"), modal.Secret.from_name("groq-secret")],
#     scaledown_window=180  # Stay online for 3 minutes
# )
# class Florence2Model:
#     @modal.enter()
#     def enter(self):
#         """Initialize Florence-2 model for room analysis"""
#         try:
#             print("Downloading Florence-2 model if necessary...")
#             
#             self.device = "cuda" if torch.cuda.is_available() else "cpu"
#             print(f"Using device: {self.device}")
#             
#             self.processor = AutoProcessor.from_pretrained(
#                 "microsoft/Florence-2-base",
#                 cache_dir="/cache",
#                 trust_remote_code=True
#             )
#             print("Processor loaded successfully")
#             
#             self.model = AutoModelForCausalLM.from_pretrained(
#                 "microsoft/Florence-2-base",
#                 torch_dtype=torch.float32,
#                 cache_dir="/cache",
#                 trust_remote_code=True
#             ).to(self.device)
#             print("Model loaded successfully")
#             
#             print("Florence-2 model loaded successfully!")
#         except Exception as e:
#             print(f"Error loading Florence-2 model: {str(e)}")
#             raise e
# 
#     @modal.method()
#     def analyze_room(self, image_bytes: bytes) -> dict:
#         """Analyze room type and characteristics using Florence-2"""
#         import time
#         start_time = time.time()
#         
#         try:
#             print("Starting room analysis...")
#             
#             # Load and process image
#             image = Image.open(BytesIO(image_bytes))
#             print(f"Original image mode: {image.mode}, size: {image.size}")
#             
#             # Convert to RGB if needed (Florence-2 expects RGB)
#             if image.mode != 'RGB':
#                 image = image.convert('RGB')
#                 print(f"Converted image to RGB mode")
#             
#             print("Processing image successfully")
#             
#             # Florence-2 prompts for room analysis
#             prompts = ["<DETAILED_CAPTION>", "<CAPTION>"]
#             
#             results = {}
#             
#             for prompt in prompts:
#                 inputs = self.processor(text=prompt, images=image, return_tensors="pt").to(self.device)
#                 
#                 with torch.no_grad():
#                     generated_ids = self.model.generate(
#                         **inputs,
#                         max_new_tokens=100,
#                         do_sample=False,
#                     )
#                 
#                 generated_text = self.processor.batch_decode(
#                     generated_ids, skip_special_tokens=True, clean_up_tokenization_spaces=False
#                 )[0]
#                 
#                 # Extract the generated part (after the prompt)
#                 generated_part = generated_text.split(prompt)[-1].strip()
#                 results[prompt.replace("<", "").replace(">", "")] = generated_part
#             
#             # Parse results to determine room type
#             detailed_caption = results.get("DETAILED_CAPTION", "").lower()
#             basic_caption = results.get("CAPTION", "").lower()
#             
#             # Room type detection based on keywords
#             room_type = self._detect_room_type(detailed_caption, basic_caption)
#             
#             processing_time = time.time() - start_time
#             print("Room analysis completed successfully")
#             
#             return {
#                 "detected_room_type": room_type,
#                 "confidence": 0.85,  # Florence-2 is quite reliable
#                 "room_description": results.get("DETAILED_CAPTION", ""),
#                 "suggestions": []  # Will be handled by LLM later
#             }
#             
#         except Exception as e:
#             print("Room analysis error occurred")
#             import traceback
#             traceback.print_exc()
#             raise e
#     
#     def _detect_room_type(self, detailed_caption: str, basic_caption: str) -> str:
#         """Detect room type based on Florence-2 output"""
#         text = detailed_caption + " " + basic_caption
#         
#         # Room type keywords mapping
#         room_keywords = {
#             "kitchen": ["kitchen", "cook", "stove", "sink", "refrigerator", "counter", "kuchnia"],
#             "bedroom": ["bedroom", "bed", "sleep", "mattress", "nightstand", "sypialnia", "łóżko"],
#             "living_room": ["living room", "sofa", "couch", "tv", "coffee table", "salon", "pokój dzienny"],
#             "bathroom": ["bathroom", "toilet", "shower", "bathtub", "sink", "łazienka", "wc"],
#             "dining_room": ["dining room", "dining table", "chairs", "eat", "jadalnia", "stół"],
#             "office": ["office", "desk", "computer", "work", "study", "biuro", "pracownia"],
#             "empty_room": ["empty", "bare", "vacant", "pusty", "niezabudowany"]
#         }
#         
#         # Find best match
#         best_match = "living_room"  # default
#         max_score = 0
#         
#         for room_type, keywords in room_keywords.items():
#             score = sum(1 for keyword in keywords if keyword in text)
#             if score > max_score:
#                 max_score = score
#                 best_match = room_type
#         
#         return best_match
#     
#     def _translate_description(self, description: str) -> str:
#         """Translate common English terms to Polish"""
#         if not description:
#             return "Pomieszczenie zostało przeanalizowane przez IDA"
#         
#         # Common translations
#         translations = {
#             "kitchen": "kuchnia",
#             "living room": "pokój dzienny",
#             "bedroom": "sypialnia", 
#             "bathroom": "łazienka",
#             "dining room": "jadalnia",
#             "office": "biuro",
#             "modern": "nowoczesny",
#             "contemporary": "współczesny",
#             "traditional": "tradycyjny",
#             "minimalist": "minimalistyczny",
#             "white": "biały",
#             "black": "czarny",
#             "gray": "szary",
#             "blue": "niebieski",
#             "green": "zielony",
#             "wooden": "drewniany",
#             "marble": "marmurowy",
#             "tile": "kafelki",
#             "furniture": "meble",
#             "chair": "krzesło",
#             "table": "stół",
#             "sofa": "sofa",
#             "bed": "łóżko",
#             "window": "okno",
#             "door": "drzwi",
#             "lighting": "oświetlenie",
#             "decorative": "dekoracyjny",
#             "functional": "funkcjonalny",
#             "spacious": "przestronny",
#             "cozy": "przytulny",
#             "elegant": "elegancki"
#         }
#         
#         # Simple translation - replace English words with Polish
#         translated = description.lower()
#         for eng, pol in translations.items():
#             translated = translated.replace(eng, pol)
#         
#         # Capitalize first letter
#         if translated:
#             translated = translated[0].upper() + translated[1:]
#         
#         return translated
#     
#     def _generate_suggestions(self, room_type: str, description: str) -> List[str]:
#         """Generate design suggestions based on room type"""
#         suggestions_map = {
#             "kitchen": [
#                 "Rozważ dodanie więcej naturalnego światła",
#                 "Sprawdź ergonomię układu kuchennego - trójkąt roboczy",
#                 "Zastanów się nad kolorystyką szafek i blatów",
#                 "Oceń przestrzeń magazynową i organizację"
#             ],
#             "bedroom": [
#                 "Zwróć uwagę na oświetlenie wieczorne i poranne",
#                 "Rozważ kolory sprzyjające relaksowi i spokojowi",
#                 "Sprawdź układ mebli dla lepszego przepływu energii",
#                 "Zaplanuj strefę odpoczynku i przechowywania"
#             ],
#             "living_room": [
#                 "Oceń rozmieszczenie stref funkcjonalnych",
#                 "Rozważ kolory sprzyjające spotkaniom i relaksowi",
#                 "Sprawdź oświetlenie dla różnych aktywności",
#                 "Zaplanuj układ mebli dla komfortu i estetyki"
#             ],
#             "bathroom": [
#                 "Zwróć uwagę na praktyczność układu funkcjonalnego",
#                 "Rozważ materiały odporne na wilgoć i łatwe w utrzymaniu",
#                 "Sprawdź wentylację i odpowiednie oświetlenie",
#                 "Zaplanuj przestrzeń do przechowywania akcesoriów"
#             ],
#             "office": [
#                 "Oceń ergonomię miejsca pracy i siedzenia",
#                 "Rozważ kolory sprzyjające koncentracji i kreatywności",
#                 "Sprawdź oświetlenie i akustykę pomieszczenia",
#                 "Zaplanuj organizację dokumentów i sprzętu"
#             ],
#             "empty_room": [
#                 "Zastanów się nad główną funkcją pomieszczenia",
#                 "Rozważ podstawowe potrzeby użytkownika",
#                 "Zaplanuj strefy funkcjonalne i przepływ ruchu",
#                 "Oceń potencjał przestrzeni i możliwości aranżacji"
#             ]
#         }
#         
#         return suggestions_map.get(room_type, [
#             "Oceń potencjał przestrzeni i możliwości aranżacji",
#             "Rozważ swoje potrzeby funkcjonalne i estetyczne",
#             "Zaplanuj harmonijny układ mebli i akcesoriów"
#         ])

# Groq LLM - COMMENTED OUT FOR NOW, AVAILABLE FOR FUTURE USE
# @app.cls(
#     image=image,
#     secrets=[modal.Secret.from_name("groq-secret")],
#     scaledown_window=180  # Stay online for 3 minutes
# )
# class GroqLLM:
#     """Groq LLM for intelligent comments and suggestions"""
#     
#     @modal.enter()
#     def enter(self):
#         """Initialize Groq API key from secrets"""
#         try:
#             secret = modal.Secret.from_name("groq-secret")
#             self.api_key = secret["GROQ_API_KEY"]
#             self.base_url = "https://api.groq.com/openai/v1/chat/completions"
#             print("Groq API key initialized successfully")
#         except Exception as e:
#             print(f"Error initializing Groq API key: {str(e)}")
#             self.api_key = None
#     
#     @modal.method()
#     def generate_comment(self, room_type: str, room_description: str, context: str = "room_analysis") -> dict:
#         """Generate intelligent comment and suggestions using Groq Llama 3.3 70B"""
#         try:
#             print(f"Groq LLM called with: room_type={room_type}, context={context}")
#             print(f"API key available: {bool(self.api_key)}")
#             
#             if not self.api_key:
#                 raise Exception("Groq API key not configured")
#             
#             # Prepare prompt based on context
#             if context == "room_analysis":
#                 # Map room types to Polish
#                 room_names = {
#                     "kitchen": "kuchnią",
#                     "living_room": "pokojem dziennym", 
#                     "bedroom": "sypialnią",
#                     "bathroom": "łazienką",
#                     "office": "biurem",
#                     "empty_room": "pustym pomieszczeniem"
#                 }
#                 room_name = room_names.get(room_type, "pomieszczeniem")
#                 
#                 prompt = f"""Jesteś IDA - ekspertką od projektowania wnętrz z wieloletnim doświadczeniem. Użytkownik przesłał zdjęcie {room_name}.
# 
# Analiza techniczna: {room_description}
# 
# Napisz bardzo naturalny, ciepły komentarz jak przyjaciółka, która jest ekspertką od wnętrz. Bądź entuzjastyczna, konkretna i inspirująca. Skup się na tym co widzisz na zdjęciu.
# 
# Przykłady tonu:
# - "Ooo, jakie piękne {room_name}! Widzę tutaj..."
# - "Wow, to {room_name} ma naprawdę potencjał! Szczególnie..."
# - "Świetnie! Ten {room_name} wygląda bardzo..."
# - "Uwielbiam ten styl! Widzę że..."
# 
# Format odpowiedzi:
# KOMMENTARZ: [ciepły, entuzjastyczny komentarz 2-3 zdania o tym co widzisz]
# 
# Bądź bardzo naturalna, ciepła i inspirująca. Jak prawdziwa ekspertka od wnętrz!"""
#             else:  # generated_image
#                 prompt = f"""Jesteś IDA - Inteligentnym Asystentem Projektowania Wnętrz. Oceń wygenerowane wnętrze i napisz krótki komentarz po polsku.
# 
# Typ pomieszczenia: {room_type}
# Opis pomieszczenia: {room_description}
# 
# Napisz:
# 1. Krótki komentarz (2-3 zdania) o wygenerowanym wnętrzu
# 2. 3 konkretne sugestie do dalszych poprawek
# 
# Format odpowiedzi:
# KOMMENTARZ: [twój komentarz]
# SUGESTIE:
# - [sugestia 1]
# - [sugestia 2]
# - [sugestia 3]
# 
# Bądź profesjonalny, konkretny i pomocny."""
# 
#             # Call Groq API
#             headers = {
#                 "Authorization": f"Bearer {self.api_key}",
#                 "Content-Type": "application/json"
#             }
#             
#             data = {
#                 "model": "llama-3.3-70b-versatile",
#                 "messages": [
#                     {
#                         "role": "user", 
#                         "content": prompt
#                     }
#                 ],
#                 "temperature": 0.7,
#                 "max_tokens": 500
#             }
#             
#             print(f"Calling Groq API with prompt length: {len(prompt)}")
#             print(f"API Key starts with: {self.api_key[:10]}...")
#             print(f"Request URL: {self.base_url}")
#             print(f"Request headers: {headers}")
#             print(f"Request data keys: {data.keys()}")
#             
#             response = requests.post(self.base_url, headers=headers, json=data, timeout=30)
#             print(f"Groq API response status: {response.status_code}")
#             print(f"Groq API response headers: {dict(response.headers)}")
#             
#             if response.status_code != 200:
#                 print(f"Groq API error response: {response.text}")
#             
#             response.raise_for_status()
#             
#             result = response.json()
#             print(f"Groq API response keys: {result.keys()}")
#             content = result["choices"][0]["message"]["content"]
#             print(f"Groq API response content: {content[:200]}...")
#             
#             # Parse response
#             lines = content.strip().split('\n')
#             comment = ""
#             suggestions = []
#             
#             current_section = None
#             for line in lines:
#                 line = line.strip()
#                 if line.startswith("KOMMENTARZ:"):
#                     comment = line.replace("KOMMENTARZ:", "").strip()
#                 elif line.startswith("SUGESTIE:"):
#                     current_section = "suggestions"
#                 elif current_section == "suggestions" and line.startswith("-"):
#                     suggestions.append(line[1:].strip())
#             
#             # Fallback comments based on room type
#             fallback_comments = {
#                 "kitchen": "Ooo, widzę piękną kuchnię! To pomieszczenie ma naprawdę dużo potencjału na stworzenie wspaniałej przestrzeni do gotowania i spotkań z rodziną.",
#                 "living_room": "Wow, jaki przytulny pokój dzienny! Widzę tutaj doskonałe miejsce do relaksu i spędzania czasu z bliskimi.",
#                 "bedroom": "Świetnie! Ta sypialnia wygląda bardzo obiecująco. To będzie idealne miejsce do odpoczynku i regeneracji sił.",
#                 "bathroom": "Uwielbiam ten styl łazienki! Widzę tutaj piękną przestrzeń, która może stać się prawdziwą oazą spokoju.",
#                 "office": "Wow, to biuro ma naprawdę dobry potencjał! Widzę doskonałe miejsce do pracy i kreatywności.",
#                 "empty_room": "Świetnie! Puste pomieszczenie to jak czysta karta - możemy stworzyć tutaj coś naprawdę wyjątkowego!"
#             }
#             
#             return {
#                 "comment": comment or fallback_comments.get(room_type, "Ooo, jakie piękne pomieszczenie! Widzę tutaj naprawdę duży potencjał na stworzenie wspaniałej przestrzeni."),
#                 "suggestions": []  # No suggestions needed
#             }
#             
#         except Exception as e:
#             print(f"Groq LLM error: {str(e)}")
#             # Fallback comments based on room type
#             fallback_comments = {
#                 "kitchen": "Ooo, widzę piękną kuchnię! To pomieszczenie ma naprawdę dużo potencjału na stworzenie wspaniałej przestrzeni do gotowania i spotkań z rodziną.",
#                 "living_room": "Wow, jaki przytulny pokój dzienny! Widzę tutaj doskonałe miejsce do relaksu i spędzania czasu z bliskimi.",
#                 "bedroom": "Świetnie! Ta sypialnia wygląda bardzo obiecująco. To będzie idealne miejsce do odpoczynku i regeneracji sił.",
#                 "bathroom": "Uwielbiam ten styl łazienki! Widzę tutaj piękną przestrzeń, która może stać się prawdziwą oazą spokoju.",
#                 "office": "Wow, to biuro ma naprawdę dobry potencjał! Widzę doskonałe miejsce do pracy i kreatywności.",
#                 "empty_room": "Świetnie! Puste pomieszczenie to jak czysta karta - możemy stworzyć tutaj coś naprawdę wyjątkowego!"
#             }
#             return {
#                 "comment": fallback_comments.get(room_type, "Ooo, jakie piękne pomieszczenie! Widzę tutaj naprawdę duży potencjał na stworzenie wspaniałej przestrzeni."),
#                 "suggestions": []
#             }

# Initialize model instances
flux_model = FluxKontextModel()
# florence2_model = Florence2Model()  # COMMENTED OUT FOR NOW
# groq_llm = GroqLLM()  # COMMENTED OUT FOR NOW

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
        "vision_model": "florence-2"
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

# COMMENTED OUT ENDPOINTS - AVAILABLE FOR FUTURE USE
# @web_app.post("/analyze-room", response_model=RoomAnalysisResponse)
# async def analyze_room(request: RoomAnalysisRequest):
#     """Analyze room type and characteristics from uploaded image"""
#     try:
#         print("Received room analysis request")
#         
#         # Decode base64 image
#         image_bytes = base64.b64decode(request.image)
#         
#         # Analyze room using Florence-2
#         result = florence2_model.analyze_room.remote(image_bytes)
#         
#         return RoomAnalysisResponse(
#             detected_room_type=result["detected_room_type"],
#             confidence=result["confidence"],
#             room_description=result["room_description"],
#             suggestions=result["suggestions"]
#         )
#         
#     except Exception as e:
#         print("API error occurred")
#         raise HTTPException(status_code=500, detail=str(e))
# 
# @web_app.options("/analyze-room")
# async def analyze_room_options():
#     """Handle preflight request for room analysis"""
#     return {"message": "OK"}
# 
# @web_app.post("/llm-comment", response_model=LLMCommentResponse)
# async def generate_llm_comment(request: LLMCommentRequest):
#     """Generate intelligent comment and suggestions using Groq LLM"""
#     try:
#         print(f"Generating LLM comment for room type: {request.room_type}")
#         
#         result = groq_llm.generate_comment.remote(
#             room_type=request.room_type,
#             room_description=request.room_description,
#             context=request.context
#         )
#         
#         return LLMCommentResponse(
#             comment=result["comment"],
#             suggestions=result["suggestions"]
#         )
#         
#     except Exception as e:
#         print(f"LLM comment generation error: {str(e)}")
#         raise HTTPException(status_code=500, detail=f"Failed to generate LLM comment: {str(e)}")
# 
# @web_app.options("/llm-comment")
# async def llm_comment_options():
#     """Handle preflight request for LLM comment"""
#     return {"message": "OK"}
# 
# @web_app.get("/test-groq")
# async def test_groq():
#     """Test Groq API connection"""
#     try:
#         result = groq_llm.generate_comment.remote(
#             room_type="living_room",
#             room_description="Test description",
#             context="room_analysis"
#         )
#         return {"status": "success", "result": result}
#     except Exception as e:
#         return {"status": "error", "error": str(e)}
