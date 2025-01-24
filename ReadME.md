## Project Tree:

```
📦medical-data-system
┣ 📂app
┃ ┣ 📂backend
┃ ┃ ┣ 📂src
┃ ┃ ┃ ┣ 📂models
┃ ┃ ┃ ┃ ┗ 📜patient.js
┃ ┃ ┃ ┗ 📜server.js
┃ ┃ ┣ 📜Dockerfile
┃ ┃ ┗ 📜package.json
┃ ┣ 📂frontend
┃ ┗ 📜.DS_Store
┣ 📂grafana
┃ ┗ 📜dashboard.json
┣ 📂k8s
┃ ┣ 📜audit-deployment.yaml
┃ ┣ 📜auth-deployment.yaml
┃ ┣ 📜backend-deployment.yaml
┃ ┣ 📜encryption-deployment.yaml
┃ ┣ 📜grafana-deployment.yaml
┃ ┣ 📜namespace.yaml
┃ ┗ 📜prometheus-deployment.yaml
┣ 📂monitoring
┃ ┗ 📂Dockerfile
┃ ┃ ┗ 📜docker-compose.yaml
┣ 📂security
┃ ┣ 📂audit-service
┃ ┃ ┣ 📂src
┃ ┃ ┃ ┗ 📜server.js
┃ ┃ ┣ 📜Dockerfile
┃ ┃ ┗ 📜package.json
┃ ┣ 📂auth-service
┃ ┃ ┣ 📂src
┃ ┃ ┃ ┣ 📂models
┃ ┃ ┃ ┃ ┗ 📜user.js
┃ ┃ ┃ ┗ 📜server.js
┃ ┃ ┣ 📜Dockerfile
┃ ┃ ┗ 📜package.json
┃ ┣ 📂encryption-service
┃ ┃ ┣ 📂src
┃ ┃ ┃ ┗ 📜server.js
┃ ┃ ┣ 📜Dockerfile
┃ ┃ ┗ 📜package.json
┃ ┗ 📜.DS_Store
┣ 📜.DS_Store
┣ 📜ReadME.md
┣ 📜check-env.js
┣ 📜check-logs.js
┣ 📜load-test.js
┣ 📜package-lock.json
┣ 📜package.json
┣ 📜run-container.js
┣ 📜test-system.js
┗ 📜verify-services.js
```

## LOCAL DEVELOPMENT LORE:

### Build Docker images

```
docker build -t medical-data-backend:latest ./app/backend
docker build -t audit-service:latest ./security/audit-service
docker build -t auth-service:latest ./security/auth-service
docker build -t encryption-service:latest ./security/encryption-service
```

### Redeploy services

```
kubectl rollout restart deployment backend audit-service auth-service encryption-service -n medical-system
```

## To test the complete system:

### Delete existing resources

```
kubectl delete namespace medical-system
kubectl create namespace medical-system
```

### Apply configurations in order

```
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/audit-deployment.yaml
kubectl apply -f k8s/auth-deployment.yaml
kubectl apply -f k8s/encryption-deployment.yaml
kubectl apply -f k8s/prometheus-deployment.yaml
kubectl apply -f k8s/grafana-deployment.yaml
```

### Wait for pods to be ready

```
kubectl wait --for=condition=ready pod -l app=prometheus -n medical-system --timeout=120s
kubectl wait --for=condition=ready pod -l app=grafana -n medical-system --timeout=120s
```

### Check pods availability

```
kubectl get pods -n medical-system
```

### Restart pods if necessary

```
kubectl delete pods --all -n medical-system
```

### Set up port forwarding

### Stop all existing

```
pkill -f "kubectl port-forward"
kubectl port-forward service/audit-service 3001:3001 -n medical-system &
kubectl port-forward service/auth-service 3003:3003 -n medical-system &
kubectl port-forward service/backend-service 5000:5000 -n medical-system &
kubectl port-forward service/encryption-service 3002:3002 -n medical-system &
kubectl port-forward service/prometheus 9090:9090 -n medical-system &
kubectl port-forward service/grafana 3000:3000 -n medical-system &
```
