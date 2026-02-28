"""
Vercel Serverless Function - FastAPI ASGI handler
Wraps the FastAPI app with Mangum ASGI adapter for Vercel
"""
import json
import traceback
from http.server import BaseHTTPRequestHandler

_init_error: str | None = None

try:
    from mangum import Mangum
    from app.main import app
    handler = Mangum(app, lifespan="off")
except Exception as _e:
    _init_error = f"{type(_e).__name__}: {_e}\n{traceback.format_exc()}"

    class handler(BaseHTTPRequestHandler):  # type: ignore[no-redef]
        def do_GET(self):
            body = json.dumps({"startup_error": _init_error}).encode()
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        do_POST = do_GET
