#!/bin/bash
#
# Fix Calico Installation - Run this to fix the current issue

echo "Cleaning up failed Calico installation..."

# Remove the tigera-operator namespace and all its resources
kubectl delete namespace tigera-operator --ignore-not-found=true

# Wait for cleanup
echo "Waiting for cleanup to complete..."
sleep 10

# Remove any remaining CRDs
kubectl delete crd installations.operator.tigera.io --ignore-not-found=true
kubectl delete crd tigerastatuses.operator.tigera.io --ignore-not-found=true

echo "Installing working version of Calico..."

# Download the stable Calico manifest
curl -o calico.yaml https://raw.githubusercontent.com/projectcalico/calico/v3.25.1/manifests/calico.yaml

# Apply the manifest
kubectl apply -f calico.yaml

# Wait for Calico to be ready
echo "Waiting for Calico to start..."
sleep 30

# Check status
echo "Checking Calico status..."
kubectl get pods -n kube-system | grep calico

echo ""
echo "Calico installation fixed!"
echo "Check status with: kubectl get pods -n kube-system"

# Clean up
rm calico.yaml