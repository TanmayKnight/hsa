"""
Google Cloud Storage provider stub.

To activate:
1. pip install google-cloud-storage
2. Add to .env:
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
   GCS_BUCKET_NAME=your-bucket
   GCS_INBOX_PREFIX=inbox/
   GCS_PROCESSED_PREFIX=processed/
3. Set storage.provider: gcs in config/config.yaml
4. Uncomment GCSStorageProvider in src/providers/storage/__init__.py
"""
from typing import List
from src.providers.storage.base import StorageProvider


class GCSStorageProvider(StorageProvider):
    """Google Cloud Storage implementation."""

    def __init__(self, config: dict):
        raise NotImplementedError("GCS provider not yet activated. See module docstring.")

    def list_new_files(self) -> List[str]:
        raise NotImplementedError

    def read_file(self, file_path: str) -> bytes:
        raise NotImplementedError

    def move_to_processed(self, file_path: str) -> str:
        raise NotImplementedError

    def get_file_url(self, file_path: str) -> str:
        raise NotImplementedError
