"""
Vercel Serverless entrypoint.

Routes are mapped in vercel.json so that /api/*, /auth/*, and /health go to this ASGI app.
"""

from __future__ import annotations

import os
import sys

# Ensure `backend/app` is importable when running from the repository root on Vercel.
_ROOT = os.path.dirname(os.path.dirname(__file__))
_BACKEND_DIR = os.path.join(_ROOT, "backend")
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

from app.main import app  # noqa: E402

