import modal
import io
from fastapi import Response

# 1. Pre-build the image with the specific VAE to speed up decoding
image = (
    modal.Image.debian_slim()
    .pip_install("fastapi[standard]", "transformers", "accelerate", "diffusers", "torch", "huggingface_hub")
)

app = modal.App("sdxl-turbo", image=image)

@app.cls(gpu="A10G", min_containers=1)
class Model:
    @modal.enter()
    def load_weights(self):
        import torch
        from diffusers import AutoPipelineForText2Image, EulerAncestralDiscreteScheduler
        
        self.pipe = AutoPipelineForText2Image.from_pretrained(
            "stabilityai/sdxl-turbo",
            torch_dtype=torch.float16,
            variant="fp16",
            # This skips loading the heavy safety checker
            safety_checker=None,
            requires_safety_checker=False 
        )
        self.pipe.to("cuda")
        
        # EulerAncestral often produces better results at 1 step than the default
        self.pipe.scheduler = EulerAncestralDiscreteScheduler.from_config(self.pipe.scheduler.config)
        
        # Optimization: Warm up the GPU
        self.pipe(prompt="warmup", num_inference_steps=1)

    @modal.fastapi_endpoint()
    def generate(self, prompt: str):
        # Using a context manager to disable gradient calculation saves time/memory
        import torch
        with torch.inference_mode():
            image = self.pipe(
                prompt=prompt, 
                num_inference_steps=1, 
                guidance_scale=0.0
            ).images[0]
        
        buffer = io.BytesIO()
        # Optimization: Lower JPEG quality slightly or use 'progressive' for perceived speed
        image.save(buffer, format="JPEG", quality=85)
        
        return Response(content=buffer.getvalue(), media_type="image/jpeg")
