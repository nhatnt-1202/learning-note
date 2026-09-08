# Replication

Nhân bản dữ liệu sang server khác để có bản dự phòng, chia tải đọc, hoặc đưa dữ
liệu sang hệ thống khác. PostgreSQL có hai cơ chế khác nhau về bản chất.

## Physical vs Logical

| | Physical (streaming) | Logical |
|---|---|---|
| Nhân bản cái gì | [WAL](./wal) ở mức byte/page | Từng thay đổi dòng, đã giải mã |
| Phạm vi | **Cả cluster**, không chọn được | Chọn bảng, chọn database |
| Replica có ghi được | Không (read-only) | **Có** (là database độc lập) |
| Khác phiên bản PostgreSQL | Không | **Có** |
| Dùng cho | HA, failover, chia tải đọc | Nâng cấp phiên bản, CDC, gộp dữ liệu |
| DDL | Tự động theo | **Không** — phải chạy tay hai bên |

Chọn nhanh: cần dự phòng cho cả hệ → **physical**. Cần đẩy vài bảng sang chỗ
khác hoặc nâng cấp major version không downtime → **logical**.

## Physical replication

### Trên primary

```ini
wal_level = replica            # mặc định, đủ dùng
max_wal_senders = 10
max_replication_slots = 10
```

```sql
CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD 'secret';
```

`pg_hba.conf`:

```
host    replication    replicator    10.0.0.0/24    scram-sha-256
```

### Tạo standby

```bash
pg_basebackup \
  -h primary.internal -U replicator \
  -D /var/lib/postgresql/17/main \
  -Fp -Xs -P -R \
  -C -S standby1
```

Các cờ đáng nhớ:

- `-R` — tự sinh `postgresql.auto.conf` với `primary_conninfo` và tạo file
  `standby.signal`. Không có nó phải viết tay
- `-C -S standby1` — tạo luôn replication slot tên `standby1`
- `-Xs` — stream WAL song song trong lúc backup, tránh thiếu WAL nếu backup lâu

Khởi động là xong — standby tự kết nối và bắt đầu nhận WAL.

### Slot: cần thiết nhưng nguy hiểm

Slot đảm bảo primary **không xoá WAL** mà standby chưa đọc. Mặt tối: standby
chết mà slot còn thì WAL tích đến khi đầy đĩa và primary **dừng ghi**.

```sql
SELECT slot_name, active,
       pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS retained
FROM pg_replication_slots;
```

Luôn đặt trần:

```ini
max_slot_wal_keep_size = 50GB
```

Vượt trần thì slot bị vô hiệu hoá (standby phải rebuild) — nhưng primary sống,
đó là đánh đổi đúng.

## Theo dõi lag

Trên primary:

```sql
SELECT client_addr, state, sync_state,
       pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn)) AS lag_bytes,
       write_lag, flush_lag, replay_lag
FROM pg_stat_replication;
```

Trên standby:

```sql
SELECT now() - pg_last_xact_replay_timestamp() AS lag_time;
SELECT pg_is_in_recovery();   -- true nếu là standby
```

Ba loại lag khác nhau, hay bị gộp lẫn: `write_lag` (đã nhận), `flush_lag` (đã
fsync), `replay_lag` (đã áp dụng — cái này mới ảnh hưởng query trên standby).

## Synchronous replication

Mặc định là **bất đồng bộ**: primary commit xong là trả về, không đợi standby.
Nhanh, nhưng failover có thể mất vài giao dịch cuối.

```ini
synchronous_standby_names = 'ANY 1 (standby1, standby2)'
synchronous_commit = on
```

Với cấu hình này, `COMMIT` đợi **ít nhất 1** standby xác nhận. Không mất dữ liệu
khi failover, nhưng mỗi commit phải đi một vòng mạng.

Cảnh báo quan trọng: nếu đặt `synchronous_standby_names = 'standby1'` (bắt buộc
đúng standby đó) và standby1 chết, **primary treo mọi commit** để chờ. Dùng dạng
`ANY n (...)` với nhiều standby, hoặc chuẩn bị sẵn cách hạ về async khẩn cấp:

```sql
ALTER SYSTEM SET synchronous_standby_names = '';
SELECT pg_reload_conf();
```

## Query trên standby và xung đột recovery

Standby phục vụ được `SELECT`, nhưng có mâu thuẫn: standby đang chạy query dài
trên phiên bản dòng mà primary đã [VACUUM](./vacuum) đi.

```ini
hot_standby_feedback = on        # standby báo xmin về primary
max_standby_streaming_delay = 30s
```

Hai lựa chọn, mỗi cái một giá:

- `hot_standby_feedback = on` → primary **không vacuum** dòng standby còn cần.
  Query không bị hủy, nhưng bảng trên primary bloat theo query dài của standby
- `off` → primary dọn thoải mái, nhưng query trên standby bị hủy với lỗi
  `canceling statement due to conflict with recovery`

Với standby chỉ để failover, chọn `off`. Với standby chạy analytics, `on` — và
theo dõi bloat trên primary.

## Failover

```bash
# Nâng standby thành primary
pg_ctl promote -D /var/lib/postgresql/17/main
```

```sql
SELECT pg_promote();   -- hoặc từ SQL
```

Sau khi promote, primary cũ **không** tự thành standby. Muốn đưa nó về làm
standby của primary mới, dùng `pg_rewind` (nhanh) thay vì rebuild từ đầu:

```bash
pg_rewind --target-pgdata=/var/lib/postgresql/17/main \
          --source-server="host=new-primary user=replicator" -P
```

`pg_rewind` cần `wal_log_hints = on` hoặc data checksum bật từ đầu — nếu không
có thì không dùng được, phải `pg_basebackup` lại. Đáng bật sẵn trước khi cần.

Tự động hoá failover thì dùng Patroni, repmgr hoặc pg_auto_failover — tự viết
script failover rất dễ dẫn đến split-brain.

## Logical replication

### Trên publisher

```ini
wal_level = logical      # cần restart
```

```sql
CREATE PUBLICATION my_pub FOR TABLE users, orders;
-- hoặc toàn bộ
CREATE PUBLICATION all_pub FOR ALL TABLES;
```

### Trên subscriber

Schema **phải tồn tại trước** — logical replication không tạo bảng:

```bash
pg_dump -h publisher -s -t users -t orders mydb | psql -h subscriber mydb
```

```sql
CREATE SUBSCRIPTION my_sub
  CONNECTION 'host=publisher dbname=mydb user=replicator password=secret'
  PUBLICATION my_pub;
```

### Theo dõi

```sql
-- Publisher
SELECT * FROM pg_replication_slots WHERE slot_type = 'logical';

-- Subscriber
SELECT subname, received_lsn, latest_end_lsn FROM pg_stat_subscription;
SELECT * FROM pg_stat_subscription_stats;   -- PG 15+: đếm lỗi
```

### Những chỗ dễ vấp

- **DDL không được nhân bản.** `ALTER TABLE ADD COLUMN` phải chạy ở cả hai bên
  — subscriber trước, publisher sau, để tránh lỗi giữa lúc chuyển
- **Bảng cần khoá định danh.** Không có PK thì `UPDATE`/`DELETE` sẽ lỗi. Xử lý:
  ```sql
  ALTER TABLE t REPLICA IDENTITY USING INDEX some_unique_index;
  -- hoặc, tốn WAL hơn nhiều:
  ALTER TABLE t REPLICA IDENTITY FULL;
  ```
- **Sequence không được nhân bản** (đến PG 17). Phải set tay khi cutover — quên
  là `INSERT` trùng khoá ngay sau khi chuyển
- **Xung đột làm dừng replication.** Một dòng trùng PK ở subscriber khiến apply
  worker lặp lỗi mãi. PG 15+ cho bỏ qua:
  ```sql
  ALTER SUBSCRIPTION my_sub SKIP (lsn = '0/1234ABC');
  ```

## Nâng cấp major version không downtime

Đây là ứng dụng giá trị nhất của logical replication:

1. Dựng server mới phiên bản mới
2. Copy schema sang
3. Tạo publication/subscription, đợi lag về 0
4. Dừng ghi trên cũ (vài giây), đồng bộ sequence, đổi connection string
5. Xoá subscription

So với `pg_upgrade` (cần downtime bằng thời gian upgrade) thì cách này downtime
chỉ vài giây.

## Liên quan

- [WAL](./wal) — nền tảng của cả hai cơ chế
- [VACUUM](./vacuum) — slot và standby giữ xmin, chặn vacuum
- [Zero-downtime migration](./zero-downtime-migration)
