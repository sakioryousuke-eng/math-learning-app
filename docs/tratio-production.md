# TRATIO 本番静的バンク

`src/tratio-bank/generate.ts` が承認済み3ファミリーの安全パラメータを検証し、`data/tratio-bank.json` に固定する。本番はJSONだけを読み、prototypeは検証画面で要求された時だけ読み込む。

通常 reviewed22＋verified-generated48＝70。repair2、固定MAX3は別枠。
F1 14（3/6/5）、F2 16（3/7/6）、F3 18（2/7/9）。難度はSTANDARD/APPLIED/PRACTICAL。
STEP別通常総数は6/19/24/21。generatedは0/14/16/18。
構造は34種類。同じ構造は通常2題以下。SSAの0解・1解・2解だけ既存signatureを変えず3題を保持する。これは存在判断・候補数の違う3状況であり、係数違いの水増しではない。
追加パラメータでは図から必要な長さ・角を読む。一部は最終目標だけを提示し、面積から外接円への接続も使う。signatureは元の数学構造を保持して証拠を過大評価しない。

生成時に156安全パラメータ、24境界近傍、48本番問題と3MAXの独立座標検証を実施する。選択肢の正答一意・数値同値除外・根拠・図の既知長を検証する。日本語/英語host相当でartifact全体がbyte-identical。問題文完全重複なし。

通常selectorは初見reviewed、基本理解後generated。異なる構造の成功とstable状態から難度を調整し、繰り返しの弱点仮説があればSTANDARDへ戻す。最近のvariantとstructureを避ける。現在Skillに複数familyが無い場合、family変更を無理に行わずstructureを変える。

生成問題の証拠はfamily・structure・requirementsを保持。習熟は独立性キー（familyを含まない数学構造）で重複排除し、係数違い・図読み版を別成功として数えない。1回の正解だけではstableにしない。紙の根拠を確認した正答はpositive evidence。誤答は選んだ候補の狭い仮説だけ保存し、広いCrossSkill失敗として確定しない。同じ仮説が別問題で繰り返されたときだけreviewedの短いrepairへ移り、元の問題へ戻る。

新MAXは固定3候補。7Skillすべてstable、紙答案の6択一致と全必須確認を満たす1回の成功のみ。失敗で過去stableを一括破棄せず、日数待ちなしで別候補へ。通常練習や旧MAX履歴からのMAX付与は禁止。TRIGの既存ANDゲートは変更しない。

math-v0.7-tratio-reviewed→math-v0.8-tratio-bankの加算移行ではreviewedの進度、修復、復帰、中断と履歴を保持する。旧MAX取得フラグは新判定へ移さず、元checkpointも保存する。

QFN問題・90題artifact・policy・selectorおよび3prototypeは変更していない。公開基盤・外部APIも変更していない。
