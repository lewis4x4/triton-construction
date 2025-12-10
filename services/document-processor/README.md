# Document Processor Service

A dedicated microservice for extracting metadata from large bid documents using Claude AI. Deployed on Railway to handle files up to 50MB.

## Why Railway?

Supabase Edge Functions have a 256MB memory limit which causes failures when processing large PDFs (10-30MB) with Claude's document API. This standalone service runs on Railway with no size limits.

## Local Development

```bash
cd services/document-processor
npm install
npm run dev
```

The service runs on port 3001 by default.

## Environment Variables

Set these in Railway:

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Claude API key |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed origins for CORS |

## Deploy to Railway

### Option 1: Deploy from GitHub

1. Push this folder to a GitHub repository
2. In Railway dashboard, click **New Project** → **Deploy from GitHub repo**
3. Select your repository
4. Railway will auto-detect the Dockerfile
5. Add environment variables in Settings → Variables

### Option 2: Deploy via CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project (run from services/document-processor)
railway init

# Deploy
railway up

# Add environment variables
railway variables set ANTHROPIC_API_KEY=your_key
railway variables set SUPABASE_URL=https://gablgsruyuhvjurhtcxx.supabase.co
railway variables set SUPABASE_SERVICE_ROLE_KEY=your_service_key
railway variables set ALLOWED_ORIGINS=https://your-app.vercel.app,http://localhost:5173
```

## After Deployment

1. Get your Railway service URL (e.g., `https://document-processor-production.up.railway.app`)
2. Add to your frontend `.env`:
   ```
   VITE_DOCUMENT_PROCESSOR_URL=https://document-processor-production.up.railway.app
   ```

## API Endpoints

### Health Check
```
GET /health
```

### Extract Metadata
```
POST /extract-metadata
Content-Type: multipart/form-data
Authorization: Bearer <supabase_jwt_token>

Body: file (PDF or image)
```

Response:
```json
{
  "success": true,
  "metadata": {
    "project_name": "...",
    "state_project_number": "...",
    "confidence_score": 85,
    ...
  },
  "filename": "bid.pdf",
  "file_size": 12345678,
  "processing_time_ms": 15234
}
```

## Cost

Railway Hobby Plan: $5/month with $5 free credits
- More than enough for document processing workloads
- No file size limits
- Automatic SSL
