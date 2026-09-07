"""Inspect real simulator files, and prepare corruption only in disposable CI data."""
import hashlib
import json
import pathlib
import plistlib
import sys

root = pathlib.Path(sys.argv[1]).resolve()
mode = sys.argv[2]
output = pathlib.Path(sys.argv[3])
assert "/CoreSimulator/Devices/" in str(root), "Requires a disposable simulator container"
prefs = plistlib.loads((root / "Library/Preferences/com.embroiderycalc.companion.plist").read_bytes())
pointer = prefs["CapacitorStorage.production-store-pointer"]
previous = prefs["CapacitorStorage.production-store-previous"]

def path(value):
    p = (root / "Documents" / value).resolve()
    assert p.is_relative_to(root / "Documents/production")
    return p

current_bytes = path(pointer).read_bytes()
current = json.loads(current_bytes)
old = json.loads(path(previous).read_bytes())
completed = [j for j in current["jobs"] if j["status"] == "complete"]
assert len(completed) == 1
run = completed[0]["run"]
assert run["startedAt"] and run["completedAt"]
assert len(run["pauses"]) == 1 and run["pauses"][0]["endedAt"]
report = {"mode": mode, "revision": current["revision"], "jobs": len(current["jobs"]),
          "statuses": [j["status"] for j in current["jobs"]], "run": run,
          "snapshotSHA256": hashlib.sha256(current_bytes).hexdigest()}
broken = '{"interrupted":'
if mode == "prepare-recovery":
    assert len(current["jobs"]) == 2
    assert old["jobs"][0]["status"] == "complete"
    path(pointer).write_text(broken)
    report["injectedFault"] = "Truncated current snapshot; valid previous snapshot retained"
elif mode == "verify-recovery":
    assert len(current["jobs"]) == 1
    assert pointer.startswith("production/restored-")
    archives = list((root / "Documents/production").glob("recovery-*.json"))
    assert len(archives) == 1
    archive = json.loads(archives[0].read_bytes())
    assert archive["entries"]["production-store-pointer"]["data"] == broken
    report["exactCorruptBytesPreserved"] = True
else:
    raise ValueError("Unknown mode")
output.write_text(json.dumps(report, indent=2) + "\n")
