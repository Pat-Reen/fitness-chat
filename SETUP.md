# Setup Guide

Complete setup instructions for local development and Cloud Run deployment.

---

## Prerequisites

- Node.js 20+
- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) (`gcloud` CLI)
- A GCP project with billing enabled
- An Anthropic API key

---

## 1. GCP Project Setup

### 1.1 Enable APIs

```bash
gcloud config set project YOUR_PROJECT_ID

gcloud services enable \
  run.googleapis.com \
  firestore.googleapis.com \
  storage.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com
```

### 1.2 Create Firestore database

In the [GCP Console](https://console.cloud.google.com/firestore) → Create database → **Native mode** → choose a region.

### 1.3 Create Cloud Storage bucket

```bash
# Replace with your preferred bucket name and region
gsutil mb -l europe-west2 gs://your-bucket-name

# Make the exercises folder publicly readable
gsutil iam ch allUsers:objectViewer gs://your-bucket-name
```

### 1.4 Create a service account (local dev)

```bash
gcloud iam service-accounts create fitness-chat-dev \
  --display-name="Fitness Chat Dev"

# Grant Firestore and Storage access
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:fitness-chat-dev@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:fitness-chat-dev@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"

# Download the key
gcloud iam service-accounts keys create ~/fitness-chat-dev-key.json \
  --iam-account=fitness-chat-dev@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

---

## 2. Google OAuth Setup

1. Go to [GCP Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials)
2. **Create credentials** → OAuth 2.0 Client ID → Web application
3. Add authorised redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (local dev)
   - `https://YOUR-CLOUD-RUN-URL/api/auth/callback/google` (production)
4. Note the **Client ID** and **Client Secret**

---

## 3. Local Development

### 3.1 Environment variables

```bash
cp .env.local.example .env.local
```

Fill in `.env.local`:

```env
ANTHROPIC_API_KEY=sk-ant-...

GCP_PROJECT_ID=your-project-id
GCS_BUCKET_NAME=your-bucket-name

GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...

# Generate with: openssl rand -base64 32
AUTH_SECRET=your-random-secret

FITBIT_CLIENT_ID=...
FITBIT_CLIENT_SECRET=...

NEXT_PUBLIC_APP_URL=http://localhost:3000

# Path to the service account key downloaded in step 1.4
GOOGLE_APPLICATION_CREDENTIALS=/Users/you/fitness-chat-dev-key.json

# For seeding scripts
PAT_EMAIL=pat@gmail.com
NIA_EMAIL=nia@gmail.com
GARMIN_NIA_EMAIL=nia@garmin-account.com
GARMIN_NIA_PASSWORD=garmin-password
```

### 3.2 Install dependencies

```bash
npm install
```

### 3.3 Seed Firestore

Run once to populate exercises, equipment, and user docs:

```bash
npx ts-node --project tsconfig.scripts.json scripts/seed-firestore.ts
```

This creates:
- `exercises/{group}` — all exercise lists
- `equipment/default` — equipment list
- `users/pat@gmail.com` — Pat's user doc (platform: fitbit)
- `users/nia@gmail.com` — Nia's user doc (platform: garmin, garminCredentials)

### 3.4 Generate exercise images (optional, can do later)

```bash
npx ts-node --project tsconfig.scripts.json scripts/generate-exercise-images.ts
```

Generates SVG diagrams for 23 machine exercises, uploads to GCS, records in Firestore. Skips any that already exist. Takes a few minutes.

### 3.5 Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in with Pat's or Nia's Google account.

**First Fitbit connection:** Pat will be prompted to connect Fitbit on the activity screen. After OAuth completes, tokens are stored in Firestore and won't be needed again.

---

## 4. Fitbit App Setup

1. Go to [dev.fitbit.com](https://dev.fitbit.com/apps/new) → Register an app
2. OAuth 2.0 Application Type: **Server**
3. Callback URL (add both):
   - `http://localhost:3000/api/fitbit/callback`
   - `https://YOUR-CLOUD-RUN-URL/api/fitbit/callback`
4. Required scopes: `activity`, `heartrate`
5. Add `FITBIT_CLIENT_ID` and `FITBIT_CLIENT_SECRET` to `.env.local`

---

## 5. Cloud Run Deployment

### 5.1 Create a service account for Cloud Run

```bash
gcloud iam service-accounts create fitness-chat-run \
  --display-name="Fitness Chat Cloud Run"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:fitness-chat-run@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:fitness-chat-run@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"
```

### 5.2 Store secrets in Secret Manager

```bash
# Create each secret
echo -n "sk-ant-..." | gcloud secrets create ANTHROPIC_API_KEY --data-file=-
echo -n "your-project-id" | gcloud secrets create GCP_PROJECT_ID --data-file=-
echo -n "your-bucket-name" | gcloud secrets create GCS_BUCKET_NAME --data-file=-
echo -n "...apps.googleusercontent.com" | gcloud secrets create GOOGLE_CLIENT_ID --data-file=-
echo -n "GOCSPX-..." | gcloud secrets create GOOGLE_CLIENT_SECRET --data-file=-
echo -n "your-auth-secret" | gcloud secrets create AUTH_SECRET --data-file=-
echo -n "your-fitbit-client-id" | gcloud secrets create FITBIT_CLIENT_ID --data-file=-
echo -n "your-fitbit-client-secret" | gcloud secrets create FITBIT_CLIENT_SECRET --data-file=-
echo -n "https://YOUR-CLOUD-RUN-URL" | gcloud secrets create NEXT_PUBLIC_APP_URL --data-file=-

# Grant the Cloud Run service account access to secrets
for SECRET in ANTHROPIC_API_KEY GCP_PROJECT_ID GCS_BUCKET_NAME GOOGLE_CLIENT_ID \
              GOOGLE_CLIENT_SECRET AUTH_SECRET FITBIT_CLIENT_ID FITBIT_CLIENT_SECRET \
              NEXT_PUBLIC_APP_URL; do
  gcloud secrets add-iam-policy-binding $SECRET \
    --member="serviceAccount:fitness-chat-run@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
done
```

### 5.3 Create Artifact Registry repository

```bash
gcloud artifacts repositories create fitness-chat \
  --repository-format=docker \
  --location=europe-west2
```

### 5.4 Build and push Docker image

```bash
# Authenticate Docker with Artifact Registry
gcloud auth configure-docker europe-west2-docker.pkg.dev

# Build and push
docker build -t europe-west2-docker.pkg.dev/YOUR_PROJECT_ID/fitness-chat/app:latest .
docker push europe-west2-docker.pkg.dev/YOUR_PROJECT_ID/fitness-chat/app:latest
```

Or use Cloud Build:

```bash
gcloud builds submit \
  --tag europe-west2-docker.pkg.dev/YOUR_PROJECT_ID/fitness-chat/app:latest
```

### 5.5 Deploy to Cloud Run

```bash
gcloud run deploy fitness-chat \
  --image europe-west2-docker.pkg.dev/YOUR_PROJECT_ID/fitness-chat/app:latest \
  --platform managed \
  --region europe-west2 \
  --service-account fitness-chat-run@YOUR_PROJECT_ID.iam.gserviceaccount.com \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 5 \
  --set-secrets \
    ANTHROPIC_API_KEY=ANTHROPIC_API_KEY:latest,\
    GCP_PROJECT_ID=GCP_PROJECT_ID:latest,\
    GCS_BUCKET_NAME=GCS_BUCKET_NAME:latest,\
    GOOGLE_CLIENT_ID=GOOGLE_CLIENT_ID:latest,\
    GOOGLE_CLIENT_SECRET=GOOGLE_CLIENT_SECRET:latest,\
    AUTH_SECRET=AUTH_SECRET:latest,\
    FITBIT_CLIENT_ID=FITBIT_CLIENT_ID:latest,\
    FITBIT_CLIENT_SECRET=FITBIT_CLIENT_SECRET:latest,\
    NEXT_PUBLIC_APP_URL=NEXT_PUBLIC_APP_URL:latest
```

### 5.6 Post-deployment

After the first deployment, note the Cloud Run URL and:

1. **Update** the `NEXT_PUBLIC_APP_URL` secret with the real URL:
   ```bash
   echo -n "https://fitness-chat-xxxx-ew.a.run.app" | \
     gcloud secrets versions add NEXT_PUBLIC_APP_URL --data-file=-
   ```

2. **Add** the production callback URLs to your Google OAuth app and Fitbit app.

3. **Redeploy** to pick up the updated secret:
   ```bash
   gcloud run deploy fitness-chat --image ... # same command as above
   ```

---

## 6. Adding New Users

No code changes needed. Just add a Firestore document:

**Collection:** `users`  
**Document ID:** the user's Google account email  
**Fields:**
```json
{
  "email": "newuser@gmail.com",
  "displayName": "New User",
  "platform": "fitbit"
}
```

The user will be able to sign in with that Google account immediately.

For Garmin users, also add:
```json
{
  "garminCredentials": {
    "email": "garmin-account@example.com",
    "password": "garmin-password"
  }
}
```

---

## 7. Managing Exercise Images

From the admin UI (`/admin` → Images tab):

- **Regenerate** — calls Claude to generate a new SVG in the same style as all others
- **Upload** — replace with a custom SVG file

To update the global style for all future regenerations, update the `image_style/default` document in Firestore:
```
image_style/default:
  prompt: "Minimal SVG diagram, viewBox 0 0 200 200, ..."
```
