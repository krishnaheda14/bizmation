Render deployment steps for the Jewelry AI service

1) Overview
- Service: FastAPI app at `ai-services/image-processing` (health: `/`)
- Uses heavy ML libs (torch, ultralytics, rembg). First boot may download models.

2) Files added
- `Dockerfile` — containerized runtime for Render.

3) Quick Deploy (Render web service)
- In Render dashboard create a new **Web Service** and connect your Git repo.
- Choose "Docker" as the environment so Render will use the `Dockerfile` in `ai-services/image-processing`.
- Build & start: Render will build the image and run the container. The service listens on the provided `$PORT`.

4) Recommended environment variables (set in Render service settings)
- `TEMP_DIR` (optional) — path for temporary files, e.g. `/tmp/jewelry-ai`
- `MODEL_PRELOAD` (optional) — set to `1` if you add a preloading step during build/run to cache models

5) Health check
- Use the root `GET /` endpoint. Render health check: `https://<your-service>.onrender.com/`

6) Optional: Preload models at build-time (trade image size for faster runtime)
- To make first request faster, you can preload YOLO or other models during image build. Example snippet to run during build (may increase build time):
  ```dockerfile
  RUN python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"
  ```

7) After successful deployment
- Copy the public service URL (e.g. `https://my-jewelry-ai.onrender.com`) and set it in your Cloudflare Pages environment as `VITE_AI_SERVICE_URL`.
- Update the Cloudflare Pages environment variables in the Pages UI and trigger a new deploy (or redeploy) so the frontend uses the live AI service.

8) Testing checklist
- Curl health: `curl https://<service>/`
- Test background removal: `curl -F "file=@sample.jpg" https://<service>/remove-background --output out.png`
- Test recognition: `curl -F "file=@sample.jpg" https://<service>/recognize-jewelry`

9) Notes & caveats
- CPU-only Render instances may be slower; model downloads and first inferences can take time.
- If model downloads fail due to memory/time, consider pre-building model cache or using a larger instance/paid plan.
- Monitor logs on Render for errors (missing libs, model download failures). The `Dockerfile` includes common native libs for rembg and OpenCV.
