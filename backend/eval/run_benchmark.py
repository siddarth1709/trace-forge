import json
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
os.environ["TF_GRAPH"] = "tf-bench"  

import tf_core as core  
from eval import baseline_agent as base  
from scenarios.variants import build_variant  

N = int(os.getenv("TF_BENCH_N", "20"))
LIMITS = ("Synthetic scenarios generated from a seed, one baseline strategy, small sample. "
          "The graph agent here runs the deterministic tools (no LLM); the benchmark measures the "
          "graph approach, not language quality. Both agents are scored against the same edge list.")


def run_one(seed):
    spec = build_variant(core.db, "tf-bench", seed, footholds=3 + seed % 3, chain=1 + seed % 3, apps=1 + seed % 2)
    sources, target, edges = spec["sources"], spec["target"], spec["edges"]

    t0 = time.time()
    plan = core.min_cut(sources, target)
    sim = core.simulate(plan["cut"], sources, target)
    ver = core.verify(sim["sim_id"], sources, target)
    core.drop_sim(sim["sim_id"])
    cut_pairs = {(c["src"], c["dst"]) for c in plan["cut"]}
    graph_row = {"remaining": ver["after"], "cut_size": plan["size"], "disruption": plan["disruption"],
                 "tool_calls": 4, "ms": int((time.time() - t0) * 1000),
                 "matches_truth": plan["size"] == spec["truth"]["min_cut_size"],
                 "agrees_with_networkx": ver["after"] == base.remaining_paths(edges, sources, target,
                                                                              removed_edges=cut_pairs)}

    t0 = time.time()
    logs = base.make_logs(edges)
    removed = set(base.propose(logs, spec["alerted"], rounds=2))
    base_row = {"remaining": base.remaining_paths(edges, sources, target, removed_nodes=removed),
                "removed_nodes": len(removed), "disruption": base.disruption(edges, removed_nodes=removed),
                "tool_calls": 2, "ms": int((time.time() - t0) * 1000)}
    return {"seed": seed, "paths_before": spec["truth"]["path_count"], "truth_min_cut": spec["truth"]["min_cut_size"],
            "graph": graph_row, "baseline": base_row}


def agg(rows, key):
    n = len(rows)
    return {"contained_pct": round(100 * sum(r[key]["remaining"] == 0 for r in rows) / n, 1),
            "mean_remaining_paths": round(sum(r[key]["remaining"] for r in rows) / n, 2),
            "mean_disruption": round(sum(r[key]["disruption"] for r in rows) / n, 1),
            "mean_ms": round(sum(r[key]["ms"] for r in rows) / n, 1)}


def main():
    rows = [run_one(seed) for seed in range(1, N + 1)]
    result = {"n": len(rows), "limits": LIMITS, "graph_agent": agg(rows, "graph"), "baseline": agg(rows, "baseline"),
              "graph_cut_matches_truth_pct": round(100 * sum(r["graph"]["matches_truth"] for r in rows) / len(rows), 1),
              "graph_agrees_with_networkx_pct": round(100 * sum(r["graph"]["agrees_with_networkx"] for r in rows) / len(rows), 1),
              "variants": rows}
    os.makedirs(os.path.join(HERE, "results"), exist_ok=True)
    with open(os.path.join(HERE, "results", "benchmark.json"), "w") as f:
        json.dump(result, f, indent=2)
    print(f"{'':16}{'contained %':>13}{'remaining':>11}{'disruption':>12}{'ms':>8}")
    for name, key in (("graph agent", "graph_agent"), ("flat-log base", "baseline")):
        a = result[key]
        print(f"{name:16}{a['contained_pct']:>13}{a['mean_remaining_paths']:>11}{a['mean_disruption']:>12}{a['mean_ms']:>8}")
    print("cut matches ground truth:", result["graph_cut_matches_truth_pct"], "%  |  agrees with networkx:",
          result["graph_agrees_with_networkx_pct"], "%")
    print("Saved eval/results/benchmark.json")


if __name__ == "__main__":
    main()