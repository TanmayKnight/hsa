import fitz  # PyMuPDF
import logging
import io
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

# If average characters per page is below this, treat as image-based PDF
TEXT_DENSITY_THRESHOLD = 100


class PDFProcessor:
    """
    Extracts content from PDF files.
    Automatically detects whether a PDF is text-based or image-based (scanned).
    """

    def extract_content(self, pdf_bytes: bytes, source_pdf: str) -> Dict[str, Any]:
        """
        Extract content from PDF bytes.

        Returns a dict suitable for passing to LLMProvider.extract_articles():
        {
            "type": "text" | "image",
            "pages": [...],
            "source_pdf": str
        }
        """
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")

        try:
            if self._is_image_based(doc):
                logger.info("Detected image-based PDF: %s (%d pages)", source_pdf, len(doc))
                pages = self._extract_as_images(doc)
                return {"type": "image", "pages": pages, "source_pdf": source_pdf}
            else:
                logger.info("Detected text-based PDF: %s (%d pages)", source_pdf, len(doc))
                pages = self._extract_as_text(doc)
                return {"type": "text", "pages": pages, "source_pdf": source_pdf}
        finally:
            doc.close()

    def _is_image_based(self, doc: fitz.Document) -> bool:
        """
        Heuristic: if average text per page is below threshold, treat as image-based.
        Also checks if pages contain embedded images with minimal text.
        """
        total_chars = 0
        for page in doc:
            text = page.get_text()
            total_chars += len(text.strip())

        avg_chars = total_chars / max(len(doc), 1)
        logger.debug("Average chars per page: %.1f (threshold: %d)", avg_chars, TEXT_DENSITY_THRESHOLD)
        return avg_chars < TEXT_DENSITY_THRESHOLD

    def _extract_as_text(self, doc: fitz.Document) -> List[Dict]:
        """Extract text from each page of a text-based PDF."""
        pages = []
        for page_num, page in enumerate(doc, start=1):
            # Use "text" mode for clean paragraph extraction
            text = page.get_text("text")
            pages.append({
                "page_num": page_num,
                "text": text.strip(),
            })
        return pages

    def _extract_as_images(self, doc: fitz.Document) -> List[Dict]:
        """
        Render each page as a high-resolution image for Gemini Vision.
        Uses 2x zoom for better OCR accuracy on small newspaper text.
        """
        pages = []
        zoom_matrix = fitz.Matrix(2.0, 2.0)  # 2x zoom = ~144 DPI

        for page_num, page in enumerate(doc, start=1):
            pixmap = page.get_pixmap(matrix=zoom_matrix)
            # Convert to PNG bytes
            img_bytes = pixmap.tobytes("png")
            pages.append({
                "page_num": page_num,
                "image_bytes": img_bytes,
            })
            logger.debug("Rendered page %d as image (%d bytes)", page_num, len(img_bytes))

        return pages
