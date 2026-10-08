# CloudOps Microservices Platform

An end-to-end Kubernetes and DevOps demonstration project containing a web application, an NGINX API gateway, and nine independently deployable Python API services.

The project demonstrates containerization, service communication, Kubernetes operations, environment management, CI validation, security scanning, GitOps and an eventual migration from a kubeadm lab to Amazon EKS.

## Architecture

```text
Browser
   |
   v
Gateway (NGINX)
   |-- Web
   |-- Auth
   |-- Catalog
   |-- Cart
   |-- Orders
   |-- Learning ------> Certificates
   |-- Labs
   |-- Community
   `-- Leaderboard ---> Learning
```

## Repository layout

```text
services/                  web, gateway and API microservices
packages/common/           shared Python HTTP and storage helpers
infra/k8s/base/            reusable Kubernetes resources
infra/k8s/overlays/        dev, QA and production Kustomize overlays
infra/argocd/              Argo CD project and applications
infra/terraform/           planned EKS/ECR/RDS infrastructure
scripts/                   image publishing and smoke tests
.github/workflows/         CI, Dev publishing, QA promotion and Production release
docs/                      architecture and operating notes
```

## Local validation

Requirements: Docker with Compose v2, Python 3, kubectl and access to a Kubernetes cluster.

```bash
make validate
make compose-up
curl http://localhost/api/health
BASE_URL=http://localhost ./scripts/smoke-test.sh
make compose-down
```

Open `http://localhost` to use the website.

## Publish the kubeadm images

Use Docker Hub or another registry accessible from every kubeadm node.

```bash
docker login
export REGISTRY=docker.io/jaganmr49
export IMAGE_TAG=$(git rev-parse --short=12 HEAD)
./scripts/build-and-push.sh
```

The Dev overlay already uses the `jaganmr49` Docker Hub namespace. Update it to the immutable tag that was published:

```bash
./scripts/set-overlay-images.sh dev docker.io/jaganmr49 "$IMAGE_TAG"
```

## Deploy to kubeadm

```bash
kubectl get nodes
kubectl kustomize infra/k8s/overlays/dev >/tmp/cloudops-dev.yaml
kubectl apply --dry-run=server -f /tmp/cloudops-dev.yaml
kubectl apply -k infra/k8s/overlays/dev
kubectl rollout status deployment/gateway -n cloudops-dev
kubectl get all -n cloudops-dev
```

For a kubeadm cluster without MetalLB, use port forwarding:

```bash
kubectl port-forward -n cloudops-dev service/gateway 8080:80
```

In another terminal:

```bash
BASE_URL=http://localhost:8080 ./scripts/smoke-test.sh
```

## Kubernetes operations to demonstrate

```bash
# Self-healing
kubectl delete pod -n cloudops-dev -l app=gateway
kubectl get pods -n cloudops-dev -w

# Scaling
kubectl scale deployment/web -n cloudops-dev --replicas=2
kubectl get pods -n cloudops-dev -l app=web

# Rollout and rollback
kubectl set image deployment/web web=nginx:invalid-tag -n cloudops-dev
kubectl rollout status deployment/web -n cloudops-dev
kubectl rollout undo deployment/web -n cloudops-dev

# Troubleshooting
kubectl get events -n cloudops-dev --sort-by=.metadata.creationTimestamp
kubectl logs -n cloudops-dev deployment/gateway
kubectl describe deployment gateway -n cloudops-dev
```

## Delivery pipelines

The repository follows **build once, promote the same immutable image**:

1. `ci.yaml` validates Python, Docker Compose and every Kustomize overlay, builds all 14 images tagged with the 12-character commit id, blocks high/critical Trivy findings on that same image, and pushes it to Docker Hub on `main`.
2. `deploy-dev.yaml` runs only after successful CI on `main`. It does not build again. It checks that the commit tag exists and writes that tag into the Dev overlay.
3. `promote-qa.yaml` copies the selected tested Docker Hub images into ECR without rebuilding and updates the QA overlay.
4. `release-production.yaml` verifies that the QA-approved images exist in ECR and updates the Production desired state after GitHub Environment approval.
5. Argo CD automatically reconciles Dev and QA. Production is intentionally synchronized manually after reviewing the Argo CD diff.

Required GitHub configuration:

| Scope | Name | Purpose |
|---|---|---|
| Repository secret | `DOCKERHUB_USERNAME` | Docker Hub login user |
| Repository secret | `DOCKERHUB_TOKEN` | Docker Hub access token; never use the account password |
| QA/Production variable | `AWS_REGION` | AWS region such as `us-east-1` |
| QA/Production variable | `AWS_GITHUB_ACTIONS_ROLE_ARN` | IAM role trusted by GitHub OIDC |
| GitHub Environment | `qa` | QA controls and variables |
| GitHub Environment | `production` | Required reviewers and production controls |

ECR repositories named `cloudops-<service>` must exist before QA promotion. The AWS role requires only the ECR operations used by the workflows. Long-lived AWS access keys are not stored in GitHub.

## Argo CD

Every Argo CD application reads desired state from the single source-of-truth repository: `https://github.com/Devopsawsr/Reddy-K8s.git`.

```bash
kubectl apply -f infra/argocd/project.yaml
kubectl apply -f infra/argocd/root-app.yaml
```

Development and QA use automated synchronization. Production requires a manual Argo CD sync.

## Environment strategy

| Environment | Namespace | Image tag | Delivery |
|---|---|---|---|
| Development | `cloudops-dev` | Immutable Git SHA in Docker Hub | Automated after CI |
| QA | `cloudops-qa` | Same Git SHA promoted to ECR | Workflow dispatch + automatic Argo sync |
| Production | `cloudops-prod` | Same QA-approved ECR image | Environment approval + manual Argo sync |

## Current persistence scope

The kubeadm demonstration uses pod-local `emptyDir` storage for stateful APIs. This is acceptable only for temporary testing: data is lost when a pod is replaced and must not be used with horizontally scaled stateful services.

Before EKS production deployment, replace JSON-file storage with PostgreSQL/RDS, keep credentials in AWS Secrets Manager, and use IRSA workload identity.

## EKS production roadmap

- Terraform-managed VPC, EKS, ECR, IAM and RDS
- GitHub Actions OIDC authentication to AWS
- immutable image tags based on the Git commit SHA
- AWS Load Balancer Controller and ACM TLS certificate
- External Secrets with AWS Secrets Manager
- CloudWatch Container Insights and Prometheus/Grafana
- NetworkPolicy, Pod Security and least-privilege IRSA
- database backups, restore validation and disaster-recovery runbooks

## HTTP deployment

The lab endpoint uses HTTP because no domain or TLS certificate is configured. HTTPS will be introduced in EKS using Route 53, ACM and an Application Load Balancer.
