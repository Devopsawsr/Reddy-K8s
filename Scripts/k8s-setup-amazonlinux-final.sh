#!/bin/bash
#
# Kubernetes Setup for Amazon Linux 2/AL2023 - Optimized for First-Time Server Setup
# No crontab dependency, handles curl/wget gracefully

set -euxo pipefail

# Kubernetes Variable Declaration
KUBERNETES_VERSION="v1.32"
CONTAINERD_VERSION="2.2.0"
RUNC_VERSION="1.3.3"
CRICTL_VERSION="v1.32.0"
KUBERNETES_INSTALL_VERSION="1.32.0"

echo "Starting Kubernetes setup for Amazon Linux..."

# Disable swap
echo "Disabling swap..."
sudo swapoff -a

# Make swap disable persistent across reboots (no crontab needed)
sudo sed -i '/swap/d' /etc/fstab
echo "Swap disabled permanently"

# Detect package manager
if command -v dnf &> /dev/null; then
    PACKAGE_MANAGER="dnf"
    echo "Using DNF package manager"
else
    PACKAGE_MANAGER="yum"
    echo "Using YUM package manager"
fi

# Update system packages
echo "Updating system packages..."
sudo $PACKAGE_MANAGER update -y

# Install essential packages
echo "Installing essential packages..."
sudo $PACKAGE_MANAGER install -y ca-certificates gnupg wget tar gzip

# Check for curl availability, install if needed
if ! command -v curl &> /dev/null; then
    echo "curl not found, installing..."
    # Remove curl-minimal if it exists and conflicts
    sudo $PACKAGE_MANAGER remove -y curl-minimal 2>/dev/null || true
    sudo $PACKAGE_MANAGER install -y curl
fi

# Create the .conf file to load the modules at bootup
echo "Configuring kernel modules..."
cat <<EOF | sudo tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF

sudo modprobe overlay
sudo modprobe br_netfilter

# Sysctl params required by setup, params persist across reboots
echo "Configuring sysctl parameters..."
cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF

# Apply sysctl params without reboot
sudo sysctl --system

# Download and install containerd
echo "Installing containerd runtime..."
curl -LO https://github.com/containerd/containerd/releases/download/v${CONTAINERD_VERSION}/containerd-${CONTAINERD_VERSION}-linux-amd64.tar.gz
sudo tar Cxzvf /usr/local containerd-${CONTAINERD_VERSION}-linux-amd64.tar.gz
rm containerd-${CONTAINERD_VERSION}-linux-amd64.tar.gz

# Download and install runc
echo "Installing runc..."
curl -LO https://github.com/opencontainers/runc/releases/download/v${RUNC_VERSION}/runc.amd64
sudo install -m 755 runc.amd64 /usr/local/sbin/runc
rm runc.amd64

# Configure containerd
echo "Configuring containerd..."
sudo mkdir -p /etc/containerd
containerd config default | sudo tee /etc/containerd/config.toml

# Enable SystemdCgroup in containerd config
sudo sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml

# Create containerd systemd service
cat <<EOF | sudo tee /etc/systemd/system/containerd.service
[Unit]
Description=containerd container runtime
Documentation=https://containerd.io
After=network.target local-fs.target

[Service]
ExecStartPre=-/sbin/modprobe overlay
ExecStart=/usr/local/bin/containerd
Type=notify
Delegate=yes
KillMode=process
Restart=always
RestartSec=5
LimitNPROC=infinity
LimitCORE=infinity
LimitNOFILE=infinity
TasksMax=infinity
OOMScoreAdjust=-999

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable containerd --now
sudo systemctl start containerd.service

echo "Containerd runtime installed successfully"

# Install crictl
echo "Installing crictl..."
curl -LO https://github.com/kubernetes-sigs/cri-tools/releases/download/${CRICTL_VERSION}/crictl-${CRICTL_VERSION}-linux-amd64.tar.gz
sudo tar zxvf crictl-${CRICTL_VERSION}-linux-amd64.tar.gz -C /usr/local/bin
rm -f crictl-${CRICTL_VERSION}-linux-amd64.tar.gz

# Configure crictl to use containerd
cat <<EOF | sudo tee /etc/crictl.yaml
runtime-endpoint: unix:///run/containerd/containerd.sock
image-endpoint: unix:///run/containerd/containerd.sock
timeout: 10
debug: false
EOF

echo "crictl installed and configured successfully"

# Create Kubernetes yum repository
echo "Setting up Kubernetes repository..."
cat <<EOF | sudo tee /etc/yum.repos.d/kubernetes.repo
[kubernetes]
name=Kubernetes
baseurl=https://pkgs.k8s.io/core:/stable:/$KUBERNETES_VERSION/rpm/
enabled=1
gpgcheck=1
gpgkey=https://pkgs.k8s.io/core:/stable:/$KUBERNETES_VERSION/rpm/repodata/repomd.xml.key
EOF

# Import the Kubernetes GPG key
echo "Importing Kubernetes GPG key..."
curl -fsSL https://pkgs.k8s.io/core:/stable:/$KUBERNETES_VERSION/rpm/repodata/repomd.xml.key | sudo gpg --dearmor -o /etc/pki/rpm-gpg/RPM-GPG-KEY-kubernetes

# Update package cache
sudo $PACKAGE_MANAGER makecache

# Install Kubernetes components
echo "Installing Kubernetes components (kubelet, kubectl, kubeadm)..."
sudo $PACKAGE_MANAGER install -y kubelet kubectl kubeadm

# Prevent automatic updates for Kubernetes components
echo "Locking Kubernetes package versions..."
if sudo $PACKAGE_MANAGER --help | grep -q versionlock; then
    # Try to install versionlock plugin if not available
    sudo $PACKAGE_MANAGER install -y python3-dnf-plugin-versionlock 2>/dev/null || sudo $PACKAGE_MANAGER install -y yum-plugin-versionlock 2>/dev/null || true
    sudo $PACKAGE_MANAGER versionlock kubelet kubectl kubeadm 2>/dev/null || echo "versionlock failed, using exclude method"
fi

# Alternative method for version locking if versionlock plugin not available
if ! sudo $PACKAGE_MANAGER versionlock list 2>/dev/null | grep -q kubelet; then
    echo 'exclude=kubelet kubectl kubeadm' | sudo tee -a /etc/yum.conf
    echo "Using exclude method for package locking"
fi

# Install jq for JSON processing
echo "Installing jq..."
sudo $PACKAGE_MANAGER install -y jq

# Enable kubelet service
sudo systemctl enable kubelet

# Get local IP address with fallback methods
echo "Detecting local IP address..."
local_ip=""

# Try method 1: eth0 interface
if command -v jq &> /dev/null && ip --json addr show eth0 2>/dev/null | jq -e '.[0].addr_info[] | select(.family == "inet") | .local' &>/dev/null; then
    local_ip="$(ip --json addr show eth0 2>/dev/null | jq -r '.[0].addr_info[] | select(.family == "inet") | .local' 2>/dev/null)"
fi

# Try method 2: default route
if [ -z "$local_ip" ]; then
    local_ip="$(ip route get 8.8.8.8 2>/dev/null | awk '{print $7}' | head -1 2>/dev/null || true)"
fi

# Try method 3: hostname resolution
if [ -z "$local_ip" ]; then
    local_ip="$(hostname -I 2>/dev/null | awk '{print $1}' 2>/dev/null || true)"
fi

# Fallback if all methods fail
if [ -z "$local_ip" ]; then
    local_ip="127.0.0.1"
    echo "Warning: Could not detect local IP, using localhost (127.0.0.1)"
fi

echo "Detected local IP: $local_ip"

# Create kubelet configuration directory if it doesn't exist
sudo mkdir -p /etc/default

# Write the local IP address to the kubelet default configuration file
cat <<EOF | sudo tee /etc/default/kubelet
KUBELET_EXTRA_ARGS=--node-ip=$local_ip
EOF

# Additional Amazon Linux specific configurations
echo "Configuring SELinux..."
sudo setenforce 0 2>/dev/null || true
sudo sed -i 's/^SELINUX=enforcing$/SELINUX=permissive/' /etc/selinux/config 2>/dev/null || true

# Configure firewall if firewalld is running
if systemctl is-active --quiet firewalld 2>/dev/null; then
    echo "Configuring firewalld for Kubernetes..."
    sudo firewall-cmd --permanent --add-port=6443/tcp      # API Server
    sudo firewall-cmd --permanent --add-port=2379-2380/tcp # etcd
    sudo firewall-cmd --permanent --add-port=10250/tcp     # kubelet
    sudo firewall-cmd --permanent --add-port=10251/tcp     # kube-scheduler
    sudo firewall-cmd --permanent --add-port=10252/tcp     # kube-controller-manager
    sudo firewall-cmd --permanent --add-port=10255/tcp     # kubelet read-only
    sudo firewall-cmd --permanent --add-port=30000-32767/tcp # NodePort services
    sudo firewall-cmd --reload
    echo "Firewall configured for Kubernetes"
else
    echo "Firewalld not active, skipping firewall configuration"
fi

echo ""
echo "==============================================="
echo "Kubernetes setup completed successfully!"
echo "==============================================="
echo "Local IP configured for kubelet: $local_ip"
echo ""
echo "=== Verification Commands ==="
echo "Check containerd: sudo systemctl status containerd"
echo "Check kubelet: sudo systemctl status kubelet"
echo "Test crictl: sudo crictl version"
echo "Test kubectl: kubectl version --client"
echo "Test kubeadm: kubeadm version"
echo ""
echo "=== Next Steps ==="
echo "1. For Control Plane: sudo kubeadm init --pod-network-cidr=10.244.0.0/16"
echo "2. For Worker Nodes: Use the join command from kubeadm init output"
echo "3. Install a CNI plugin (Flannel example):"
echo "   kubectl apply -f https://raw.githubusercontent.com/flannel-io/flannel/master/Documentation/kube-flannel.yml"
echo ""
echo "Setup completed successfully!"
