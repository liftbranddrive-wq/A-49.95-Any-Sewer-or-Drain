import os

print("--- SEARCHING FOR 'service_id' IN BOOKING INSTANTIATIONS ---")
for root, dirs, files in os.walk("."):
    # Skip virtual environments and git folders
    if "venv" in root or ".venv" in root or ".git" in root:
        continue
    for file in files:
        if file.endswith(".py"):
            filepath = os.path.join(root, file)
            with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                for line_num, line in enumerate(f, 1):
                    if "Booking(" in line or "service_id=" in line:
                        if "service_id" in line:
                            print(f"\n📍 FOUND MATCH IN: {filepath} (Line {line_num})")
                            print(f"   Code: {line.strip()}")
print("\n--- SEARCH COMPLETE ---")