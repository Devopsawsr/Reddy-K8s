#!/usr/bin/env bash
set -euo pipefail

environment="${1:?Usage: set-overlay-images.sh ENVIRONMENT REGISTRY IMAGE_TAG}"
registry="${2:?Registry is required}"
image_tag="${3:?Image tag is required}"
overlay="infra/k8s/overlays/${environment}"

services=(gateway web auth catalog cart orders learning labs community certificates leaderboard)

[[ -d "${overlay}" ]] || {
  echo "Unknown environment overlay: ${overlay}" >&2
  exit 1
}

case "${image_tag}" in
  latest|dev|qa|production)
    echo "Refusing mutable image tag: ${image_tag}" >&2
    exit 1
    ;;
esac

images=()
for service in "${services[@]}"; do
  images+=("cloudops/${service}=${registry}/cloudops-${service}:${image_tag}")
done

(
  cd "${overlay}"
  kustomize edit set image "${images[@]}"
)

kubectl kustomize "${overlay}" >/dev/null
echo "Updated ${environment} to ${registry} with immutable tag ${image_tag}."
