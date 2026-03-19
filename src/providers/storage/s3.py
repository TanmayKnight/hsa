"""
AWS S3 storage provider stub.

To activate:
1. pip install boto3
2. Add to .env:
   AWS_ACCESS_KEY_ID=...
   AWS_SECRET_ACCESS_KEY=...
   AWS_REGION=us-east-1
   S3_BUCKET_NAME=your-bucket
   S3_INBOX_PREFIX=inbox/
   S3_PROCESSED_PREFIX=processed/
3. Set storage.provider: s3 in config/config.yaml
4. Uncomment S3StorageProvider in src/providers/storage/__init__.py
"""
from typing import List
from src.providers.storage.base import StorageProvider


class S3StorageProvider(StorageProvider):
    """
    AWS S3 implementation.
    Uses boto3. inbox_path and processed_path are treated as S3 key prefixes.
    """

    def __init__(self, config: dict):
        # import boto3
        # self.s3 = boto3.client("s3")
        # self.bucket = os.getenv("S3_BUCKET_NAME")
        # self.inbox_prefix = os.getenv("S3_INBOX_PREFIX", "inbox/")
        # self.processed_prefix = os.getenv("S3_PROCESSED_PREFIX", "processed/")
        raise NotImplementedError("S3 provider not yet activated. See module docstring.")

    def list_new_files(self) -> List[str]:
        raise NotImplementedError

    def read_file(self, file_path: str) -> bytes:
        raise NotImplementedError

    def move_to_processed(self, file_path: str) -> str:
        raise NotImplementedError

    def get_file_url(self, file_path: str) -> str:
        raise NotImplementedError
