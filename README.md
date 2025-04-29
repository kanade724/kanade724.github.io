## XJTLU undergraduate student!

+ **RMer！**
+ **Laboratory: SIP IR724!**

<img align="right" src="picture/6677bbbd660607121c53d947d5ec2cb.jpg" alt="图片">

# BFANet: Revisiting 3D Semantic Segmentation with Boundary Feature Analysis

## 论文背景
- **3D语义分割**是理解三维场景非常重要的技术，常用于自动驾驶、机器人、增强现实等领域。
- 现有方法能提升总体分割效果，如提高 **mIoU（平均交并比）** 等指标。
- 大多数分割方法只看总体，有效分析 **难分区域** 如边界混淆等较少，导致很多区块分割困难。

---

## 论文核心思想
- 不能只看总体，还要分析出错类型！
- 将3D分割错误分为 **4种类型**：
  1. **False Response (错误响应)**：无效区域错分。
  2. **Merging Error (合并错误)**：不同物体错误联系。
  3. **Displacement Error (边界偏移)**：边界形状被破坏。
  4. **Region Classification Error (区域分类错误)**：整块区域分错。
- 为了解决这些问题，推出 **BFANet** 网络。

---

## 方法结构

### (1) 边界-语义模块 (Boundary-Semantic Block)
- 把特征分成两部分：
  - 一部分学习语义（分类）特征
  - 一部分学习边界特征
- 通过注意力机制，把边界特征融合到语义特征中，增强边界感知。

### (2) 实时边界伪标签计算 (PBPLC)
- 在训练时，通过CUDA并行计算，快速判断谁是边界点。
- 比传统方法快了**3.9倍**，支持各种数据增强技巧。

### (3) 四种精精指标评价
- 除了mIoU，还供上了额外的指标：FErr，MErr，DErr，RErr，对错误做精细分析。

---

## 结果
- **测试集**：ScanNet200，ScanNetv2
- **结果**：
  - 总分mIoU改善，相比最新的SOTA方法有明显提升
  - 四种详细错误类型全面降低，特别是小物体、处于边界的地方，效果最好
  - 在ScanNet200正式排行榜上排名第2

---

### 四种分割错误类型
- **False Response**：无效区域
- **Merging Error**：合并错误
- **Displacement**：边界偏移
- **Region Classification Error**：整块区域分类错误

这些错误都有对应的对系评价方法，以分别展示系统的薄弱点。

### BFANet网络结构
- 输入：3D场景点云
- 转换为Octree
- 特征提取：多层特征抽取
- 边界-语义分析：分别得到语义特征和边界特征
- 注意力融合：增强语义边界信息
- 预测：语义分类 + 边界预测

---
---

# BFANet (OctFormer版) 模型结构总览

| 模块 | 层次 | 参数 | 说明 |
|:----|:-----|:----|:----|
| 输入层 | Octree结构数据 | - | 输入的是Octree格式点云 |
| Stem模块 | 卷积 x2 | stride=2 | 初步特征提取与降采样 |
| Patch Embedding | Patch大小=32 | - | 将Octree分成小块，做特征提取 |
| Stage 1 | 2层 Transformer Block | channel=96, head=6 | 局部特征编码 |
| Stage 2 | 2层 Transformer Block | channel=192, head=12 | 中尺度特征提取 |
| Stage 3 | 18层 Transformer Block | channel=384, head=24 | 全局特征建模（主干部分） |
| Stage 4 | 2层 Transformer Block | channel=384, head=24 | 辅助增强特征 |
| FPN模块 | 上采样融合 | 输出fpn_channel=168 | 融合多尺度特征 |
| BFANet SegHeader | 两分支MLP | - | 语义预测 + 边界预测 |
| 输出层 | 4个输出 | sem_score_pred, mar_score_pred, sem_score_v2, mar_score_v2 | 最终预测结果 |

---
---
<br>

# BFANet_mink (Minkowski UNet版) 模型结构总览

| 模块 | 层次 | 参数 | 说明 |
|:----|:-----|:----|:----|
| 输入层 | 稀疏体素Tensor | - | 输入的是稀疏体素化后的点云 |
| 编码器 (Encoder) | 稀疏卷积块 | 每次stride=2 | 特征提取+降采样 |
| 编码器Stage1-4 | Conv → BN → PReLU | 特征数逐层增加 | 多层稀疏卷积提取局部到全局特征 |
| 解码器 (Decoder) | 反卷积块 | - | 恢复分辨率，并融合skip连接 |
| 语义分支 (Semantic Head) | Linear → BN → PReLU → Linear | 输出类别数 | 点级别语义分类预测 |
| 边界分支 (Margin Head) | Linear → BN → PReLU → Linear → Sigmoid | 输出1维（边界分数） | 点是否位于边界 |
| 输出层 | 4个输出 | sem_score_pred, mar_score_pred, sem_score_v2, mar_score_v2 | 最终预测结果 |


