#!/usr/bin/env python3
# tools/sync_prompts.py
"""
Pull all docs from a Google Drive folder, regenerate story HTML/JSON, and
write results into `prompts/` and `prompts/CYOA/`.
"""

import base64
import io
import json
import os
import re
import shutil
import sys
import time
from pathlib import Path
import importlib.util

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaIoBaseDownload


ROOT = Path(__file__).resolve().parents[1]
TOOLS_DIR = Path(__file__).resolve().parent
PROMPTS_DIR = ROOT / "prompts"
CYOA_DIR = PROMPTS_DIR / "CYOA"
TMP_DIR = ROOT / ".cache" / "google_docs_txt"

DOC_MIMETYPE = "application/vnd.google-apps.document"
TXT_MIMETYPE = "text/plain"
RETRY_STATUS_CODES = {429, 500, 502, 503}
MAX_DOWNLOAD_RETRIES = 5


def load_module(path, module_name):
    spec = importlib.util.spec_from_file_location(module_name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)  # type: ignore[attr-defined]
    return module


HTML_MODULE = load_module(TOOLS_DIR / "storyHtmlGenerator.py", "story_html_generator")
JSON_MODULE = load_module(TOOLS_DIR / "storyJsonGenerator.py", "story_json_generator")
PROMPT_INDEX_MODULE = load_module(
    TOOLS_DIR / "update_prompt_index.py", "update_prompt_index"
)


def decode_service_account():
    raw = os.environ.get("GOOGLE_SERVICE_ACCOUNT")
    if not raw:
        print("Missing env var: GOOGLE_SERVICE_ACCOUNT", file=sys.stderr)
        sys.exit(1)
    try:
        data = base64.b64decode(raw)
        return json.loads(data)
    except Exception as exc:  # pylint: disable=broad-exception-caught
        raise SystemExit(f"Failed to decode GOOGLE_SERVICE_ACCOUNT: {exc}") from exc


def drive_client():
    creds_info = decode_service_account()
    creds = service_account.Credentials.from_service_account_info(
        creds_info,
        scopes=["https://www.googleapis.com/auth/drive.readonly"],
    )
    return build("drive", "v3", credentials=creds, cache_discovery=False)


def sanitize_filename(name: str, fallback: str) -> Path:
    name = (name or "").strip()
    if not name:
        name = fallback
    candidate = Path(name)
    if candidate.is_absolute():
        candidate = Path(candidate.name)
    safe_parts = []
    for part in candidate.parts:
        if not part or part in (".", ".."):
            continue
        safe_parts.append(re.sub(r"[^\w.\- ]+", "_", part))
    if not safe_parts:
        safe_parts = [fallback]
    return Path(*safe_parts)


def ensure_suffix(path: Path, suffix: str) -> Path:
    suffix = suffix if suffix.startswith(".") else f".{suffix}"
    return path if path.suffix.lower() == suffix.lower() else path.with_suffix(suffix)


def download_docs(folder_id: str, out_dir: Path):
    out_dir.mkdir(parents=True, exist_ok=True)
    service = drive_client()
    q = (
        f"'{folder_id}' in parents and trashed=false and "
        f"(mimeType='{DOC_MIMETYPE}' or mimeType='{TXT_MIMETYPE}')"
    )

    page_token = None
    downloaded = []
    while True:
        response = (
            service.files()
            .list(
                q=q,
                fields="nextPageToken, files(id, name, mimeType)",
                spaces="drive",
                pageToken=page_token,
            )
            .execute()
        )
        for meta in response.get("files", []):
            file_id = meta["id"]
            mime = meta["mimeType"]
            base_name = sanitize_filename(meta["name"], f"{file_id}.txt")
            txt_path = ensure_suffix(out_dir / base_name, ".txt")

            content = download_with_retry(service, meta)
            txt_path.write_bytes(content)
            downloaded.append(txt_path)
            print(f"Saved {meta['name']} -> {txt_path}")
        page_token = response.get("nextPageToken")
        if not page_token:
            break
    return downloaded


def download_with_retry(service, meta):
    file_id = meta["id"]
    mime = meta["mimeType"]
    name = meta["name"]

    for attempt in range(1, MAX_DOWNLOAD_RETRIES + 1):
        try:
            if mime == DOC_MIMETYPE:
                request = service.files().export_media(
                    fileId=file_id, mimeType=TXT_MIMETYPE
                )
            else:
                request = service.files().get_media(fileId=file_id)

            fh = io.BytesIO()
            downloader = MediaIoBaseDownload(fh, request)
            done = False
            while not done:
                status, done = downloader.next_chunk()
                if status:
                    print(f"Downloading {name}... {int(status.progress() * 100)}%")
            return fh.getvalue()
        except HttpError as err:
            status_code = getattr(err.resp, "status", None)
            if status_code not in RETRY_STATUS_CODES or attempt == MAX_DOWNLOAD_RETRIES:
                raise
            wait_seconds = min(30, 2 ** attempt)
            print(
                f"Retrying {name} after HTTP {status_code} "
                f"(attempt {attempt}/{MAX_DOWNLOAD_RETRIES}) in {wait_seconds}s"
            )
            time.sleep(wait_seconds)
    raise RuntimeError(f"Failed to download {name} after {MAX_DOWNLOAD_RETRIES} attempts")


def generate_outputs(txt_path: Path):
    print(f"Processing {txt_path}")
    html_gen = HTML_MODULE.StoryHTMLGenerator(str(txt_path))
    html_text = html_gen.generate_html()
    declared_html = sanitize_filename(
        html_gen.file_name or f"{txt_path.stem}.html", f"{txt_path.stem}.html"
    )
    staging_html = ensure_suffix(TOOLS_DIR / declared_html, ".html")
    staging_html.write_text(html_text, encoding="utf-8")
    target_html = ensure_suffix(PROMPTS_DIR / declared_html, ".html")
    target_html.parent.mkdir(parents=True, exist_ok=True)
    if target_html.exists():
        target_html.unlink()
    shutil.move(str(staging_html), str(target_html))
    print(f"-> HTML written to {target_html}")

    json_gen = JSON_MODULE.StoryJSONGenerator(str(txt_path))
    json_gen.parse()
    if json_gen.story_type != "dice":
        print("   (skipped JSON: Type is not 'dice')")
        return
    json_text = json_gen.to_json()
    declared_json = sanitize_filename(
        json_gen.file_name or txt_path.stem, txt_path.stem
    )
    declared_json = ensure_suffix(declared_json, ".json")
    staging_json = ensure_suffix(TOOLS_DIR / declared_json, ".json")
    staging_json.write_text(json_text, encoding="utf-8")
    target_json = CYOA_DIR / declared_json
    target_json.parent.mkdir(parents=True, exist_ok=True)
    if target_json.exists():
        target_json.unlink()
    shutil.move(str(staging_json), str(target_json))
    print(f"-> JSON written to {target_json}")


def main():
    folder_id = os.environ.get("GOOGLE_DRIVE_FOLDER_ID") or (
        sys.argv[1] if len(sys.argv) > 1 else None
    )
    if not folder_id:
        print("Provide the Drive folder ID via GOOGLE_DRIVE_FOLDER_ID or CLI.", file=sys.stderr)
        sys.exit(1)

    if TMP_DIR.exists():
        shutil.rmtree(TMP_DIR)
    TMP_DIR.mkdir(parents=True, exist_ok=True)

    try:
        txt_files = download_docs(folder_id, TMP_DIR)
        if not txt_files:
            print("No documents found to process.")
        else:
            for txt in txt_files:
                generate_outputs(txt)
        PROMPT_INDEX_MODULE.main()
    finally:
        shutil.rmtree(TMP_DIR, ignore_errors=True)


if __name__ == "__main__":
    main()
