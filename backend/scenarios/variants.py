import random

import networkx as nx

from .common import add_edge, add_node


def generate_variant(seed, footholds=4, chain=1, apps=1, distractors=12):
    rnd = random.Random(seed)
    target = "Critical Server"
    nodes = [("Server", target, {"type": "server", "criticality": "critical"})]
    edges = []  # (src, rel, dst, observed_at, benign_load)
    clock = [100]

    def tick():
        clock[0] += 10
        return clock[0]

    creds = [f"Shared Credential {i + 1}" for i in range(max(1, footholds // 2))]
    nodes += [("Credential", c, {"type": "credential"}) for c in creds]
    sources = []
    for i in range(footholds):
        f = f"Foothold {i + 1}"
        sources.append(f)
        nodes.append(("Workstation", f, {"type": "workstation"}))
        edges.append((f, "USES", rnd.choice(creds), tick(), rnd.randint(0, 5)))
    for ci, c in enumerate(creds):
        prev, rel = c, "AUTHENTICATES_TO"
        for h in range(chain):  # chain > 1 gives multi-hop lateral movement (scenario S3)
            host = f"Admin Host {ci + 1}-{h + 1}"
            nodes.append(("Workstation", host, {"type": "workstation", "criticality": "high"}))
            edges.append((prev, rel, host, tick(), rnd.randint(1, 10)))
            prev, rel = host, "ACCESSES"
        edges.append((prev, "ACCESSES", target, tick(), rnd.randint(20, 60)))
    for a in range(apps):
        sa, app = f"Service Account {a + 1}", f"Application Server {a + 1}"
        sources.append(sa)
        nodes += [("Account", sa, {"type": "service_account"}),
                  ("Server", app, {"type": "server", "criticality": "medium"})]
        edges.append((sa, "AUTHENTICATES_TO", app, tick(), rnd.randint(10, 40)))
        edges.append((app, "ACCESSES", target, tick(), rnd.randint(60, 150)))
    nodes += [("Server", "Build Server", {"type": "server"}), ("Server", "Printer", {"type": "device"})]
    for i in range(distractors):
        lap, dc = f"Dev Laptop {i + 1:02d}", f"Dev Credential {i % 3 + 1}"
        nodes.append(("Workstation", lap, {"type": "workstation"}))
        if i < 3:
            nodes.append(("Credential", dc, {"type": "credential"}))
            edges.append((dc, "AUTHENTICATES_TO", "Build Server", tick(), 50))
        edges.append((lap, "USES", dc, tick(), 20))
    edges.append((sources[0], "ACCESSES", "Printer", tick(), 25))

    G = nx.DiGraph()
    H = nx.DiGraph()
    for s, _, d, _, _ in edges:
        G.add_edge(s, d)
        H.add_edge(s, d, capacity=1)
    for s in sources:
        H.add_edge("__SRC__", s, capacity=10**6)
    path_count = sum(len(list(nx.all_simple_paths(G, s, target))) for s in sources if s in G and target in G)
    cut_size = int(nx.minimum_cut_value(H, "__SRC__", target)) if target in H else 0
    return {"seed": seed, "nodes": nodes, "edges": edges, "sources": sources, "target": target,
            "alerted": sources[0], "truth": {"path_count": path_count, "min_cut_size": cut_size}}


def build_variant(db, graph, seed, **kwargs):
    spec = generate_variant(seed, **kwargs)
    try:
        db.select_graph(graph).delete()
    except Exception:
        pass  
    g = db.select_graph(graph)
    for label, name, props in spec["nodes"]:
        add_node(g, label, name, **props)
    for s, rel, d, t, load in spec["edges"]:
        add_edge(g, s, rel, d, t, load=load)
    return spec