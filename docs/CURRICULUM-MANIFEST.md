# 第5段階マスター一覧

実行時の型付きデータから出力。41 Unit / 123 Skill / 410固定問題。版 math-v0.5-full。

| ID | 単元 | 領域 | ルート | 必須MAX | 内部Skill（前提stableで順次解放） |
|---|---|---|---|---|---|
| CAL | 計算基礎 | 中学｜数・計算 | MAIN | なし | CAL1 符号と四則 / CAL2 分数の計算 / CAL3 計算の統合 |
| EXP | 式変形基礎 | 中学｜式・方程式 | MAIN | CAL | EXP1 文字式の整理 / EXP2 分配法則と展開 / EXP3 式変形の統合 |
| EQU | 方程式基礎 | 中学｜式・方程式 | MAIN | EXP | EQU1 等式と同値変形 / EQU2 一次方程式 / EQU3 条件の数学化 |
| FUN | 関数基礎 | 中学｜関数・数量関係 | MAIN | EQU | FUN1 変数と対応・定義域 / FUN2 一次関数とグラフ / FUN3 関数の表現変換 |
| HSX | 数と式 | 高校｜式・論理 | MAIN | FUN | HSX1 実数と平方根 / HSX2 展開と因数分解 / HSX3 絶対値・不等式の条件整理 |
| QEQ | 二次方程式 | 高校｜式・論理 | MAIN | HSX | QEQ1 因数分解による解法 / QEQ2 平方完成と解の公式 / QEQ3 判別式と解の条件 |
| QFN | 二次関数 | 高校｜関数 | MAIN | QEQ | QFN1 平方完成とグラフ / QFN2 定義域と最大・最小 / QFN3 場合分けを含む統合 |
| MGEO | 中学図形 | 中学｜図形 | MAIN | EQU, HSX | MGEO1 図形の性質と作図 / MGEO2 合同・相似と証明 / MGEO3 円・三平方と空間の計量 |
| MCOUNT | 中学の場合・確率 | 中学｜場合・確率 | MAIN | CAL | MCOUNT1 漏れなく数える / MCOUNT2 等確率と確率 / MCOUNT3 標本と確率的判断 |
| MSTAT | 中学データ・統計 | 中学｜データ・統計 | MAIN | CAL | MSTAT1 代表値で見る / MSTAT2 分布と散らばり / MSTAT3 標本から考える |
| SET | 集合と命題 | 高校｜式・論理 | MAIN | HSX | SET1 集合と条件 / SET2 必要条件・十分条件 / SET3 証明と反例 |
| TRATIO | 図形と計量／三角比 | 高校｜図形 | MAIN | HSX, MGEO | TRATIO1 比から単位円へ / TRATIO2 三角形を測る / TRATIO3 図形の条件を統合する |
| COUNT | 場合の数 | 高校｜確率・統計 | MAIN | MCOUNT, HSX | COUNT1 和・積の法則 / COUNT2 順列・組合せ / COUNT3 条件付き計数 |
| PROB | 確率 | 高校｜確率・統計 | MAIN | COUNT | PROB1 等確率な標本空間 / PROB2 条件付き確率 / PROB3 反復試行と期待値 |
| DATA | データの分析 | 高校｜確率・統計 | MAIN | MSTAT, HSX | DATA1 分散と標準偏差 / DATA2 相関とデータの限界 / DATA3 仮説検定の考え方 |
| INT | 整数の性質／整数利用 | 高校｜式・論理 | MAIN | EQU | INT1 約数・倍数・余り / INT2 互除法と整数解 / INT3 数の表現と活用 |
| GEO | 図形の性質 | 高校｜図形 | MAIN | MGEO | GEO1 三角形の中心と相似 / GEO2 円と比の定理 / GEO3 目的を持った補助線 |
| ALG | いろいろな式 | 高校｜式・論理 | MAIN | HSX, COUNT | ALG1 除法・剰余・恒等式 / ALG2 有理式と不等式 / ALG3 式変形と高次方程式 |
| CEQ | 複素数と方程式 | 高校｜式・論理 | MAIN | QEQ, ALG | CEQ1 数を複素数へ拡張 / CEQ2 解と係数・対称式 / CEQ3 高次方程式と解の配置 |
| COORD | 図形と方程式 | 高校｜図形 | MAIN | QFN, MGEO | COORD1 幾何条件と方程式 / COORD2 直線と円の比較 / COORD3 軌跡・領域と統合 |
| TRIG | 三角関数 | 高校｜関数 | MAIN | TRATIO, QFN | TRIG1 動く二つの量と加法定理 / TRIG2 合成・倍角と形 / TRIG3 単位円で方程式・不等式 |
| EXPON | 指数関数 | 高校｜関数 | MAIN | QFN | EXPON1 指数の一般化 / EXPON2 乗法的変化とグラフ / EXPON3 置換と定義域 |
| LOG | 対数関数 | 高校｜関数 | MAIN | EXPON | LOG1 指数を求める対数 / LOG2 共通表現と比較 / LOG3 対数条件の統合 |
| DIFF2 | 微分法（数学II） | 高校｜微積分 | MAIN | QFN, ALG | DIFF21 変化率と導関数 / DIFF22 符号から増減表へ / DIFF23 グラフと条件の統合 |
| INT2 | 積分法（数学II） | 高校｜微積分 | MAIN | DIFF2 | INT21 微分の逆と原始関数 / INT22 定積分 / INT23 面積と符号の統合 |
| SEQ | 数列と和 | 高校｜数列・極限 | MAIN | HSX | SEQ1 増え方から一般項 / SEQ2 和をまとめる / SEQ3 数列と和の相互変換 |
| REC | 漸化式 | 高校｜数列・極限 | MAIN | SEQ | REC1 現象から漸化式 / REC2 既知の数列へ変換 / REC3 状態遷移の統合 |
| INDUCT | 数学的帰納法 | 高校｜数列・極限 | MAIN | REC, SET | INDUCT1 帰納法の構造 / INDUCT2 等式・整除の証明 / INDUCT3 不等式と帰納の設計 |
| INFER | 統計的な推測 | 高校｜確率・統計 | MAIN | DATA, PROB | INFER1 標本と確率分布 / INFER2 標本分布と標準誤差 / INFER3 区間推定と検定 |
| VEC | ベクトル | 高校｜図形 | MAIN | TRATIO, COORD | VEC1 向きと大きさの演算 / VEC2 内積と垂直 / VEC3 位置ベクトルと係数s,t |
| PVEC | 平面ベクトル統合 | 高校｜図形 | MAIN | VEC, GEO | PVEC1 係数と存在範囲 / PVEC2 交点と内積の統合 / PVEC3 図形の複数表現 |
| SVEC | 空間ベクトル | 高校｜図形 | MAIN | VEC | SVEC1 同じ道具を3次元へ / SVEC2 空間の内積と位置 / SVEC3 平面・直線の統合 |
| LIMIT | 極限 | 高校｜数列・極限 | MAIN | REC, TRIG, LOG | LIMIT1 数列の極限と無限 / LIMIT2 関数と逆・合成 / LIMIT3 関数の極限と連続 |
| DIFF3 | 微分法（数学III） | 高校｜微積分 | MAIN | LIMIT, DIFF2 | DIFF31 微分の一般化 / DIFF32 合成・逆・高階微分 / DIFF33 変化と近似の統合 |
| INT3 | 積分法（数学III） | 高校｜微積分 | MAIN | DIFF3, INT2 | INT31 積分の一般化 / INT32 置換・部分積分 / INT33 面積・体積の理論回収 |
| CPLANE | 複素数平面 | 別ルート｜複素数平面 | ANOTHER | CEQ, TRIG | CPLANE1 三つの解と複素平面 / CPLANE2 絶対値・偏角と積 / CPLANE3 n乗根と図形 |
| CURVE | 二次曲線・曲線の表示 | 高校｜図形 | MAIN | COORD, TRIG | CURVE1 焦点と二次曲線 / CURVE2 媒介変数と極座標 / CURVE3 曲線と条件の統合 |
| REP | 数学と社会生活・多様な表現 | 高校｜活用 | MAIN | DATA, COUNT | REP1 数学的モデルと限界 / REP2 図・グラフ・行列による表現 / REP3 社会の課題を検証する |
| NUMTHEORY | 整数／数論探究 | 隠しルート｜EXTRA | EXTRA | INT, INDUCT | NUMTHEORY1 合同式を使う / NUMTHEORY2 整数の構造を証明 / NUMTHEORY3 数論の統合探究 |
| ODE | 微分方程式 | 隠しルート｜EXTRA | EXTRA | INT3 | ODE1 変化の法則を式へ / ODE2 変数分離と初期条件 / ODE3 モデルと解の検証 |
| PROBLIMIT | 確率×漸化式×極限 | 隠しルート｜EXTRA | EXTRA | PROB, REC, LIMIT | PROBLIMIT1 確率の状態を表す / PROBLIMIT2 遷移を漸化式へ / PROBLIMIT3 長期挙動を検証する |

詳細な導入方法・履修内容・問題の役割・MAX定義は curriculum-v0.5.json を参照。教材量・入試水準を保証する一覧ではない。
