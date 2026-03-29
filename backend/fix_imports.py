import os

fixed_files = []

for root, dirs, files in os.walk("app"):
    for file in files:
        if file.endswith(".py"):
            path = os.path.join(root, file)
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            if "from backend.app." in content:
                content = content.replace("from backend.app.", "from app.")
                with open(path, "w", encoding="utf-8") as f:
                    f.write(content)
                fixed_files.append(path)

print(f"\n✅ Fixed {len(fixed_files)} files:")
for f in fixed_files:
    print(f"  - {f}")