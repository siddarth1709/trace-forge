"""Utility to test, verify, and seed any remote or local FalkorDB instance.

Usage:
  python test_falkor_connection.py --uri "falkor://default:password@host:port"
  python test_falkor_connection.py --host myhost.falkordb.cloud --port 12345 --password mypass --ssl --seed
"""
import argparse
import os
import sys
import time

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
    load_dotenv()
except ImportError:
    pass

from falkordb import FalkorDB


def test_connection(url=None, host=None, port=None, password=None, username=None, ssl=False, seed=False):
    print("=" * 60)
    print("  TRACEFORGE // FalkorDB Connection Tester & Seeder")
    print("=" * 60)

    try:
        if url:
            # Mask password in console output
            display_url = url
            if "@" in display_url and "://" in display_url:
                proto, rest = display_url.split("://", 1)
                creds, server = rest.split("@", 1)
                user = creds.split(":", 1)[0] if ":" in creds else creds
                display_url = f"{proto}://{user}:****@{server}"
            print(f"[>] Connecting via URI: {display_url}")
            db = FalkorDB.from_url(url)
        else:
            host = host or os.getenv("FALKOR_HOST", "localhost")
            port = int(port or os.getenv("FALKOR_PORT", "6379"))
            password = password or os.getenv("FALKOR_PASSWORD") or None
            username = username or os.getenv("FALKOR_USERNAME") or None
            if os.getenv("FALKOR_SSL", "").lower() in ("1", "true", "yes"):
                ssl = True
            
            pwd_masked = "****" if password else "None"
            print(f"[>] Connecting via Host/Port: {host}:{port} (User: {username or 'default'}, Password: {pwd_masked}, SSL: {ssl})")
            db = FalkorDB(
                host=host,
                port=port,
                password=password,
                username=username,
                ssl=ssl,
            )

        # 1. Ping / Test Latency
        t0 = time.perf_counter()
        graphs = db.list_graphs()
        latency_ms = (time.perf_counter() - t0) * 1000
        print(f"[+] [SUCCESS] Connected to FalkorDB! Ping latency: {latency_ms:.2f}ms")
        print(f"[+] Discovered {len(graphs)} graph(s): {graphs}")

        graph_name = os.getenv("TF_GRAPH", "traceforge")
        g = db.select_graph(graph_name)

        # 2. Check or Seed
        if seed or graph_name not in graphs:
            print(f"\n[*] Graph '{graph_name}' {'is empty/missing' if graph_name not in graphs else 'seed requested'}. Seeding scenario S1...")
            # Set environment so seed_traceforge uses the same connection
            if url:
                os.environ["FALKOR_URL"] = url
            else:
                os.environ["FALKOR_HOST"] = host
                os.environ["FALKOR_PORT"] = str(port)
                if password:
                    os.environ["FALKOR_PASSWORD"] = password
                if username:
                    os.environ["FALKOR_USERNAME"] = username
                if ssl:
                    os.environ["FALKOR_SSL"] = "1"

            import seed_traceforge
            seed_traceforge.main(graph_name=graph_name, confirm=True)
            print(f"[+] [SUCCESS] Graph '{graph_name}' seeded successfully!")

        # 3. Verify graph node count
        node_count = g.ro_query("MATCH (n) RETURN count(n)").result_set[0][0]
        edge_count = g.ro_query("MATCH ()-[r]->() RETURN count(r)").result_set[0][0]
        print(f"\n[+] Production Graph '{graph_name}' verified:")
        print(f"    - Nodes: {node_count}")
        print(f"    - Edges: {edge_count}")
        print("=" * 60)
        print("  ALL SYSTEMS READY FOR TRACEFORGE DEPLOYMENT!")
        print("=" * 60)
        return True

    except Exception as exc:
        print(f"\n[-] [ERROR] Connection failed: {exc}")
        print("[-] Check your host, port, credentials, or network firewalls.")
        return False


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Test and seed FalkorDB connection")
    parser.add_argument("--uri", help="FalkorDB connection URI (e.g. falkor://default:pass@host:port)")
    parser.add_argument("--host", help="FalkorDB host")
    parser.add_argument("--port", type=int, help="FalkorDB port")
    parser.add_argument("--password", help="FalkorDB password")
    parser.add_argument("--username", help="FalkorDB username")
    parser.add_argument("--ssl", action="store_true", help="Enable SSL/TLS")
    parser.add_argument("--seed", action="store_true", help="Seed scenario S1 after connecting")

    args = parser.parse_args()

    # Fallback to env vars if no flags provided
    url = args.uri or os.getenv("FALKOR_URL") or os.getenv("FALKORDB_URL") or os.getenv("REDIS_URL")
    success = test_connection(
        url=url,
        host=args.host,
        port=args.port,
        password=args.password,
        username=args.username,
        ssl=args.ssl,
        seed=args.seed or ("--seed" in sys.argv),
    )
    sys.exit(0 if success else 1)
