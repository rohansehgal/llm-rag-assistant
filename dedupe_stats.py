import json

STATS_FILE = "stats.json"

def deduplicate_stats():
    try:
        with open(STATS_FILE, "r") as f:
            stats = json.load(f)
    except Exception as e:
        print(f"❌ Failed to load stats file: {e}")
        return

    seen = set()
    deduped = []

    for entry in stats:
        key = (entry["question"], entry["model"])
        if key not in seen:
            deduped.append(entry)
            seen.add(key)

    print(f"✅ Original entries: {len(stats)}")
    print(f"✅ Deduplicated entries: {len(deduped)}")

    with open(STATS_FILE, "w") as f:
        json.dump(deduped, f, indent=2)

    print("🧹 Deduplicated stats.json saved!")

if __name__ == "__main__":
    deduplicate_stats()
