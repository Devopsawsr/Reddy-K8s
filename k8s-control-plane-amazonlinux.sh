#!/bin/bash
#
# Setup for Control Plane (Master) servers - Amazon Linux 2/AL2023 Optimized

set -euxo pipefail

# Configuration Variables
PUBLIC_IP_ACCESS="false"
NODENAME=$(hostname -s)
POD_CIDR="192.168.0.0/16"

echo "Starting Kubernetes Control Plane setup on Amazon Linux..."
echo "Node name: $NODENAME"
echo "Pod CIDR: $POD_CIDR"
echo "Public IP access: $PUBLIC_IP_ACCESS"

# Pull required images
echo "Pulling Kubernetes images..."
sudo kubeadm config images pull

# Detect the primary network interface for Amazon Linux
# Amazon Linux typically uses different interface names
detect_primary_interface() {
    # Common Amazon Linux interface names in order of preference
    local interfaces=("eth0" "ens5" "enp0s3" "eth1")
    
    for iface in "${interfaces[@]}"; do
        if ip addr show "$iface" 2>/dev/null | grep -q "inet "; then
            echo "$iface"
            return 0
        fi
    done
    
    # Fallback: get the interface with default route
    ip route | grep default | awk '{print $5}' | head -1
}

PRIMARY_INTERFACE=$(detect_primary_interface)
echo "Detected primary network interface: $PRIMARY_INTERFACE"

# Initialize kubeadm based on PUBLIC_IP_ACCESS
if [[ "$PUBLIC_IP_ACCESS" == "false" ]]; then
    echo "Setting up for private IP access..."
    
    # Get private IP from the primary interface
    MASTER_PRIVATE_IP=$(ip addr show "$PRIMARY_INTERFACE" | awk '/inet / {print $2}' | cut -d/ -f1 | head -1)
    
    if [ -z "$MASTER_PRIVATE_IP" ]; then
        echo "Error: Could not detect private IP address"
        exit 1
    fi
    
    echo "Using private IP: $MASTER_PRIVATE_IP"
    
    sudo kubeadm init \
        --apiserver-advertise-address="$MASTER_PRIVATE_IP" \
        --apiserver-cert-extra-sans="$MASTER_PRIVATE_IP" \
        --pod-network-cidr="$POD_CIDR" \
        --node-name="$NODENAME" \
        --ignore-preflight-errors=Swap \
        --cri-socket="unix:///run/containerd/containerd.sock"

elif [[ "$PUBLIC_IP_ACCESS" == "true" ]]; then
    echo "Setting up for public IP access..."
    
    # Get public IP with fallback methods for Amazon Linux
    MASTER_PUBLIC_IP=""
    
    # Try different methods to get public IP
    if command -v curl &> /dev/null; then
        MASTER_PUBLIC_IP=$(curl -s --max-time 10 ifconfig.me 2>/dev/null || curl -s --max-time 10 icanhazip.com 2>/dev/null || curl -s --max-time 10 ipecho.net/plain 2>/dev/null || true)
    elif command -v wget &> /dev/null; then
        MASTER_PUBLIC_IP=$(wget -qO- --timeout=10 ifconfig.me 2>/dev/null || wget -qO- --timeout=10 icanhazip.com 2>/dev/null || true)
    fi
    
    if [ -z "$MASTER_PUBLIC_IP" ]; then
        echo "Error: Could not detect public IP address"
        echo "Please check internet connectivity and try again"
        exit 1
    fi
    
    echo "Using public IP: $MASTER_PUBLIC_IP"
    
    sudo kubeadm init \
        --control-plane-endpoint="$MASTER_PUBLIC_IP" \
        --apiserver-cert-extra-sans="$MASTER_PUBLIC_IP" \
        --pod-network-cidr="$POD_CIDR" \
        --node-name="$NODENAME" \
        --ignore-preflight-errors=Swap \
        --cri-socket="unix:///run/containerd/containerd.sock"

else
    echo "Error: PUBLIC_IP_ACCESS has an invalid value: $PUBLIC_IP_ACCESS"
    echo "Valid values are 'true' or 'false'"
    exit 1
fi

# Configure kubeconfig
echo "Configuring kubectl access..."
mkdir -p "$HOME"/.kube
sudo cp -i /etc/kubernetes/admin.conf "$HOME"/.kube/config
sudo chown "$(id -u)":"$(id -g)" "$HOME"/.kube/config

# Verify kubectl configuration
echo "Verifying kubectl configuration..."
kubectl cluster-info

# Install Calico Network Plugin (using stable version that works)
echo "Installing Calico network plugin..."

# First, clean up any existing Calico resources if the previous install failed
kubectl delete namespace tigera-operator 2>/dev/null || true
sleep 5

# Use a stable version that doesn't have the annotation size issue
echo "Downloading and applying Calico manifests..."
curl -o calico.yaml https://raw.githubusercontent.com/projectcalico/calico/v3.25.1/manifests/calico.yaml

# Modify the CIDR in the downloaded manifest to match our POD_CIDR
sed -i "s|192.168.0.0/16|$POD_CIDR|g" calico.yaml

# Apply the modified manifest
kubectl apply -f calico.yaml

# Clean up the downloaded file
rm calico.yaml

# Wait for Calico to be ready
echo "Waiting for Calico pods to be ready..."
kubectl wait --for=condition=Ready pods -l k8s-app=calico-node -n kube-system --timeout=300s || {
    echo "Calico pods not ready yet, checking status..."
    kubectl get pods -n kube-system | grep calico
}

# Remove taint from master node to allow pod scheduling (optional)
# Uncomment the next line if you want to run pods on the control plane node
# kubectl taint nodes --all node-role.kubernetes.io/control-plane-

# Display cluster status
echo ""
echo "==============================================="
echo "Control Plane setup completed successfully!"
echo "==============================================="
echo ""

# Show cluster information
echo "=== Cluster Information ==="
kubectl get nodes -o wide
echo ""
kubectl get pods -A -o wide
echo ""

# Generate worker join command
echo "=== Worker Node Join Command ==="
echo "Run this command on worker nodes to join them to the cluster:"
echo ""
sudo kubeadm token create --print-join-command
echo ""

echo "=== Next Steps ==="
echo "1. Save the join command above for worker nodes"
echo "2. Copy /etc/kubernetes/admin.conf to other machines for kubectl access"
echo "3. Run 'kubectl get nodes' to verify cluster status"
echo "4. Install additional cluster components as needed"

# Display useful commands
echo ""
echo "=== Useful Commands ==="
echo "Check cluster status: kubectl get nodes"
echo "Check all pods: kubectl get pods -A"
echo "Check Calico status: kubectl get pods -n kube-system | grep calico"
echo "Get cluster info: kubectl cluster-info"
echo ""

echo "Control Plane setup completed successfully!"