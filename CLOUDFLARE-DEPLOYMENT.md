# Cloudflare deployment

Kaptio's frontend and API run together in a Linux Cloudflare Container behind a Cloudflare Worker. The container is necessary because video export and server-side Whisper transcription use FFmpeg, ONNX Runtime, child processes, and a writable temporary directory; these cannot run in a regular Workers isolate.

## Requirements and cost

Cloudflare Containers require the Workers Paid plan, currently $5 USD/month, with usage-based charges beyond included monthly allowances. This repo targets one `standard-1` container (0.5 vCPU, 4 GiB RAM, 8 GB disk) and one maximum running instance. It is not deployed until the account owner enables the paid capability and supplies the GitHub Actions credentials. Do not enable deployment or purchase a plan without the owner's explicit approval.

Cloudflare's default request-body ceiling is 100 MB on Free/Pro accounts and 200 MB on Business accounts. Kaptio currently accepts videos up to 150 MB, so uploads above the account's Cloudflare edge limit will be rejected before reaching the app. Large-upload support requires an eligible higher limit or direct-to-R2 uploads; R2 is not configured in this repository.

The Whisper model is downloaded and cached in the container's temporary filesystem on first use. It may need to download again after an idle container stops and later starts.

## GitHub Actions setup

The workflow `.github/workflows/cloudflare.yml` runs lint, typecheck, tests, and a production build for pushes and pull requests to `main`. To enable production deployment after approving the plan and configuring the Cloudflare API token, add these repository Actions secrets:

- `CLOUDFLARE_API_TOKEN` — a narrowly scoped Cloudflare token with permission to edit Workers and deploy Containers.
- `CLOUDFLARE_ACCOUNT_ID` — the Cloudflare account ID.

Then add the repository Actions variable `CLOUDFLARE_DEPLOY_ENABLED` with the value `true`. Pushes to `main` will then deploy the Worker and container using Wrangler. Until that variable is set, the deploy job is intentionally skipped; the workflow never stores credentials in the repository.
