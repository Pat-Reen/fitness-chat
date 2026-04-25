# infra/

Terraform for the GCP project that runs fitness-chat (Cloud Run app) and the
weekly ML training pipeline (Vertex). See `../ml-integration-plan.md` for the
full design.

## First-time setup

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars   # edit values
terraform init
terraform plan
terraform apply
```

Secret *values* are not in Terraform — only the Secret Manager resources. Set
them out of band:

```bash
echo -n "<value>" | gcloud secrets versions add FITBIT_CLIENT_ID --data-file=-
echo -n "<value>" | gcloud secrets versions add FITBIT_CLIENT_SECRET --data-file=-
echo -n "<value>" | gcloud secrets versions add ANTHROPIC_API_KEY --data-file=-
echo -n "<value>" | gcloud secrets versions add GARMIN_NIA_EMAIL --data-file=-
echo -n "<value>" | gcloud secrets versions add GARMIN_NIA_PASSWORD --data-file=-
echo -n "<value>" | gcloud secrets versions add FITBIT_PAT_REFRESH_TOKEN --data-file=-
```

## Resources

- **Cloud Run** service `fitness-chat` (public) runs the Streamlit app.
- **Firestore** (Native) is the app DB — see `ml-integration-plan.md` for the
  collection layout.
- **GCS** bucket `<proj>-models` holds Vertex model artifacts and compiled
  pipeline specs.
- **Artifact Registry** `fitness-chat-images` holds container images.
- **Secret Manager** holds Fitbit/Garmin/Anthropic credentials; Cloud Run
  mounts them as env vars.
- **Cloud Scheduler** fires weekly and triggers the Vertex Pipeline.
- **Workload Identity Federation** lets GitHub Actions deploy without JSON
  keys — only pushes from this repo can impersonate the SAs.
