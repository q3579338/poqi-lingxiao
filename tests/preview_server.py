"""Local-only game preview; safe under pythonw without a terminal attached."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from datetime import datetime
import argparse

ROOT = Path(__file__).resolve().parents[1]
LOG = ROOT / 'tests' / 'expedition-out' / 'preview-server.log'
LOG.parent.mkdir(parents=True, exist_ok=True)

class Handler(SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        with LOG.open('a', encoding='utf-8') as stream:
            stream.write(datetime.now().isoformat(timespec='seconds') + ' ' + (fmt % args) + '\n')

    def end_headers(self):
        self.send_header('X-Game-Preview', 'poqi-lingxiao-v08')
        # Revalidate source while keeping the same origin and player storage.
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Run the local-only prototype preview.')
    parser.add_argument('--port', type=int, default=61648)
    args = parser.parse_args()
    with ThreadingHTTPServer(('127.0.0.1', args.port), partial(Handler, directory=str(ROOT / 'web'))) as server:
        server.serve_forever()
