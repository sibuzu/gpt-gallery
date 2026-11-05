# 工作區規則

- `sites/gallery1`、`sites/gallery2`、`sites/gallery3` 是獨立 Git repository，主 repository 忽略這些目錄。修改及提交時要確認所在 repository。
- Gallery 2 更新前，先讀取 [Gallery 2 更新規則](sites/gallery2/UPDATE_RULES.md)，並遵循其目錄內的 `AGENTS.md`。
- 使用者在對話中的最新指示優先於文件。新增或修正持續適用的更新要求時，同步更新對應規則文件。
- 使用者要求 `commit all and push` 時，檢查各 repository 的狀態，在有變更的 repository 分別提交並推送；完成後確認遠端與本地 HEAD 一致。
