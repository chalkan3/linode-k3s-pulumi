# Troubleshooting Guide

## 📋 Overview

This guide helps you diagnose and resolve common issues with your K3s cluster deployment.

---

## 🔍 Quick Diagnostics

### Check Deployment Status

```bash
# Pulumi stack status
pulumi stack

# View outputs
pulumi stack output

# Check logs
pulumi logs
```

### Check Cluster Health

```bash
# Get kubeconfig
pulumi stack output kubeconfig --show-secrets > kubeconfig.yaml
export KUBECONFIG=$(pwd)/kubeconfig.yaml

# Check nodes
kubectl get nodes

# Check system pods
kubectl get pods -n kube-system

# Check events
kubectl get events -A --sort-by='.lastTimestamp'
```

---

## ❌ Common Issues

### 1. Deployment Fails with Validation Error

**Symptoms:**
```
Error: Configuration validation failed:
- Invalid region: invalid-region
```

**Solution:**
1. Check `Pulumi.dev.yaml` for typos
2. Review [VALIDATIONS.md](./VALIDATIONS.md) for valid values
3. Run validation:
   ```bash
   npm run build
   ```

### 2. SSH Connection Timeout

**Symptoms:**
```
Error: SSH connection timeout
```

**Solutions:**

**Check firewall:**
```bash
# Verify bastion public IP
BASTION_IP=$(pulumi stack output bastionPublicIp)
ping $BASTION_IP

# Try SSH
ssh -v root@$BASTION_IP
```

**Check SSH key:**
```bash
# Get private key
pulumi stack output sshPrivateKey --show-secrets > ssh_key
chmod 600 ssh_key

# Test connection
ssh -i ssh_key root@$BASTION_IP
```

### 3. K3s Installation Fails

**Symptoms:**
```
Error: K3s installation timeout
```

**Solutions:**

**Check node status:**
```bash
# SSH to node via bastion
ssh -i ssh_key root@$BASTION_IP
ssh root@<node-private-ip>

# Check K3s status
systemctl status k3s
journalctl -u k3s -f
```

**Retry installation:**
```bash
# On master node
curl -sfL https://get.k3s.io | sh -s - server \
  --cluster-init \
  --write-kubeconfig-mode=644
```

### 4. Nodes Not Joining Cluster

**Symptoms:**
```
NAME     STATUS     ROLES    AGE   VERSION
master-1 Ready      master   10m   v1.28.5+k3s1
worker-1 NotReady   <none>   2m    v1.28.5+k3s1
```

**Solutions:**

**Check K3s token:**
```bash
# On master
cat /var/lib/rancher/k3s/server/node-token

# On worker
cat /etc/rancher/k3s/k3s-agent.yaml
# Should contain correct token and server URL
```

**Restart K3s on worker:**
```bash
systemctl restart k3s-agent
journalctl -u k3s-agent -f
```

### 5. ArgoCD Not Accessible

**Symptoms:**
- Cannot access ArgoCD UI
- Connection timeout

**Solutions:**

**Check ArgoCD pods:**
```bash
kubectl get pods -n argocd

# Should see all pods Running:
# argocd-server-xxx
# argocd-repo-server-xxx
# argocd-redis-xxx
# argocd-application-controller-xxx
```

**Check service:**
```bash
kubectl get svc -n argocd

# argocd-server should be type: NodePort
```

**Get correct URL:**
```bash
pulumi stack output argocdUrl
```

**Port forward as workaround:**
```bash
kubectl port-forward svc/argocd-server -n argocd 8080:443
# Access at https://localhost:8080
```

### 6. Applications Not Syncing in ArgoCD

**Symptoms:**
- Applications show "OutOfSync"
- Changes in Git not reflected

**Solutions:**

**Check repository connection:**
```bash
argocd repo get https://github.com/chalkan3/zapper-argocd
```

**Manual sync:**
```bash
argocd app sync <app-name>
```

**Check application status:**
```bash
argocd app get <app-name>
kubectl get application <app-name> -n argocd -o yaml
```

### 7. High Resource Usage

**Symptoms:**
- Nodes running out of memory/CPU
- Pods being evicted

**Solutions:**

**Check resource usage:**
```bash
kubectl top nodes
kubectl top pods -A
```

**Check resource limits:**
```bash
kubectl describe pod <pod-name> -n <namespace>
```

**Scale up:**
Edit `Pulumi.dev.yaml`:
```yaml
workers:
  count: 6  # Add more workers
```
Then: `pulumi up`

### 8. Persistent Volume Issues

**Symptoms:**
```
PersistentVolumeClaim is pending
```

**Solutions:**

**Check PVC status:**
```bash
kubectl get pvc -A
kubectl describe pvc <pvc-name> -n <namespace>
```

**Install storage class:**
```bash
# Install Longhorn or other storage provider
kubectl apply -f https://raw.githubusercontent.com/longhorn/longhorn/master/deploy/longhorn.yaml
```

### 9. Network Connectivity Issues

**Symptoms:**
- Pods cannot reach each other
- External services unreachable

**Solutions:**

**Check CNI:**
```bash
kubectl get pods -n kube-system | grep flannel
```

**Test connectivity:**
```bash
# Create test pod
kubectl run test-pod --image=busybox --restart=Never -- sleep 3600

# Test DNS
kubectl exec test-pod -- nslookup kubernetes.default

# Test external
kubectl exec test-pod -- wget -O- google.com
```

**Check firewall rules:**
```bash
# On nodes
iptables -L -n -v
```

### 10. Certificate Issues

**Symptoms:**
```
x509: certificate signed by unknown authority
```

**Solutions:**

**Regenerate certs:**
```bash
# On master
rm -rf /var/lib/rancher/k3s/server/tls
systemctl restart k3s
```

**Trust cert:**
```bash
# Get CA cert
kubectl config view --raw -o jsonpath='{.clusters[0].cluster.certificate-authority-data}' | base64 -d > ca.crt

# Add to trust store (macOS)
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ca.crt
```

---

## 🔧 Advanced Debugging

### Enable Debug Logging

**K3s server:**
```bash
# Edit systemd service
systemctl edit k3s

[Service]
Environment="K3S_LOG_LEVEL=debug"

systemctl daemon-reload
systemctl restart k3s
```

**ArgoCD:**
```bash
kubectl edit deployment argocd-server -n argocd

# Add to container args:
- --loglevel=debug
```

### Capture Network Traffic

```bash
# On node
tcpdump -i any -w capture.pcap port 6443

# Download and analyze with Wireshark
```

### Check Disk Space

```bash
# On all nodes
df -h

# Clean up if needed
docker system prune -a
journalctl --vacuum-size=100M
```

### Memory Pressure

```bash
# Check OOM kills
dmesg | grep -i oom

# Check swap
free -h
swapon -s
```

---

## 📞 Getting Help

### Collect Diagnostics

```bash
# Cluster info
kubectl cluster-info dump > cluster-dump.txt

# Pulumi logs
pulumi logs > pulumi-logs.txt

# Node logs (SSH to each node)
journalctl -u k3s > k3s-logs.txt
```

### Support Channels

- **Documentation:** [Full docs](/docs)
- **Pulumi Community:** https://slack.pulumi.com/
- **K3s Community:** https://github.com/k3s-io/k3s/issues
- **ArgoCD Community:** https://github.com/argoproj/argo-cd/issues

---

## ✅ Health Check Checklist

Run this checklist regularly:

```bash
# 1. All nodes Ready
kubectl get nodes
# Expected: All nodes STATUS=Ready

# 2. System pods Running
kubectl get pods -n kube-system
# Expected: All pods STATUS=Running

# 3. ArgoCD healthy
kubectl get pods -n argocd
# Expected: All pods STATUS=Running

# 4. Applications synced
argocd app list
# Expected: All apps HEALTH=Healthy, SYNC=Synced

# 5. No recent events
kubectl get events -A --sort-by='.lastTimestamp' | tail -20
# Expected: No errors/warnings

# 6. Resource usage normal
kubectl top nodes
# Expected: CPU<80%, Memory<80%

# 7. Disk space available
# SSH to nodes and check: df -h
# Expected: /<80% used
```

---

← [Configuration](./CONFIGURATION.md) | [Main Index](./INDEX.md) →
