# SpeakUp POC — 資料驅動對話模型

此 POC 固定三個真實職場問題，而非提供通用 Persona 生成器。每個 Scenario 在 `speakup-scenarios.mjs` 定義固定主管角色、主要壓力模式、主管行為、員工行為空間和可追溯資料來源。

```text
真實資料／研究依據
  → 語言現象與語意模式
  → 在地化 seed utterance
  → LLM 自然改寫

使用者語句
  → LLM employee_move 分類
  → Scenario Controller transition
  → 指定 manager_move
  → LLM manager_text
```

`seed_manager_utterances` 是以繁體中文、台灣職場脈絡撰寫的示範語句，不是宣稱為來源逐字引文。來源提供可驗證的問題背景與風險語彙；新資料加入前必須記錄其出處與抽象後的行為模式。

## 固定 Scenario

| Scenario | 固定主管脈絡 | 主要壓力模式 | 成功反應組合 |
| --- | --- | --- | --- |
| overtime | team-oriented manager | group responsibility | clear boundary + alternative，先 challenge 一次再 resolve |
| deadline | delivery-focused manager | delivery commitment | trade-off + priority request / alternative，先 challenge 一次再 resolve |
| risky_release | authority-led delivery manager | authority over risk | evidence + impact + safer alternative，先 challenge 一次再 resolve |

三者共同的終止條件是 `concede` 與 `emotional_distress`。只有 `speakup-controller-v2.mjs` 可以設定 outcome；模型回傳的 JSON 不含 outcome 或 termination 欄位。Controller 每回合提供 1–3 個 `allowedManagerMoves`，LLM 可依上下文在集合中選擇策略並生成台詞；後端會拒絕集合以外的策略。這讓語言與微策略自然變化，同時保留成功條件、壓力上限與安全邊界。

## 資料來源

- [勞動基準法第 32 條](https://laws.mol.gov.tw/FLAW/PrintFLAWDOC01.aspx?flno=32&id=FL014930) 與 [勞動部企業防制強迫勞動參考指引](https://www.mol.gov.tw/media/c3mj2nmw/%E9%99%84%E4%BB%B6_%E4%BC%81%E6%A5%AD%E9%98%B2%E5%88%B6%E5%BC%B7%E8%BF%AB%E5%8B%9E%E5%8B%95%E5%8F%83%E8%80%83%E6%8C%87%E5%BC%95.pdf?mediaDL=true)：S1 的工時與拒絕加班背景。
- [Google SRE：Embracing risk](https://sre.google/sre-book/embracing-risk/) 與 [Release engineering](https://sre.google/sre-book/release-engineering/)：S2 的 Scope／Time／Quality 取捨及可交付方案背景。
- [NIST SSDF SP 800-218](https://csrc.nist.gov/pubs/sp/800/218/final) 與 [Google SRE：Canarying releases](https://sre.google/workbook/canarying-releases/)：S3 的測試、風險證據、漸進發布與 rollback 替代方案背景。
