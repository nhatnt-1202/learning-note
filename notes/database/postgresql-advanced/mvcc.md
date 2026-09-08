# MVCC & Transactions

**MVCC** (Multi-Version Concurrency Control) là lý do PostgreSQL đọc và ghi
đồng thời mà không chặn nhau: thay vì ghi đè dòng cũ, PostgreSQL tạo **phiên bản
mới** của dòng đó, và mỗi transaction chỉ thấy phiên bản phù hợp với thời điểm
nó bắt đầu.

## Nguyên tắc cốt lõi

> Reader không bao giờ block writer. Writer không bao giờ block reader.

Đây là điểm khác biệt lớn so với các engine dùng read lock. Đánh đổi: dữ liệu cũ
tồn tại thêm một thời gian, và cần [VACUUM](./vacuum) đi dọn.

## xmin / xmax — hai cột ẩn

Mỗi dòng trong heap có metadata ẩn:

| Cột | Ý nghĩa |
|---|---|
| `xmin` | ID của transaction đã **tạo** dòng này |
| `xmax` | ID của transaction đã **xóa/cập nhật** dòng này (0 nếu còn sống) |
| `ctid` | Vị trí vật lý `(page, offset)` |

```sql
SELECT xmin, xmax, ctid, * FROM users WHERE id = 1;
```

Cách các câu lệnh tác động:

- `INSERT` → tạo dòng mới, `xmin` = txid hiện tại
- `DELETE` → **không xóa gì**, chỉ set `xmax` = txid hiện tại
- `UPDATE` → `DELETE` + `INSERT`: dòng cũ bị set `xmax`, dòng mới được thêm vào

Hệ quả quan trọng của `UPDATE`: **mỗi lần update là một dòng mới trên đĩa**. Một
bảng bị update liên tục sẽ phình to (bloat) dù số dòng logic không đổi. Đây cũng
là lý do update một cột nhỏ vẫn phải ghi lại cả dòng.

## Snapshot — transaction thấy gì

Khi transaction bắt đầu (hoặc mỗi câu lệnh, tùy isolation level), PostgreSQL
chụp một **snapshot**: danh sách transaction nào đã commit tại thời điểm đó.
Một phiên bản dòng là "hiển thị" nếu:

1. `xmin` đã commit **và** nằm trước snapshot, **và**
2. `xmax` rỗng, hoặc trỏ tới transaction chưa commit / sau snapshot

Xem snapshot hiện tại:

```sql
SELECT txid_current(), pg_current_snapshot();
```

## Isolation levels

PostgreSQL hỗ trợ 3 mức thực tế (`READ UNCOMMITTED` bị xử lý như
`READ COMMITTED` — PostgreSQL không bao giờ cho đọc dữ liệu chưa commit):

| Level | Dirty read | Non-repeatable read | Phantom read | Serialization anomaly |
|---|---|---|---|---|
| `READ COMMITTED` (mặc định) | Không | **Có** | **Có** | **Có** |
| `REPEATABLE READ` | Không | Không | Không | **Có** |
| `SERIALIZABLE` | Không | Không | Không | Không |

Lưu ý `REPEATABLE READ` của PostgreSQL mạnh hơn chuẩn SQL: nó chặn cả phantom
read, vì snapshot được lấy một lần cho toàn bộ transaction.

```sql
BEGIN ISOLATION LEVEL REPEATABLE READ;
  -- mọi câu lệnh trong đây thấy cùng một snapshot
COMMIT;
```

### READ COMMITTED — cái bẫy hay gặp

Ở mức mặc định, **mỗi câu lệnh lấy snapshot mới**. Hai lần `SELECT` trong cùng
transaction có thể ra kết quả khác nhau:

```sql
BEGIN;
  SELECT balance FROM accounts WHERE id = 1;  -- 100
  -- transaction khác commit: balance = 50
  SELECT balance FROM accounts WHERE id = 1;  -- 50 (!)
COMMIT;
```

Vì vậy pattern "đọc rồi tính rồi ghi" không an toàn ở `READ COMMITTED`. Cách
xử lý — dùng khóa hoặc để database tự tính:

```sql
-- Sai: race condition
SELECT balance FROM accounts WHERE id = 1;
UPDATE accounts SET balance = 50 WHERE id = 1;

-- Đúng 1: khóa dòng khi đọc
SELECT balance FROM accounts WHERE id = 1 FOR UPDATE;

-- Đúng 2: tính ngay trong UPDATE (atomic)
UPDATE accounts SET balance = balance - 50 WHERE id = 1;
```

### SERIALIZABLE và retry

`SERIALIZABLE` không dùng khóa mà phát hiện xung đột lúc commit, nên có thể ném
lỗi `40001 serialization_failure`. Ứng dụng **phải** retry:

```
ERROR: could not serialize access due to read/write dependencies among transactions
```

## Transaction ID wraparound

`xid` là số 32-bit → chỉ khoảng 4 tỷ giá trị rồi quay vòng. Nếu để wraparound,
dữ liệu cũ đột nhiên trông như "ở tương lai" và biến mất. PostgreSQL chống việc
này bằng cách **freeze** các dòng cũ (đánh dấu "luôn hiển thị"), do autovacuum
làm. Theo dõi:

```sql
SELECT datname, age(datfrozenxid) AS xid_age
FROM pg_database
ORDER BY xid_age DESC;
```

`xid_age` tiến gần `autovacuum_freeze_max_age` (mặc định 200 triệu) là dấu hiệu
autovacuum không theo kịp. Chi tiết ở [VACUUM](./vacuum).

## Kiểm tra transaction đang treo

Transaction mở lâu là kẻ thù của MVCC: nó giữ snapshot cũ, khiến VACUUM không
dọn được dead tuple nào mới hơn snapshot đó.

```sql
SELECT pid, state, age(clock_timestamp(), xact_start) AS duration, query
FROM pg_stat_activity
WHERE state <> 'idle' AND xact_start IS NOT NULL
ORDER BY xact_start;
```

Đặc biệt để ý `idle in transaction` — thường là bug ứng dụng quên `COMMIT`.

## Liên quan

- [Locking & Concurrency](./locking) — khi MVCC không đủ
- [VACUUM](./vacuum) — dọn dead tuple do MVCC sinh ra
- [Storage](./storage) — dòng được lưu vật lý thế nào
