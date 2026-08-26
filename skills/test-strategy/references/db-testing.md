# DB 测试处方（PostgreSQL 为主，原则通用）

> **阅读时机**：spec 验收矩阵含 DB 集成行、或计划任务要写 DB 测试步骤时加载；纯内存项目无需读。

## 病因算术（为什么慢）

每测试一容器 1.6-2.9s、每测试重放迁移 ~100ms、TRUNCATE 全表 40-60ms 且强制串行、模板库克隆 87-100ms（tmpfs）、事务回滚 2-4ms。拓扑错误时调优收益甚微——**先拓扑，再磁盘，后并行**。

## 五步改造（按杠杆排序）

1. **拓扑：job 级一个容器**（每包各起容器是隐形坑）：容器带 `--tmpfs` 数据目录 + `POSTGRES_INITDB_ARGS="--nosync --no-data-checksums"`（PG18 默认开 checksums，一次性容器纯浪费）。
2. **迁移一次进模板库**：`CREATE DATABASE tpl_migrated` 跑全部迁移 → `ALTER DATABASE tpl_migrated IS_TEMPLATE TRUE ALLOW_CONNECTIONS FALSE`。
3. **两速隔离**：速1 事务回滚（BEGIN...ROLLBACK，~80% 测试）；速2 模板克隆（`CREATE DATABASE test_x TEMPLATE tpl_migrated` + advisory lock 串行化）。速1 四硬限：序列不回滚（断言关系不断言绝对 ID）、测试内 COMMIT 会逃逸（用速2）、多连接看不到未提交行、CONCURRENTLY/CREATE DATABASE 不能进事务块。
4. **磁盘与服务器**：tmpfs > `fsync=off synchronous_commit=off full_page_writes=off` > initdb --nosync；`autovacuum=off max_connections=1000`。
5. **连接预算**：并发进程 × 每池连接 < max_connections；2 核 CI runner 加线程不如加 matrix job。

## 反模式清单

每测试/每文件一容器；每测试重放迁移；TRUNCATE 当唯一隔离；未串行化并发克隆；CI 开容器 reuse；克隆时模板库仍有连接。

来源证据：Storj 基准、pgtestdb、maragu（33s→9.9s）、miry（60→10min）、gajus（克隆 23x）——详见特性 spec 引用的原始探索文档证据索引。
