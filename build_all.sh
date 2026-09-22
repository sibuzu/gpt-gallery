#!/usr/bin/env bash
set -euo pipefail

# Usage: ./build_all.sh ["commit message"]
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"

if (( $# > 1 )); then
    echo "Usage: $0 [\"commit message\"]" >&2
    exit 1
fi

branch=$(git symbolic-ref --quiet --short HEAD) || {
    echo "Cannot push from a detached HEAD. Check out a branch first." >&2
    exit 1
}
git remote get-url origin > /dev/null
commit_message=${1:-"Build and update gallery"}

python3 scripts/build_gallery.py --site all

git add --all
if git diff --cached --quiet; then
    echo "No changes to commit."
else
    git commit -m "$commit_message"
fi

git push --set-upstream origin "$branch"
