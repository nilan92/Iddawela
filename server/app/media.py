import io, uuid
from PIL import Image, ImageOps
from .config import MEDIA_DIR

def process_image(data: bytes, max_edge=1600, thumb_edge=420):
    img = Image.open(io.BytesIO(data))
    img = ImageOps.exif_transpose(img)
    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")
    key = uuid.uuid4().hex
    sub = MEDIA_DIR / key[:2]
    sub.mkdir(parents=True, exist_ok=True)
    big = img.copy(); big.thumbnail((max_edge, max_edge), Image.LANCZOS)
    big.save(sub / f"{key}.webp", "WEBP", quality=80, method=5)
    th = ImageOps.fit(img, (thumb_edge, thumb_edge), Image.LANCZOS, centering=(0.5, 0.35))
    th.save(sub / f"{key}_t.webp", "WEBP", quality=74, method=5)
    return f"{key[:2]}/{key}.webp", f"{key[:2]}/{key}_t.webp", big.width, big.height
