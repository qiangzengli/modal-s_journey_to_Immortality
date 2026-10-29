# 天南／血色禁地时期角色重建

用户要求：改善粗糙的三维角色，按照《凡人修仙传》动画的天南／血色禁地时期造型重建，旋转时可查看人物细节。地图与斗法须使用相同角色资源，既有战斗、装备和存档行为保持兼容。

当前交付为 Three.js 实时重建模型，不是动画制作方原始网格，也不等同于影视角色的精度。主要角色的时期特征、完整三维头颅、面部纹理、叠层衣装、发束、分指手和配饰均已接入实际地图与斗法。普通 NPC 复用这套身体与已有肖像类型，不声称每个路人都有原作精确面容。墨蛟沿用独立妖兽模型。

## 造型与实现

| 人物 | 本次造型 |
| --- | --- |
| 韩立 | 早期青灰外袍、浅色交领、束发马尾、腰间绿瓶与红穗，保持既有持剑动作 |
| 南宫婉 | 禁地时期浅紫外衫、紫色内衣、半束长发、金色细饰与朱雀环 |
| 墨大夫 | 消瘦面容、灰白发须、褐色医者袍与药囊 |
| 王蝉 | 燕家堡时期纹饰半面具、暗银束发、暗紫红衣装；保留现有血灵斗法表现 |
| 墨彩环、厉飞雨、张铁、金光上人及普通人物 | 分别使用现有肖像提取的脸部轮廓与纹理，按人物配置衣装、体型和法器 |

`game/character-model.js` 是地图、多人斗法共用的角色入口。`body/leftArm/rightArm/weapon/bag/nameplate` 接口不变；发束和衣带摆动不写入战斗用的身体／手臂旋转。

`character-geometry.js` 提供连续曲面、褶皱、带状衣襟和收尖发束，按材质和关节合并静态零件。每个主要角色控制在 8 万三角面、48 个 Mesh 以内。面部网格和 512 × 512 纹理在构建时生成，运行时只读取本地静态资源；不调用 AI、第三方建模服务或下载模型。布料微表面贴图在角色之间共享。图片加载失败时保留对应肤色。

面部使用明确的眼、鼻、唇和下颌拓扑，与后脑闭合网格衔接，不是面向镜头的立绘或平面贴脸。现有素材分辨率、截图光照和单视角重建限制了超近距离细节；后续可替换同一入口下的完整雕刻／骨骼资产。

## 参考与资源来源

- 韩立等现有肖像：仓库 `assets/generated/`。此次读取素材生成新的运行时纹理，未改写原图。
- 南宫婉服装与面容：[2022 年文章中的禁地时期画面](https://www.sohu.com/a/592037959_568249)，使用其中 `89b200a2ed04464d9180d0d0e35e6a86.jpeg`；配色另核对 [2020 年禁地画面](https://www.sohu.com/a/427582260_120083249)。
- 王蝉：[2021 年燕家堡特别篇画面](https://k.sina.cn/article_7150531948_1aa34756c001012y9z.html?from=animation)，采用 `39fd-kiksqxh4362609.jpg` 的面具造型。
- 面部拓扑来源：Google MediaPipe 的 [canonical_face_model.obj](https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/modules/face_geometry/data/canonical_face_model.obj)，Apache-2.0 许可证随 `game/assets/characters/LICENSE.mediapipe` 保存。坐标来自本地关键点提取并做比例、视角与对称调整；纹理做裁切、色彩整理与边缘融合。

运行时资产在 `game/assets/characters/` 和 `game/character-face-data.js`。服务器仅为明确列出的 JPG 和客户端模块提供路由，不开放源码、密钥或存档目录。

## 本地复现与验收

独立模型空间：`node scripts/preview-characters.mjs`，访问 `http://127.0.0.1:4196/`。可选择角色、查看正／侧／背面、面部特写、拖动旋转和缩放。该工具不读取游戏存档或模型密钥，不作为生产页面发布。

提取工具依赖 `mediapipe==1.2.0`、Pillow、NumPy，烘焙还需 OpenCV（MediaPipe 依赖已带入）。工具安装在独立 Python 虚拟环境，游戏本身不依赖 Python。准备现有肖像、上述参考图片和 Google 官方 `face_landmarker.task` 后：

```sh
python scripts/extract-character-faces.py --portraits assets/generated \
  --references /path/to/references --model /path/to/face_landmarker.task \
  --output /tmp/character-face-input
python scripts/bake-character-faces.py --input /tmp/character-face-input
```

参考目录中的输入名称为 `nangong-face.jpg`、`yanbao-0.jpg`；须使用上述参考原图尺寸，提取工具的王蝉裁切范围针对该帧。烘焙输出可直接提交，生产发布不运行这两个工具。

自动化检查：关键人物辨识部件、面部纵深、完整后脑、发束正向法线、背面外袍遮挡、三角面／Mesh 预算、衣发动画不覆盖斗法关节、南宫婉独立出手和受击。人工检查：实际地图与战斗的正面／侧面／背面、旋转和缩放、自动战斗、桌面与手机布局、浏览器控制台及静态资源请求。
