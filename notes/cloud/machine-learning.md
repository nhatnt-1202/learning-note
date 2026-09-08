# Machine Learning

Hai nhóm: **service sẵn dùng** (gọi API, không cần biết ML) và **SageMaker** (tự
train model).

## Service sẵn dùng

| Service | Làm gì |
|---|---|
| **Rekognition** | Nhận diện ảnh/video: vật thể, khuôn mặt, text, nội dung không phù hợp |
| **Textract** | Trích text + **bảng + form** từ tài liệu scan |
| **Comprehend** | NLP: sentiment, entity, ngôn ngữ, chủ đề |
| **Transcribe** | Speech → text |
| **Polly** | Text → speech |
| **Translate** | Dịch máy |
| **Bedrock** | Gọi foundation model (Claude, Llama…) qua API |
| **Personalize** | Hệ gợi ý |
| **Forecast** | Dự báo chuỗi thời gian |
| **Fraud Detector** | Phát hiện gian lận |

Nguyên tắc: **thử service sẵn trước**. Train model riêng chỉ đáng khi bài toán
thực sự đặc thù — chi phí và công sức chênh lệch rất lớn.

### Textract vs Rekognition cho text

Hay bị lẫn:

- **Rekognition `DetectText`** — text ngắn trong ảnh (biển số, biển hiệu)
- **Textract** — tài liệu: giữ cấu trúc bảng, form key-value, nhiều trang

Xử lý hoá đơn, CMND, hợp đồng → Textract.

## Bedrock

Gọi foundation model không cần quản hạ tầng:

```bash
aws bedrock list-foundation-models \
  --query 'modelSummaries[].[modelId,providerName]' --output table

aws bedrock-runtime invoke-model \
  --model-id anthropic.claude-sonnet-4-5-20250929-v1:0 \
  --body '{"anthropic_version":"bedrock-2023-05-31","max_tokens":256,
           "messages":[{"role":"user","content":"Giải thích MVCC trong 2 câu"}]}' \
  --cli-binary-format raw-in-base64-out \
  out.json && cat out.json
```

Phải **request access** cho từng model trong console trước khi gọi được.

**Knowledge Bases** cho RAG: trỏ vào S3, Bedrock tự chunk, embed, lưu vector và
lo phần retrieval — không phải tự dựng pipeline.

**Guardrails** để lọc nội dung và chặn PII.

## SageMaker

Nền tảng đầy đủ cho vòng đời ML.

| Thành phần | Cho |
|---|---|
| **Studio** | IDE trên web |
| **Notebook** | Jupyter quản lý |
| **Training Job** | Train trên cluster tạm, tự tắt sau khi xong |
| **Endpoint** | Deploy model làm API realtime |
| **Batch Transform** | Inference theo lô, không cần endpoint |
| **Pipelines** | CI/CD cho ML |
| **Feature Store** | Lưu và chia sẻ feature |
| **Model Monitor** | Phát hiện data drift |

```python
import sagemaker
from sagemaker.sklearn.estimator import SKLearn

est = SKLearn(
    entry_point='train.py',
    role=role,
    instance_type='ml.m5.large',
    framework_version='1.2-1',
    hyperparameters={'n_estimators': 100},
)
est.fit({'train': 's3://my-bucket/train/'})

predictor = est.deploy(initial_instance_count=1, instance_type='ml.t2.medium')
```

### Chi phí — chỗ dễ mất tiền nhất

**Endpoint chạy 24/7 và tính tiền theo giờ, kể cả không có request nào.** Đây là
nguồn hoá đơn bất ngờ phổ biến nhất với SageMaker.

Ba cách tránh:

1. **Serverless Inference** — tính theo request, có cold start
2. **Batch Transform** — không cần endpoint, chạy xong tự tắt
3. **Asynchronous Inference** — scale về 0 khi rảnh

Và luôn:

```bash
# Kiểm tra endpoint đang chạy
aws sagemaker list-endpoints --query 'Endpoints[].[EndpointName,EndpointStatus]' --output table

# Xoá
aws sagemaker delete-endpoint --endpoint-name my-endpoint
```

Notebook instance cũng tính tiền khi `InService` dù không dùng — nhớ `Stop`.

### Spot cho training

```python
est = SKLearn(..., use_spot_instances=True, max_wait=7200, max_run=3600)
```

Giảm tới 90% chi phí training. Cần `checkpoint_s3_uri` để job dài chịu được
ngắt.

## Lab

### Lab 1 — Rekognition

```bash
B=lab-ml-$(date +%s)
aws s3 mb s3://$B
# dùng một ảnh bất kỳ
aws s3 cp photo.jpg s3://$B/photo.jpg

aws rekognition detect-labels \
  --image "S3Object={Bucket=$B,Name=photo.jpg}" \
  --max-labels 10 \
  --query 'Labels[].[Name,Confidence]' --output table

aws rekognition detect-text \
  --image "S3Object={Bucket=$B,Name=photo.jpg}" \
  --query 'TextDetections[?Type==`LINE`].DetectedText'
```

### Lab 2 — Comprehend

```bash
aws comprehend detect-sentiment \
  --text "Dịch vụ này rất tốt, tôi rất hài lòng" \
  --language-code vi

aws comprehend detect-entities \
  --text "Nguyen Van A works at Amazon in Singapore" \
  --language-code en \
  --query 'Entities[].[Type,Text,Score]' --output table
```

Comprehend hỗ trợ tiếng Việt cho một số tính năng — kiểm tra
`detect-dominant-language` trước khi dựa vào nó.

### Lab 3 — Textract trên tài liệu

```bash
aws s3 cp invoice.pdf s3://$B/invoice.pdf

aws textract analyze-document \
  --document '{"S3Object":{"Bucket":"'$B'","Name":"invoice.pdf"}}' \
  --feature-types TABLES FORMS \
  --query 'Blocks[?BlockType==`LINE`].Text' --output text
```

So với `detect-document-text` (chỉ text thô) để thấy giá trị của `TABLES FORMS`.

### Lab 4 — Bedrock

```bash
# Xem model nào đã có quyền
aws bedrock list-foundation-models --by-inference-type ON_DEMAND \
  --query 'modelSummaries[].modelId' --output text | tr '\t' '\n' | head

aws bedrock-runtime invoke-model \
  --model-id anthropic.claude-sonnet-4-5-20250929-v1:0 \
  --body '{"anthropic_version":"bedrock-2023-05-31","max_tokens":512,
           "messages":[{"role":"user","content":"Viết query SQL tìm top 10 khách hàng theo doanh thu"}]}' \
  --cli-binary-format raw-in-base64-out out.json

python3 -c "import json;print(json.load(open('out.json'))['content'][0]['text'])"
```

### Lab 5 — Kiểm tra tài nguyên ML đang tốn tiền

```bash
aws sagemaker list-endpoints --query 'Endpoints[].[EndpointName,EndpointStatus]' --output table
aws sagemaker list-notebook-instances \
  --query 'NotebookInstances[].[NotebookInstanceName,NotebookInstanceStatus]' --output table
```

Chạy lệnh này sau mỗi buổi làm việc với SageMaker.

### Dọn dẹp

```bash
aws s3 rb s3://$B --force
aws sagemaker delete-endpoint --endpoint-name <name> 2>/dev/null
aws sagemaker stop-notebook-instance --notebook-instance-name <name> 2>/dev/null
```

## Liên quan

- [Data & Analytics](./data-analytics) — chuẩn bị dữ liệu cho ML
- [S3](./s3-introduction) — nơi lưu dataset
- [Lambda](./serverless-lambda) — gọi các service ML từ ứng dụng
