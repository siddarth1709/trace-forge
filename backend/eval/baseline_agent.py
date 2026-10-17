import networkx as nx


def make_logs(edges):
    return [{"text": f"{s} {rel.lower()} {d}", "src": s, "dst": d, "rel": rel, "load": load}
            for s, rel, d, _, load in edges]


def retrieve(logs, alerted, rounds=2):
    frontier, seen, lines = {alerted}, {alerted}, []
    for _ in range(rounds):
        hits = [line for line in logs if (line["src"] in frontier or line["dst"] in frontier) and line not in lines]
        lines += hits
        new = {e for line in hits for e in (line["src"], line["dst"])} - seen
        seen |= new
        frontier = new
    return lines, seen


def propose(logs, alerted, rounds=2):
    _, entities = retrieve(logs, alerted, rounds)
    return [alerted] + sorted(e for e in entities if "credential" in e.lower())


def _graph(edges, removed_nodes=(), removed_edges=()):
    G = nx.DiGraph()
    for s, _, d, _, _ in edges:
        if s in removed_nodes or d in removed_nodes or (s, d) in removed_edges:
            continue
        G.add_edge(s, d)
    return G


def remaining_paths(edges, sources, target, removed_nodes=(), removed_edges=()):
    G = _graph(edges, set(removed_nodes), set(removed_edges))
    return sum(len(list(nx.all_simple_paths(G, s, target))) for s in sources if s in G and target in G)


def disruption(edges, removed_nodes=(), removed_edges=()):
    nodes, pairs = set(removed_nodes), set(removed_edges)
    return sum(load for s, _, d, _, load in edges if s in nodes or d in nodes or (s, d) in pairs)