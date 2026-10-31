"""Image preprocessing for Lab Twin.

Applied before every classify + extract call to improve Gemma's accuracy
on real, messy handwritten notebook photos.

Pipeline (in order):
  1. EXIF auto-rotate   — phone photos often arrive sideways/upside-down
  2. Contrast enhance   — autocontrast stretches the histogram; helps faded ink
  3. Sharpness enhance  — sharpens slightly to help with out-of-focus edges
  4. Re-encode to JPEG  — normalises format before sending to the API

The preprocessing is deliberately lightweight: it improves signal without
hallucinating structure that isn't there, which is the real risk with heavy
transforms (binarisation, aggressive thresholding, etc.) on diagrams that have
intentional grayscale shading or light pencil sketches.

Usage:
    from services.preprocess import preprocess_image
    clean_bytes = preprocess_image(raw_bytes)
"""
import io
from PIL import Image, ImageEnhance, ImageOps

# Tuneable constants — adjust if handwriting accuracy is still poor
_CONTRAST_FACTOR = 1.4   # 1.0 = no change; >1 boosts contrast
_SHARPNESS_FACTOR = 1.6  # 1.0 = no change; >1 increases edge sharpness
_MAX_DIMENSION = 2048    # pixels; Gemini handles up to 3000 but 2048 is fast
_JPEG_QUALITY = 88       # re-encode quality; high enough to preserve ink detail


def preprocess_image(image_bytes: bytes) -> bytes:
    """
    Return cleaned-up JPEG bytes ready for Gemma ingestion.

    Steps:
      1. Decode image (any PIL-supported format: JPEG, PNG, WebP, …)
      2. Apply EXIF orientation so the image is always right-side-up
      3. Resize to fit within _MAX_DIMENSION on the longest edge (preserving AR)
      4. Enhance contrast
      5. Enhance sharpness
      6. Re-encode as JPEG

    Raises:
        ValueError: if the bytes cannot be decoded as an image.
    """
    try:
        img = Image.open(io.BytesIO(image_bytes))
    except Exception as exc:
        raise ValueError(f"Cannot decode image: {exc}") from exc

    # 1. EXIF auto-rotate (phone photos)
    img = ImageOps.exif_transpose(img)

    # 2. Convert to RGB (handles RGBA PNGs, palette images, etc.)
    if img.mode != "RGB":
        img = img.convert("RGB")

    # 3. Resize so the longest side ≤ _MAX_DIMENSION
    img.thumbnail((_MAX_DIMENSION, _MAX_DIMENSION), Image.LANCZOS)

    # 4. Contrast enhancement
    img = ImageEnhance.Contrast(img).enhance(_CONTRAST_FACTOR)

    # 5. Sharpness enhancement
    img = ImageEnhance.Sharpness(img).enhance(_SHARPNESS_FACTOR)

    # 6. Re-encode as JPEG
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=_JPEG_QUALITY, optimize=True)
    return buf.getvalue()
