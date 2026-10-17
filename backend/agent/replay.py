import hashlib
import json
import os
 
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DIR = os.path.join(ROOT, "recordings")
 
 
def key(task, payload):
    blob = json.dumps({"task": task, "payload": payload}, sort_keys=True, default=str)
    return hashlib.sha256(blob.encode()).hexdigest()[:16]
 
 
def _path(k):
    return os.path.join(DIR, f"{k}.json")
 
 
def get(k):
    try:
        with open(_path(k)) as f:
            return json.load(f)
    except (OSError, ValueError):
        return None
 
 
def put(k, data):
    os.makedirs(DIR, exist_ok=True)
    with open(_path(k), "w") as f:
        json.dump(data, f, indent=2, sort_keys=True)
 