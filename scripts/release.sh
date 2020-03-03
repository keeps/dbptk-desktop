#! /bin/bash

# DEPENDS ON jq:
# apt intall jq

# Version
RELEASE_VERSION=$1
NEXT_VERSION=$2

function syntax {
  echo "Syntax:  $1 RELEASE_VERSION"
  echo "Example: $1 2.2.0"
}

if [[ -z "$RELEASE_VERSION" ]]; then
  syntax $0
  exit 1
fi

cat << EOF
################################
# Release version
################################
EOF

RELEASE_TAG="v$RELEASE_VERSION"

# Updating the package.json version
cat package.json | jq ".version = \"$RELEASE_VERSION\"" | jq ".dbvtkVersion = \"$RELEASE_VERSION\"" > tmp
mv tmp package.json

# Commit version update
git add -u
git commit -m "Setting version $RELEASE_VERSION"

# Create tag
git tag -a "$RELEASE_TAG" -m "Version $RELEASE_VERSION"

# Push tag
git push origin "$RELEASE_TAG"
