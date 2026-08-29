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

## 主管風格（語言層）

使用者可在固定情境之外選擇一種措辭風格；它不改變 manager move、轉移規則或結案條件。

| Style | 說話方式 | 邊界 |
| --- | --- | --- |
| `soft_group_pressure` | 克制、合作表象下訴諸團隊補位、共同責任與其他人的投入。 | 不做人身攻擊或明示懲罰。 |
| `aggressive_consequence` | 直接質疑能力、可靠性與責任，並用考績、升遷、職務調整、續任、向上回報、去留等後果施壓；可帶尖銳責備與公開歸責感。 | 後果必須與目前工作有關；不產生特定身分歧視、性羞辱或肢體暴力恐嚇。 |

風格指引會連同情境、歷史和 `allowedManagerMoves` 傳入 LLM。後端僅接受這兩個 style id，並由 controller 繼續控制成功、失敗與結束。

侵略型不共用一句泛用威脅。每個 scenario 另提供三句「口語錨點」供 LLM 自然改寫：S1 是配合度、留下收尾與團隊交接；S2 是期限、交付卡點與上級交代；S3 是阻擋證據、專業判斷與 rollback 責任。這些錨點只控制口吻和壓力焦點，不能讓模型越過 controller 指定的 manager move。

## 資料來源

- [勞動基準法第 32 條](https://laws.mol.gov.tw/FLAW/PrintFLAWDOC01.aspx?flno=32&id=FL014930) 與 [勞動部企業防制強迫勞動參考指引](https://www.mol.gov.tw/media/c3mj2nmw/%E9%99%84%E4%BB%B6_%E4%BC%81%E6%A5%AD%E9%98%B2%E5%88%B6%E5%BC%B7%E8%BF%AB%E5%8B%9E%E5%8B%95%E5%8F%83%E8%80%83%E6%8C%87%E5%BC%95.pdf?mediaDL=true)：S1 的工時與拒絕加班背景。
- [Google SRE：Embracing risk](https://sre.google/sre-book/embracing-risk/) 與 [Release engineering](https://sre.google/sre-book/release-engineering/)：S2 的 Scope／Time／Quality 取捨及可交付方案背景。
- [NIST SSDF SP 800-218](https://csrc.nist.gov/pubs/sp/800/218/final) 與 [Google SRE：Canarying releases](https://sre.google/workbook/canarying-releases/)：S3 的測試、風險證據、漸進發布與 rollback 替代方案背景。
