# 第一章角色模型制作规范

## 统一标准

- 坐标：Y 轴向上，角色正面朝 +Z，1 单位等于 1 米。
- 比例：韩立 1.78 米；厉飞雨 1.82 米；张铁 1.84 米；墨大夫 1.76 米；墨彩环 1.65 米。
- 形体：国漫写实比例，头身比约 1:7.2；面部保持真实骨骼结构，避免二次元大眼比例。
- 输出：源文件使用 Blender；运行时输出 GLB（glTF 2.0），Unity 版本同步输出 FBX。
- 原点：双脚中心地面位置；所有角色应用缩放与旋转后导出。

## 移动端预算

| 类型 | LOD0 | LOD1 | LOD2 | 贴图 |
| --- | ---: | ---: | ---: | --- |
| 韩立、墨大夫、墨彩环 | 50k-65k 三角面 | 24k | 8k | 2K PBR |
| 厉飞雨、张铁、主要敌人 | 35k-45k | 18k | 6k | 2K/1K PBR |
| 普通 NPC | 20k-30k | 10k | 4k | 1K PBR |

每个材质使用 BaseColor、Normal、ORM（Occlusion/Roughness/Metallic）三张贴图。头发使用独立透明材质，移动端最多两层发片。单角色材质槽不超过 4 个。

## 骨骼与表情

- 使用标准 Humanoid 骨架，基础骨骼不超过 75 根。
- 额外骨骼：长发 8-12 根、宽袖 4-6 根、衣摆 6-10 根、武器挂点 3 个。
- 面部 BlendShape：眨眼、视线、张口、微笑、愤怒、疑惑、痛苦、轻蔑等至少 18 个。
- 挂点：右手武器、左手法器、背部武器、腰间储物袋、头顶任务标记。

## 基础动画

- 探索：待机、行走、奔跑、转向、交谈、拾取、打坐、受惊。
- 战斗：战斗待机、普攻三段、施法、法器、使用丹药、防御、受击、倒地、胜利。
- 剧情：拱手、递信、阅读、告别、警戒、咳嗽、愤怒、沉思。
- 所有移动动画提供 Root Motion 与 In Place 两版。

## 角色设计

### 韩立

- 少年时期身形偏瘦但结实，神情克制，动作幅度不夸张。
- 蓝灰色多层短打与长袍，早期服装纹样应简化，避免呈现后期高阶修士的奢华程度。
- 黑色束发，额前少量碎发；腰间预留神秘小瓶和储物袋挂点。
- 设定图：[hanli-turnaround.png](../assets/model-sheets/hanli-turnaround.png)

### 墨大夫

- 病弱消瘦、白灰长发、腰背仍然挺直；眼神体现控制欲和戒备。
- 黑褐色医者长袍，内层灰色，腰间药囊和药瓶可独立摆动。
- 专属表情需要覆盖咳嗽、审视、伪善微笑和夺舍时的狰狞。
- 设定图：[modafu-turnaround.png](../assets/model-sheets/modafu-turnaround.png)

### 墨彩环

- 少女时期体态轻盈，神态灵动；与修士角色相比保留明显的凡人生活气息。
- 青绿色与米白色层叠衣裙，玉饰只作为小面积点缀，不加入法术光效。
- 长发半束，发簪、耳坠和衣带均需独立二级动画。
- 设定图：[mocaihuan-turnaround.png](../assets/model-sheets/mocaihuan-turnaround.png)

### 厉飞雨

- 比韩立更挺拔外放，深蓝武者服，佩剑；动作强调速度和自信。
- 面色需保留长期服用抽髓丸造成的隐约疲态。

### 张铁

- 肩宽、体格厚实，棕色粗布练功服；外表憨厚，站姿稳定。
- 后续曲魂模型复用基础骨架，但更换肤色、表情和僵硬动作集。

## 文件结构

```text
assets/models/<character>/
  source/<character>.blend
  runtime/<character>-lod0.glb
  runtime/<character>-lod1.glb
  runtime/<character>-lod2.glb
  textures/<character>-basecolor.png
  textures/<character>-normal.png
  textures/<character>-orm.png
  animations/<clip>.glb
```

当前 Web 原型由 `models.js` 中的程序化模型执行上述角色差异。正式 GLB 模型完成后，应保持角色 ID 不变，以便直接替换而不修改剧情数据。
