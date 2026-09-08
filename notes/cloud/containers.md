# Containers on AWS

Bốn service, và câu hỏi đầu tiên luôn là: cần Kubernetes không?

## Chọn cái nào

| | ECS + Fargate | ECS + EC2 | EKS | App Runner |
|---|---|---|---|---|
| Quản host | Không | **Bạn quản** | Không (với Fargate) | Không |
| Độ phức tạp | Thấp | Trung bình | **Cao** | Thấp nhất |
| Kubernetes API | Không | Không | **Có** | Không |
| Giá | Theo vCPU/RAM-giây | Theo EC2 | + $73/tháng control plane | Theo request |
| Dùng khi | **Mặc định trên AWS** | Cần GPU, cần tối ưu chi phí | Đã dùng k8s, cần portable | Web service đơn giản |

Nguyên tắc thực dụng: **ECS + Fargate** trừ khi có lý do cụ thể. EKS mang lại
tính di động và ecosystem k8s, nhưng đổi lại chi phí vận hành thật sự đáng kể —
đừng chọn chỉ vì "k8s là chuẩn".

## ECR — registry

```bash
aws ecr create-repository --repository-name my-app \
  --image-scanning-configuration scanOnPush=true

# Login
aws ecr get-login-password --region ap-southeast-1 \
  | docker login --username AWS --password-stdin \
    111122223333.dkr.ecr.ap-southeast-1.amazonaws.com

docker build -t my-app .
docker tag my-app:latest 111122223333.dkr.ecr.ap-southeast-1.amazonaws.com/my-app:v1
docker push 111122223333.dkr.ecr.ap-southeast-1.amazonaws.com/my-app:v1
```

Đặt lifecycle policy — image cũ tích lại tốn tiền:

```bash
aws ecr put-lifecycle-policy --repository-name my-app --lifecycle-policy-text '{
  "rules":[{
    "rulePriority":1,"description":"giữ 10 image mới nhất",
    "selection":{"tagStatus":"any","countType":"imageCountMoreThan","countNumber":10},
    "action":{"type":"expire"}
  }]}'
```

`scanOnPush` quét lỗ hổng miễn phí (basic) — nên bật.

## ECS — khái niệm

```
Cluster           — nhóm logic
 └─ Service       — giữ N task chạy, gắn với ALB
     └─ Task      — một hoặc nhiều container chạy cùng nhau
         └─ Task Definition — "công thức": image, CPU, RAM, port, env
```

Task definition tương đương `docker-compose.yml`; Service tương đương
Deployment của k8s.

```json
{
  "family": "my-app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::111122223333:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::111122223333:role/myAppTaskRole",
  "containerDefinitions": [{
    "name": "app",
    "image": "111122223333.dkr.ecr.ap-southeast-1.amazonaws.com/my-app:v1",
    "portMappings": [{ "containerPort": 8080 }],
    "environment": [{ "name": "NODE_ENV", "value": "production" }],
    "secrets": [{
      "name": "DB_PASSWORD",
      "valueFrom": "arn:aws:secretsmanager:ap-southeast-1:111122223333:secret:db-pw"
    }],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/ecs/my-app",
        "awslogs-region": "ap-southeast-1",
        "awslogs-stream-prefix": "ecs"
      }
    },
    "healthCheck": {
      "command": ["CMD-SHELL", "curl -f http://localhost:8080/health || exit 1"],
      "interval": 30, "timeout": 5, "retries": 3, "startPeriod": 60
    }
  }]
}
```

### Hai role — chỗ hay nhầm

| Role | Ai dùng | Để làm gì |
|---|---|---|
| `executionRoleArn` | **ECS agent** | Pull image từ ECR, ghi log, đọc secret |
| `taskRoleArn` | **Code trong container** | Gọi S3, DynamoDB, SQS… |

Container không truy cập được S3 → thiếu `taskRoleArn`. Task không start được
(không pull được image) → thiếu `executionRoleArn`.

### Dùng secret đúng cách

`environment` nằm trong task definition, ai đọc được task definition là thấy.
Mật khẩu phải qua `secrets` (Secrets Manager hoặc SSM Parameter Store) — nó được
inject lúc runtime.

## Service và deploy

```bash
aws ecs create-service --cluster lab-cluster --service-name my-app \
  --task-definition my-app:1 --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration 'awsvpcConfiguration={
    subnets=[subnet-a,subnet-b],securityGroups=[sg-app],assignPublicIp=DISABLED}' \
  --load-balancers 'targetGroupArn=arn:...,containerName=app,containerPort=8080' \
  --health-check-grace-period-seconds 60
```

Rolling update mặc định:

```bash
aws ecs update-service --cluster lab-cluster --service my-app \
  --task-definition my-app:2 \
  --deployment-configuration 'maximumPercent=200,minimumHealthyPercent=100'
```

`minimumHealthyPercent=100` + `maximumPercent=200` nghĩa là task mới lên đủ
trước khi task cũ xuống — không giảm capacity trong lúc deploy.

Cần blue/green thật hoặc canary thì dùng CodeDeploy controller.

## Fargate vs EC2 launch type

**Fargate:**
- Không quản host, không patch, không lo capacity
- Tính tiền theo vCPU/RAM × giây
- Không dùng được GPU, không privileged container, không daemon set

**EC2:**
- Rẻ hơn nếu chạy dày (nhiều task/instance) và có Savings Plans/Spot
- Dùng được GPU, instance store, mọi loại instance
- Phải tự quản ASG cho cluster

Chi phí: Fargate đắt hơn EC2 **trên mỗi đơn vị tài nguyên**, nhưng thường rẻ hơn
tổng thể ở quy mô nhỏ/trung vì không có capacity nhàn rỗi và không tốn công vận
hành.

**Fargate Spot** giảm ~70%, dùng cho batch/worker chịu được ngắt.

## Auto scaling cho ECS

```bash
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/lab-cluster/my-app \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 --max-capacity 10

aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/lab-cluster/my-app \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name cpu-70 --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue":70.0,
    "PredefinedMetricSpecification":{"PredefinedMetricType":"ECSServiceAverageCPUUtilization"}
  }'
```

## EKS — khi thật cần

```bash
# eksctl là cách nhanh nhất
eksctl create cluster --name lab-eks --region ap-southeast-1 \
  --fargate --version 1.31
```

Những gì phải tự lo mà ECS làm sẵn:

- **AWS Load Balancer Controller** — để Ingress tạo ALB
- **EBS/EFS CSI driver** — để PersistentVolume hoạt động
- **IRSA** (IAM Roles for Service Accounts) — để pod có quyền AWS
- Nâng cấp version control plane + node group định kỳ
- Cluster Autoscaler hoặc Karpenter

Chi phí control plane $0.10/giờ (~$73/tháng) **cho mỗi cluster**, chưa tính
node.

## Lab

### Lab 1 — Push image lên ECR

```bash
aws ecr create-repository --repository-name lab-app

cat > Dockerfile <<'DOCKER'
FROM public.ecr.aws/docker/library/node:20-alpine
WORKDIR /app
RUN printf 'const http=require("http");\
http.createServer((q,s)=>{s.writeHead(200);s.end("ok from "+require("os").hostname())})\
.listen(8080)' > server.js
EXPOSE 8080
CMD ["node","server.js"]
DOCKER

ACCT=$(aws sts get-caller-identity --query Account --output text)
REG=$ACCT.dkr.ecr.ap-southeast-1.amazonaws.com

aws ecr get-login-password | docker login --username AWS --password-stdin $REG
docker build -t lab-app .
docker tag lab-app:latest $REG/lab-app:v1
docker push $REG/lab-app:v1

aws ecr describe-images --repository-name lab-app
```

Dùng `public.ecr.aws` thay Docker Hub để không bị rate limit.

### Lab 2 — ECS Fargate + ALB

```bash
aws ecs create-cluster --cluster-name lab-cluster
aws logs create-log-group --log-group-name /ecs/lab-app
```

Đăng ký task definition (dùng JSON ở trên, sửa image), tạo service gắn với
[ALB](./ec2-high-availability), rồi:

```bash
curl http://<alb-dns>/          # thấy hostname của container
curl http://<alb-dns>/          # gọi lại, hostname khác → 2 task
```

### Lab 3 — Task role

Thêm `taskRoleArn` có quyền S3, rồi vào container kiểm tra:

```bash
TASK=$(aws ecs list-tasks --cluster lab-cluster --service-name lab-app \
  --query 'taskArns[0]' --output text)

aws ecs execute-command --cluster lab-cluster --task $TASK \
  --container app --interactive --command "/bin/sh"
```

Trong container: `aws s3 ls` chạy được mà không có key nào. (Cần
`--enable-execute-command` trên service và SSM agent.)

### Lab 4 — Rolling deploy

Sửa code, push `v2`, đăng ký revision mới, update service. Quan sát:

```bash
watch -n 3 "aws ecs describe-services --cluster lab-cluster --services lab-app \
  --query 'services[0].deployments[].[status,taskDefinition,runningCount,desiredCount]' \
  --output table"
```

Trong lúc đó gọi liên tục `curl` — không được có request nào lỗi.

### Dọn dẹp

```bash
aws ecs update-service --cluster lab-cluster --service lab-app --desired-count 0
aws ecs delete-service --cluster lab-cluster --service lab-app --force
aws ecs delete-cluster --cluster lab-cluster
aws ecr delete-repository --repository-name lab-app --force
aws logs delete-log-group --log-group-name /ecs/lab-app
```

Đừng quên [ALB](./ec2-high-availability#dọn-dẹp) — nó tính tiền theo giờ.

## Liên quan

- [EC2 — HA](./ec2-high-availability) — ALB, target group
- [IAM](./iam) — task role vs execution role
- [Serverless Architectures](./serverless-architectures)
