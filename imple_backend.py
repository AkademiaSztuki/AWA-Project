[1mdiff --git a/apps/modal-backend/flux_backend.py b/apps/modal-backend/flux_backend.py[m
[1mindex 71e8861..308aa69 100644[m
[1m--- a/apps/modal-backend/flux_backend.py[m
[1m+++ b/apps/modal-backend/flux_backend.py[m
[36m@@ -76,7 +76,7 @@[m [mclass GenerationRequest(BaseModel):[m
     steps: int = 20[m
     guidance: float = 7.0[m
     num_images: int = 1[m
[31m-    image_size: int = 512[m
[32m+[m[32m    image_size: int = 1024[m
 [m
 class GenerationResponse(BaseModel):[m
     images: List[str][m
[36m@@ -129,7 +129,7 @@[m [mclass FluxKontextModel:[m
         prompt: str,[m
         guidance_scale: float = 3.5,[m
         num_inference_steps: int = 20,[m
[31m-        image_size: int = 512,[m
[32m+[m[32m        image_size: int = 1024,[m
         num_images: int = 1,[m
         inspiration_images: Optional[List[bytes]] = None[m
     ) -> List[bytes]:[m
[36m@@ -219,7 +219,7 @@[m [mclass FluxKontextModel:[m
         prompt: str,[m
         guidance_scale: float = 7.0,[m
         num_inference_steps: int = 20,[m
[31m-        image_size: int = 512,[m
[32m+[m[32m        image_size: int = 1024,[m
         num_images: int = 1[m
     ) -> List[bytes]:[m
         """Generate images from text only"""[m
