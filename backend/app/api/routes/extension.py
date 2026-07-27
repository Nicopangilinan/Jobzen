import io
import os
import zipfile
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/extension", tags=["extension"])

@router.get("/download")
async def download_extension():
    """Dynamically zip and serve the Chrome extension folder."""
    # Find project root extension folder
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(current_dir, "..", "..", ".."))
    base_dir = os.path.join(project_root, "extension")

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        if os.path.exists(base_dir):
            for root, dirs, files in os.walk(base_dir):
                for file in files:
                    if file in ["resize_icons.py", "resizer.html"]:
                        continue
                    file_path = os.path.join(root, file)
                    archive_name = os.path.relpath(file_path, base_dir)
                    zf.write(file_path, archive_name)

    zip_buffer.seek(0)
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=JobZen-Extension.zip"}
    )
