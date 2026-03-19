"""
Azure Blob Storage provider stub.

To activate:
1. pip install azure-storage-blob
2. Add to .env:
   AZURE_STORAGE_CONNECTION_STRING=...
   AZURE_CONTAINER_NAME=your-container
   AZURE_INBOX_PREFIX=inbox/
   AZURE_PROCESSED_PREFIX=processed/
3. Set storage.provider: azure in config/config.yaml
4. Uncomment AzureStorageProvider in src/providers/storage/__init__.py
"""
from typing import List
from src.providers.storage.base import StorageProvider


class AzureStorageProvider(StorageProvider):
    """
    Azure Blob Storage implementation.
    inbox_path and processed_path are treated as blob path prefixes.
    """

    def __init__(self, config: dict):
        # from azure.storage.blob import BlobServiceClient
        # conn_str = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
        # self.client = BlobServiceClient.from_connection_string(conn_str)
        # self.container = os.getenv("AZURE_CONTAINER_NAME")
        raise NotImplementedError("Azure provider not yet activated. See module docstring.")

    def list_new_files(self) -> List[str]:
        raise NotImplementedError

    def read_file(self, file_path: str) -> bytes:
        raise NotImplementedError

    def move_to_processed(self, file_path: str) -> str:
        raise NotImplementedError

    def get_file_url(self, file_path: str) -> str:
        raise NotImplementedError
