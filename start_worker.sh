#!/bin/bash
set -e

# Cloud Run requires a container to respond on port 8080.
# Start a minimal health check server in the background,
# then run the Celery worker + Beat in the foreground.

python3 -c "
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading, json

class HealthHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(b'{\"status\":\"ok\",\"role\":\"worker\"}')
    def log_message(self, *args):
        pass  # suppress access logs

server = HTTPServer(('0.0.0.0', 8080), HealthHandler)
threading.Thread(target=server.serve_forever, daemon=True).start()
print('[worker] Health check server listening on :8080')
" &

exec celery -A api.tasks.celery_app worker \
  --beat \
  --schedule=/data/celerybeat-schedule \
  --loglevel=info \
  --concurrency=1 \
  --pool=prefork
