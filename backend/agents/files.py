from fastapi import APIRouter, HTTPException
import os


router = APIRouter()


@router.get("/list")
def list_files(path: str = "/"):
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Path not found")

    if not os.path.isdir(path):
        raise HTTPException(status_code=400, detail="Path is not a directory")

    try:
        items = []
        for entry in os.scandir(path):
            items.append({
                "name": entry.name,
                "path": entry.path,
                "is_dir": entry.is_dir(),
                "size": entry.stat().st_size if not entry.is_dir() else None
            })

        # Sort: directories first, then files
        items.sort(key=lambda x: (not x["is_dir"], x["name"].lower()))

        return {
            "current_path": os.path.abspath(path),
            "parent_path": os.path.dirname(os.path.abspath(path)),
            "items": items
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
