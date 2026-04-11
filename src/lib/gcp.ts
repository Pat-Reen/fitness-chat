import { Firestore } from "@google-cloud/firestore";
import { Storage } from "@google-cloud/storage";

let _db: Firestore;
let _storage: Storage;

/**
 * Returns a singleton Firestore client.
 *
 * Authentication:
 *  - Cloud Run: uses the attached service account automatically (ADC).
 *  - Local dev: set GOOGLE_APPLICATION_CREDENTIALS to a service-account key JSON path,
 *    or run `gcloud auth application-default login`.
 */
export function getDb(): Firestore {
  if (!_db) {
    _db = new Firestore({
      projectId: process.env.GCP_PROJECT_ID,
      // ADC is used automatically; no explicit credentials needed in Cloud Run.
    });
  }
  return _db;
}

/**
 * Returns a singleton Cloud Storage client.
 */
export function getGcs(): Storage {
  if (!_storage) {
    _storage = new Storage({
      projectId: process.env.GCP_PROJECT_ID,
    });
  }
  return _storage;
}

/**
 * Returns the exercise-images bucket.
 */
export function getImagesBucket() {
  const bucketName = process.env.GCS_BUCKET_NAME;
  if (!bucketName) throw new Error("GCS_BUCKET_NAME env var not set");
  return getGcs().bucket(bucketName);
}
