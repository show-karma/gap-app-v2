"""Map every gap-indexer v2 route to its auth posture.

Reads the Fastify route registrations and reports, per URL, whether the route
carries `requireAuthentication`, `requirePermission`, `optionalAuthentication`,
or no auth preHandler at all. `optionalAuthentication` is the only posture where
a response can legitimately differ with and without an `Authorization` header —
which is exactly the set D2 has to be careful with.
"""

import io
import os
import re
import sys

ROOT = sys.argv[1] if len(sys.argv) > 1 else "."
ROUTES = os.path.join(ROOT, "app", "modules", "v2", "api", "routes")

CALL = re.compile(r"fastify\.(get|post|put|patch|delete)\(\s*['\"]([^'\"]+)['\"]", re.I)
AUTH = re.compile(r"(requireAuthentication|requirePermission|optionalAuthentication|requireApiKey)")

rows = []
for base, _dirs, files in os.walk(ROUTES):
    for f in files:
        if not f.endswith(".ts"):
            continue
        p = os.path.join(base, f)
        s = io.open(p, encoding="utf-8", errors="ignore").read()
        for m in CALL.finditer(s):
            method, url = m.group(1).upper(), m.group(2)
            # the options object runs from the call site to the handler
            tail = s[m.end(): m.end() + 1400]
            stop = tail.find("handler:")
            window = tail[: stop if stop != -1 else 1400]
            found = sorted(set(AUTH.findall(window)))
            rows.append((url, method, found, os.path.relpath(p, ROOT).replace(os.sep, "/")))

wanted = sys.argv[2:] if len(sys.argv) > 2 else []
for url, method, found, src in sorted(rows):
    if wanted and not any(w in url for w in wanted):
        continue
    posture = "+".join(found) if found else "PUBLIC (no auth preHandler)"
    print(f"{method:6s} {url:52s} {posture:34s} {src}")
