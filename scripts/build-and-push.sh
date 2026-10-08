#!/usr/bin/env bash
set -euo pipefail

registry="${REGISTRY:?Set REGISTRY, for example docker.io/your-user or ACCOUNT.dkr.ecr.REGION.amazonaws.com}"
tag="${IMAGE_TAG:?Set IMAGE_TAG to the 12-character commit id. Mutable tags are refused.}"

case "${tag}" in
  latest|dev|qa|production)
    echo "Refusing mutable image tag: ${tag}" >&2
    exit 1
    ;;
esac

services=(gateway web auth catalog search inventory recommendations cart orders learning labs community certificates leaderboard)

for service in "${services[@]}"; do
  image="${registry}/cloudops-${service}:${tag}"
  echo "Building ${image}"
  docker build --label "org.opencontainers.image.revision=${tag}" -t "${image}" -f "services/${service}/Dockerfile" .
  docker push "${image}"
done

echo "Published ${#services[@]} images with tag ${tag}."
