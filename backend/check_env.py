"""Run this file first (VS Code: open it and press the Run button).
It shows which Python is running, whether the packages import, and whether FalkorDB answers.
"""
import importlib
import importlib.metadata as md
import os
import sys

print("Python:", sys.version.split()[0])
if sys.version_info < (3, 10):
    print("PROBLEM: the mcp package needs Python 3.10 or newer. Install a newer Python "
          "(python.org or Homebrew) and recreate the .venv with it.")
print("Interpreter:", sys.executable)
print("Folder:", os.getcwd())

# A file named like a package shadows the real package and causes import errors.
for shadow in ("fastapi.py", "falkordb.py", "uvicorn.py", "pydantic.py", "networkx.py"):
    if os.path.exists(shadow):
        print(f"PROBLEM: {shadow} is in this folder and hides the real package. Rename or delete it.")

for pkg in ("fastapi", "uvicorn", "pydantic", "falkordb", "networkx", "mcp", "anthropic", "pytest"):
    try:
        importlib.import_module(pkg)
        print(f"PASS {pkg} {md.version(pkg)}")
    except Exception as e:
        print(f"FAIL {pkg}: {e}")

try:
    from falkordb import FalkorDB

    graph = os.getenv("TF_GRAPH", "traceforge")
    db = FalkorDB(host=os.getenv("FALKOR_HOST", "localhost"), port=int(os.getenv("FALKOR_PORT", "6379")))
    print("PASS connected to FalkorDB; graphs:", db.list_graphs())
    g = db.select_graph(graph)
    print("PASS nodes:", g.ro_query("MATCH (n) RETURN count(n)").result_set[0][0],
          "edges:", g.ro_query("MATCH ()-[r]->() RETURN count(r)").result_set[0][0], "(expect 8 and 6)")
except Exception as e:
    print("FAIL FalkorDB:", e, "- is Docker Desktop running with the FalkorDB container started?")