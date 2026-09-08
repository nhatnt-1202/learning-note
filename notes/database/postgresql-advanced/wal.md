# WAL & Checkpoint

**WAL** (Write-Ahead Log) là cơ chế đảm bảo durability: trước khi thay đổi dữ
liệu, PostgreSQL ghi *ý định thay đổi* vào log tuần tự trước. Nếu server chết
giữa đường, khi khởi động lại nó đọc WAL và replay để phục hồi.

## Vì sao cần WAL

Ghi dữ liệu ngẫu nhiên khắp đĩa rồi `fsync` từng chỗ thì rất chậm. WAL đổi bài
toán đó thành **ghi tuần tự vào một file** — nhanh hơn nhiều, kể cả trên SSD:

```
COMMIT → ghi WAL record + fsync  → báo client thành công
                                 → data page vẫn còn nằm trong RAM (dirty)
                                 → checkpoint mới ghi page xuống đĩa sau
```

Nói cách khác: `COMMIT` chỉ đợi WAL chạm đĩa, không đợi data file. Đây là lý do
PostgreSQL commit nhanh.

## Luồng ghi

1. Thay đổi được áp vào page trong **shared_buffers** (RAM) → page thành "dirty"
2. WAL record tương ứng ghi vào **wal_buffers** rồi xuống file WAL
3. `COMMIT` → `fsync` WAL
4. **Checkpoint** (sau) → flush dirty page xuống data file, WAL cũ thành vô dụng

## Checkpoint

Checkpoint là điểm mốc: mọi thay đổi trước nó đã nằm an toàn trên data file, nên
WAL trước đó có thể xóa/recycle. Đánh đổi:

- Checkpoint **thưa** → recovery lâu, WAL tích nhiều, nhưng I/O đều
- Checkpoint **dày** → recovery nhanh, nhưng ghi đĩa nhiều (cùng một page bị
  ghi lại nhiều lần)

```sql
CHECKPOINT;  -- ép chạy ngay, thường chỉ dùng trước khi backup/shutdown
```

### Tham số chính

```ini
max_wal_size = 4GB               # tích bao nhiêu WAL thì checkpoint
min_wal_size = 1GB
checkpoint_timeout = 15min       # hoặc bao lâu thì checkpoint (mặc định 5min)
checkpoint_completion_target = 0.9  # giãn I/O ra 90% khoảng thời gian
wal_compression = on             # nén full-page image
```

`checkpoint_completion_target = 0.9` là mặc định từ PG 14 và gần như luôn đúng:
nó giãn việc ghi ra thay vì dồn một cục gây spike I/O.

### Dấu hiệu checkpoint sai cấu hình

```sql
SELECT * FROM pg_stat_bgwriter;
```

Nếu `checkpoints_req` (checkpoint do đầy `max_wal_size`) lớn hơn nhiều
`checkpoints_timed`, tức là checkpoint đang bị kích hoạt vì hết chỗ WAL chứ
không theo lịch → **tăng `max_wal_size`**.

> Từ PG 17, các cột này chuyển sang view `pg_stat_checkpointer`.

Bật log để thấy rõ:

```ini
log_checkpoints = on
```

## Full Page Writes

Nếu máy mất điện đúng lúc đang ghi một page 8KB, page có thể bị ghi dở
("torn page"). Để chống, sau mỗi checkpoint, lần đầu một page bị thay đổi thì
**cả page** được ghi vào WAL, không chỉ phần delta:

```ini
full_page_writes = on   # đừng tắt trên production
```

Đây là lý do WAL phình to ngay sau checkpoint, và là lý do `wal_compression`
đáng bật.

## synchronous_commit — đánh đổi durability lấy tốc độ

```sql
SET synchronous_commit = off;
```

Với `off`, `COMMIT` trả về **trước khi** WAL fsync xong. Nhanh hơn đáng kể, và
rủi ro là mất vài trăm ms giao dịch cuối nếu mất điện — nhưng **không** gây
hỏng dữ liệu (khác hoàn toàn với `fsync = off`, cái đó thì có thể hỏng và không
bao giờ nên tắt).

Hợp lý cho: bảng log, analytics, dữ liệu có thể sinh lại. Không dùng cho: giao
dịch tiền.

Đặt được ở mức từng transaction:

```sql
BEGIN;
SET LOCAL synchronous_commit = off;
INSERT INTO event_log ...;
COMMIT;
```

## WAL levels

```ini
wal_level = replica   # mặc định: đủ cho streaming replication + PITR
# minimal  — chỉ crash recovery, không replicate được
# logical  — thêm thông tin cho logical replication / CDC
```

Cần logical replication hoặc CDC (Debezium…) thì phải `logical`.

## Theo dõi

```sql
-- Vị trí WAL hiện tại
SELECT pg_current_wal_lsn();

-- Dung lượng WAL đang giữ
SELECT count(*) * 16 AS mb FROM pg_ls_waldir();

-- Replication lag (chạy trên primary)
SELECT client_addr, state,
       pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS lag_bytes
FROM pg_stat_replication;
```

## Replication slot — cái bẫy làm hết đĩa

Replication slot giữ WAL lại cho replica chưa đọc tới. Nếu replica chết mà slot
còn tồn tại, **WAL tích vô hạn đến khi đầy đĩa** và database dừng:

```sql
SELECT slot_name, active,
       pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS retained
FROM pg_replication_slots;

-- Xóa slot chết
SELECT pg_drop_replication_slot('slot_name');
```

Đặt trần để tự bảo vệ (PG 13+):

```ini
max_slot_wal_keep_size = 50GB
```

## Liên quan

- [MVCC](./mvcc) — WAL ghi lại các phiên bản dòng
- [Storage](./storage) — page 8KB mà WAL bảo vệ
