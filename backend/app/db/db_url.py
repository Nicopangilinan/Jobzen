from __future__ import annotations

import ssl
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit


def normalize_asyncpg_database_url(database_url: str) -> tuple[str, dict[str, Any]]:
    """
    Normalize DB URLs for SQLAlchemy + asyncpg.

    Some providers (including Neon) provide URLs using libpq-style query params
    like `?sslmode=require`. asyncpg does NOT support `sslmode` and will crash with:
      TypeError: connect() got an unexpected keyword argument 'sslmode'

    We strip `sslmode` from the URL and translate it to asyncpg's `ssl` argument.
    """
    parts = urlsplit(database_url)

    # Neon (and many providers) give `postgresql://...` or `postgres://...`.
    # This project uses SQLAlchemy asyncio, so we need the asyncpg dialect.
    scheme = parts.scheme
    if scheme in {"postgres", "postgresql"}:
        scheme = "postgresql+asyncpg"
    query_items = dict(parse_qsl(parts.query, keep_blank_values=True))

    sslmode = query_items.pop("sslmode", None) or query_items.pop("ssl_mode", None)
    connect_args: dict[str, Any] = {}

    if sslmode:
        sslmode_lc = str(sslmode).lower()
        if sslmode_lc in {"disable", "false", "0", "off"}:
            connect_args["ssl"] = False
        else:
            # "require", "verify-ca", "verify-full" -> create a default SSL context.
            connect_args["ssl"] = ssl.create_default_context()

    normalized_query = urlencode(query_items)
    normalized_url = urlunsplit((scheme, parts.netloc, parts.path, normalized_query, parts.fragment))

    return normalized_url, connect_args
