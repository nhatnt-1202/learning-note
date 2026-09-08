# Sharding

Chia dữ liệu ra **nhiều server** khác nhau. Khác với
[partitioning](./partitioning) (nhiều bảng trên *một* server), sharding vượt
giới hạn của một máy — và đổi lại mất rất nhiều tiện lợi.

## Trước khi shard — làm hết những cách rẻ hơn

Sharding là bước cuối, không phải bước đầu. Theo thứ tự nên thử:

1. **Tối ưu query và index** — phần lớn "vấn đề scale" là query thiếu index
2. **Scale dọc** — máy 128 core / 1TB RAM giờ khá bình thường và rẻ hơn nhiều
   so với chi phí vận hành hệ shard
3. **[Read replica](./replication)** — nếu cổ chai là đọc
4. **[Partitioning](./partitioning)** — nếu vấn đề là bảng quá lớn để bảo trì
5. **Tách service theo miền nghiệp vụ** (functional sharding) — đơn giản hơn
   nhiều so với chia ngang
6. **Chỉ khi đó**: sharding

Một PostgreSQL được tuning tốt xử lý hàng chục TB và hàng trăm nghìn TPS. Ngưỡng
thật sự cần shard cao hơn phần lớn người ta tưởng.

## Cái mất khi shard

Cần thấy rõ giá trước khi quyết:

- **JOIN chéo shard** — hoặc không làm được, hoặc phải gộp ở tầng ứng dụng
- **Transaction ACID chéo shard** — cần 2PC, chậm và phức tạp
- **`UNIQUE` toàn cục** — không còn đảm bảo được bằng constraint
- **Aggregate toàn cục** (`COUNT`, `SUM`) — phải fan-out rồi gộp
- **Rebalance** — thêm shard là việc lớn nếu không thiết kế từ đầu
- **Vận hành** — backup, monitoring, migration nhân theo số shard

## Chọn shard key

Đây là quyết định quan trọng nhất và **khó sửa nhất**.

Tiêu chí:

- **Phân bố đều** — tránh hot shard
- **Đi cùng phần lớn query** — để query chỉ chạm một shard
- **Ổn định** — không đổi giá trị theo thời gian
- **Gom được dữ liệu liên quan** vào cùng shard

| Shard key | Đánh giá |
|---|---|
| `tenant_id` / `org_id` | **Tốt nhất** cho SaaS B2B — dữ liệu tự nhiên gom theo tenant |
| `user_id` | Tốt cho ứng dụng hướng người dùng |
| Hash của PK | Phân bố đều nhưng query nào cũng fan-out |
| `created_at` | **Tệ** — mọi ghi mới dồn vào một shard |
| `country` | **Tệ** — phân bố rất lệch |

Multi-tenant SaaS là trường hợp sharding hợp nhất: `tenant_id` khiến gần như
mọi query chỉ chạm một shard.

## Cách 1 — Citus

Extension biến PostgreSQL thành cluster phân tán. Cách ít đau nhất vì vẫn là
PostgreSQL và vẫn nói SQL.

```sql
CREATE EXTENSION citus;

-- Thêm worker
SELECT citus_add_node('worker-1', 5432);
SELECT citus_add_node('worker-2', 5432);

-- Bảng phân tán theo tenant_id
SELECT create_distributed_table('orders', 'tenant_id');
SELECT create_distributed_table('order_items', 'tenant_id');

-- Bảng nhỏ, dùng chung: nhân bản ra mọi node để JOIN cục bộ
SELECT create_reference_table('countries');
```

Điểm hay nhất của Citus là **co-location**: các bảng cùng shard key được đặt
cùng shard, nên `JOIN` giữa chúng chạy cục bộ trên worker, không qua mạng.

```sql
-- Chạy cục bộ trên 1 shard — nhanh
SELECT * FROM orders o JOIN order_items i USING (tenant_id, order_id)
WHERE o.tenant_id = 42;
```

Ngược lại, `JOIN` không theo shard key sẽ sinh repartition rất đắt. Kiểm tra:

```sql
SELECT * FROM citus_shards;
SELECT * FROM citus_tables;
EXPLAIN (ANALYZE) SELECT ...;   -- xem có "Task Count" bao nhiêu
```

## Cách 2 — Sharding ở tầng ứng dụng

Ứng dụng tự biết dữ liệu nào ở shard nào. Kiểm soát hoàn toàn, nhưng mọi thứ
phải tự làm.

```js
const SHARDS = [pool0, pool1, pool2, pool3];

function shardFor(tenantId) {
  return SHARDS[hash(tenantId) % SHARDS.length];
}
```

Vấn đề của `% n`: thêm shard là **đổi chỗ gần hết dữ liệu**. Cách chuẩn để
tránh là **virtual shard** — chia thành nhiều slot cố định rồi map slot sang
server:

```js
const VIRTUAL_SHARDS = 1024;   // cố định mãi mãi

function slotFor(tenantId) {
  return hash(tenantId) % VIRTUAL_SHARDS;
}
// slot → server, lưu trong bảng tra cứu, đổi được mà không rehash
```

Thêm server chỉ cần chuyển một phần slot — không phải tính lại toàn bộ. Nếu tự
làm sharding, hãy thiết kế thế này **ngay từ đầu**.

## Cách 3 — Directory-based

Bảng tra cứu nói tenant nào ở shard nào. Linh hoạt nhất (chuyển từng tenant
được, kể cả tenant lớn ra server riêng), đổi lại thêm một lần tra cứu.

```sql
-- Trên node metadata
CREATE TABLE shard_map (
  tenant_id bigint PRIMARY KEY,
  shard_id  int NOT NULL,
  updated_at timestamptz DEFAULT now()
);
```

Cache bảng này ở ứng dụng, invalidate khi có chuyển.

Đây là cách phù hợp cho SaaS có tenant chênh lệch lớn — vài tenant khổng lồ,
hàng nghìn tenant nhỏ.

## Cách 4 — Foreign Data Wrapper

Có sẵn trong PostgreSQL, không cần extension ngoài. Phù hợp khi chỉ cần query
chéo thỉnh thoảng, không phải nền tảng cho hệ shard thật.

```sql
CREATE EXTENSION postgres_fdw;

CREATE SERVER shard1 FOREIGN DATA WRAPPER postgres_fdw
  OPTIONS (host 'shard1.internal', dbname 'mydb');

CREATE USER MAPPING FOR current_user SERVER shard1
  OPTIONS (user 'app', password 'secret');

IMPORT FOREIGN SCHEMA public LIMIT TO (orders)
  FROM SERVER shard1 INTO shard1_schema;
```

Kết hợp với partitioning ra được "sharding thủ công":

```sql
CREATE TABLE orders (tenant_id bigint, ...) PARTITION BY HASH (tenant_id);

CREATE FOREIGN TABLE orders_0 PARTITION OF orders
  FOR VALUES WITH (MODULUS 4, REMAINDER 0) SERVER shard1;
```

Hiệu năng kém hơn Citus đáng kể (ít pushdown, không parallel tốt), nên đây là
lựa chọn khi quy mô còn nhỏ hoặc chỉ cần đọc.

## ID toàn cục

`bigserial` không còn unique khi có nhiều shard. Ba cách:

```sql
-- 1. Sequence lệch nhau theo shard
-- shard 0:
CREATE SEQUENCE order_id_seq START 1 INCREMENT 4;
-- shard 1:
CREATE SEQUENCE order_id_seq START 2 INCREMENT 4;
```

Đơn giản nhưng cố định số shard — không mở rộng được.

```sql
-- 2. UUID v7 (có tiền tố thời gian nên vẫn tăng dần, tốt cho B-tree)
SELECT uuidv7();   -- PG 18+
```

```
-- 3. Snowflake ID: timestamp | shard_id | sequence trong 64 bit
```

Cách 2 là mặc định hợp lý cho hệ mới; cách 3 khi cần ID nhỏ gọn và sắp xếp được
theo thời gian chính xác.

## Rebalance

```sql
-- Citus làm sẵn, chuyển shard không downtime
SELECT citus_rebalance_start();
SELECT * FROM citus_rebalance_status();
```

Tự làm thì dùng [logical replication](./replication#logical-replication) để copy
tenant sang shard mới, đợi lag về 0, khoá ghi tenant đó vài giây, đổi
`shard_map`, rồi xoá bên cũ. Đây là lý do directory-based tiện: chỉ đổi một
dòng trong bảng map.

## Liên quan

- [Partitioning](./partitioning) — thử cái này trước
- [Replication](./replication) — chia tải đọc, và công cụ để rebalance
- [Config Tuning](./config-tuning) — scale dọc trước khi scale ngang
