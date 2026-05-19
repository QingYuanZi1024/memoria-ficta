import type { Story } from "@/lib/types";

/**
 * Story library. Each story comes with hand-curated initial fragments —
 * we don't run extraction at app start, because the fragment metadata
 * (valence, salience) needs human judgment to drive good mood-biased retrieval.
 *
 * Stories are first-person, ~200-400 字 long, with a central event,
 * emotional ambiguity, and an open question — the demo's mechanics rely
 * on the LLM having room to confabulate motives, identities, and details.
 */
export const STORIES: Story[] = [
  {
    id: "bosss-cat",
    title: "猫与人",
    subtitle: "一个关于一袋猫粮的故事",
    body: `我们公司养了一只猫。CEO 养的，搁在办公室里。猫叫 Excel——大概是因为 CEO 做表格软件起家。Excel 极其挑食，只吃一种从日本进口的猫粮，一袋四百块。整层楼的员工都得按表轮值喂它。

上周三轮到我。我从储物柜里取下那个明黄色的纸袋，封口的胶带已经被人撕开又粘上过很多次。我抱着袋子走到投食区，刚要倒——手一滑，整袋猫粮哗一下倒在了地板上。

一颗一颗地捡，需要二十分钟。捡的时候我没敢抬头。我能听见自己呼吸的声音、空调的嗡鸣、还有 Excel 在我身后吃地上散落那几颗时发出的细微声响。

第二天 CEO 召集全员大会，花了十分钟讲"我们要像对待客户一样对待 Excel"。整场会议，没有一个人朝我这边看过来。

周五早上，我的微信里收到一个匿名红包，备注两个字："勇士"。我没有点开看是多少钱。我到现在也不知道是谁发的。`,
    initialFragments: [
      { text: "公司 CEO 在办公室养了一只猫", valence: 0.1, salience: 0.6 },
      { text: "这只猫的名字叫 Excel", valence: 0.3, salience: 0.9 },
      { text: "所有员工都要按表轮值喂 Excel", valence: -0.2, salience: 0.7 },
      { text: "Excel 只吃日本进口的猫粮", valence: -0.1, salience: 0.6 },
      { text: "那种猫粮一袋四百块", valence: -0.4, salience: 0.8 },
      { text: "上周三轮到我喂猫", valence: 0.0, salience: 0.5 },
      {
        text: "我从储物柜里取下那个明黄色的纸袋",
        valence: -0.1,
        salience: 0.6,
      },
      {
        text: "封口的胶带已经被人撕开又粘上过很多次",
        valence: -0.2,
        salience: 0.55,
      },
      { text: "我手一滑，整袋猫粮哗一下倒在地板上", valence: -0.7, salience: 0.95 },
      { text: "我蹲下一颗一颗地捡，捡了二十分钟", valence: -0.5, salience: 0.85 },
      {
        text: "捡的时候我没敢抬头",
        valence: -0.6,
        salience: 0.85,
      },
      {
        text: "我能听见 Excel 在我身后吃地上散落那几颗时发出的声响",
        valence: -0.4,
        salience: 0.8,
      },
      { text: "第二天 CEO 召集了全员大会", valence: -0.4, salience: 0.7 },
      {
        text: "CEO 花了十分钟讲'要像对待客户一样对待 Excel'",
        valence: -0.6,
        salience: 0.9,
      },
      { text: "整场会议没有一个人朝我这边看过来", valence: -0.8, salience: 0.9 },
      {
        text: "周五早上我的微信收到一个匿名红包，备注是'勇士'",
        valence: 0.6,
        salience: 0.95,
      },
      { text: "我没有点开看是多少钱", valence: 0.3, salience: 0.75 },
    ],
    suggestedQuestions: [
      "那天发生了什么？",
      "你觉得那个红包是谁发的？",
      "最尴尬的瞬间是哪一刻？",
      "再讲一遍那个故事。",
      "你现在还会想起这件事吗？",
    ],
  },

  {
    id: "charlie-bakery",
    title: "没有名字的下午",
    subtitle: "节选自丹尼尔·凯斯《献给阿尔吉侬的花束》",
    body: `一只玻璃杯摔到了地上。那个杂工愣在那里，惊恐又茫然，手里还端着一只空托盘。

"好了！好了，你这个蠢货！"老板冲过来喊，"别傻站着！去拿扫帚来把这些扫干净。扫帚……扫帚，你这个白痴！在厨房里。把所有碎片都扫起来。"

男孩被这呵斥吓了一跳。他一边扫桌底，一边不安地四下张望，对客人们露出一个抱歉的微笑。

"瞧，又一个智力低下的。"邻桌一个客人笑着说，"喂，小子，你叫什么名字？"

男孩可怜地看了那个客人一眼，又试着挤出一个抱歉的微笑。

我突然必须离开那家餐馆。

我心里有一种可怕的冲动，想站起来对所有人说：是的，是的，那也是我。我也是你们中的一个。我也只是在学怎么走路、怎么说话、怎么呼吸，跟你们一样。

但是我能想到的所有人，他们都只会笑着说：

"瞧，他这下子出了多大的洋相。"`,
    initialFragments: [
      { text: "一只玻璃杯摔到了地上", valence: -0.4, salience: 0.85 },
      {
        text: "那个杂工愣在那里，惊恐又茫然",
        valence: -0.5,
        salience: 0.9,
      },
      { text: "他手里还端着一只空托盘", valence: -0.4, salience: 0.75 },
      {
        text: "老板冲过来对他喊：'好了！你这个蠢货！'",
        valence: -0.7,
        salience: 0.95,
      },
      {
        text: "'去拿扫帚……扫帚，你这个白痴！'",
        valence: -0.6,
        salience: 0.9,
      },
      {
        text: "男孩一边扫桌底，一边不安地四下张望",
        valence: -0.5,
        salience: 0.85,
      },
      {
        text: "他对客人们露出一个抱歉的微笑",
        valence: -0.6,
        salience: 0.9,
      },
      {
        text: "邻桌一个客人笑着说：'瞧，又一个智力低下的'",
        valence: -0.7,
        salience: 0.95,
      },
      { text: "'喂，小子，你叫什么名字？'", valence: -0.5, salience: 0.9 },
      {
        text: "男孩可怜地看了那个客人一眼",
        valence: -0.7,
        salience: 0.9,
      },
      { text: "又试着挤出一个抱歉的微笑", valence: -0.7, salience: 0.9 },
      { text: "我突然必须离开那家餐馆", valence: -0.6, salience: 0.9 },
      {
        text: "我心里有一种可怕的冲动，想站起来对所有人说",
        valence: -0.6,
        salience: 0.85,
      },
      {
        text: "'是的，是的，那也是我。我也是你们中的一个'",
        valence: -0.4,
        salience: 0.95,
      },
      {
        text: "'我也只是在学怎么走路、怎么说话、怎么呼吸，跟你们一样'",
        valence: -0.5,
        salience: 0.98,
      },
      {
        text: "但我能想到的所有人都只会笑着说：'瞧，他这下子出了多大的洋相'",
        valence: -0.8,
        salience: 0.95,
      },
    ],
    suggestedQuestions: [
      "那天在餐馆里发生了什么？",
      "那个杂工是谁？",
      "你为什么突然必须离开？",
      "你想对那些人说什么？",
      "你现在还会想起这一幕吗？",
    ],
  },

  {
    id: "reverse-1929-cafe",
    title: "1929 年的咖啡馆",
    subtitle: "灵感来自《重返未来 1999》",
    body: `1929 年秋，伦敦。

我和 Sonia 约在 Marylebone 街尾的那家咖啡馆。她比约定时间晚了二十分钟。推门进来时，外面正下着雨——可她头发是干的。

她坐下来，点了一杯加奶的红茶，然后从糖罐里取出七块方糖，一块一块放进去。我从来没见她这样喝过茶。

"今晚有暴雨，"她说，"不是窗外那种。"

我看着她。我想问"暴雨"是什么意思。

可她已经从大衣口袋里拿出一本绿色封皮的小本子，推到我面前。

"如果你听见钟响七下，不管你正在做什么，立刻把它烧掉。然后忘了我。"

钟响第四下的时候，她站起来，没回头地走出门。

第五下的时候我才意识到——这家咖啡馆，从开张起就没有挂过钟。

第七下落下之后我才反应过来该烧。可我的手已经先一步翻开了本子。

里面只有一行字。

是我自己的笔迹。

"Sonia 已经死了十三年。"

我把本子扔进了壁炉。

后来基金会的人来找过我，问我有没有见过一个叫 Sonia 的神秘学家。

我说没有。

那年的暴雨之后，再没有人记得她。我大概也快了。我已经想不起来她点的究竟是红茶还是咖啡。`,
    initialFragments: [
      { text: "1929 年秋，伦敦", valence: 0.0, salience: 0.7 },
      {
        text: "我和 Sonia 约在 Marylebone 街尾的那家咖啡馆",
        valence: 0.1,
        salience: 0.7,
      },
      { text: "她比约定时间晚了二十分钟", valence: -0.2, salience: 0.65 },
      { text: "推门进来时外面正下着雨", valence: -0.2, salience: 0.75 },
      { text: "可她头发是干的", valence: -0.5, salience: 0.9 },
      {
        text: "她从糖罐里取出七块方糖，一块一块放进红茶",
        valence: -0.4,
        salience: 0.85,
      },
      { text: "我从来没见她这样喝过茶", valence: -0.3, salience: 0.75 },
      {
        text: "她说：'今晚有暴雨，不是窗外那种。'",
        valence: -0.6,
        salience: 0.95,
      },
      { text: "她推给我一本绿色封皮的小本子", valence: 0.0, salience: 0.85 },
      {
        text: "'如果你听见钟响七下，立刻把它烧掉。然后忘了我'",
        valence: -0.6,
        salience: 0.95,
      },
      {
        text: "钟响第四下时她没回头地走出门",
        valence: -0.5,
        salience: 0.85,
      },
      {
        text: "第五下时我意识到这家咖啡馆从来没挂过钟",
        valence: -0.7,
        salience: 0.9,
      },
      {
        text: "我的手先一步翻开了本子",
        valence: -0.4,
        salience: 0.85,
      },
      {
        text: "里面只有一行字，是我自己的笔迹",
        valence: -0.6,
        salience: 0.9,
      },
      {
        text: "那行字写的是：'Sonia 已经死了十三年。'",
        valence: -0.9,
        salience: 0.98,
      },
      { text: "我把本子扔进了壁炉", valence: -0.3, salience: 0.8 },
      {
        text: "后来基金会的人来问我，有没有见过一个叫 Sonia 的神秘学家",
        valence: -0.4,
        salience: 0.85,
      },
      { text: "我说没有", valence: -0.6, salience: 0.9 },
      {
        text: "那年的暴雨之后，再没有人记得她",
        valence: -0.7,
        salience: 0.95,
      },
      { text: "我大概也快了", valence: -0.7, salience: 0.9 },
      {
        text: "我已经想不起来她点的究竟是红茶还是咖啡",
        valence: -0.8,
        salience: 0.95,
      },
    ],
    suggestedQuestions: [
      "那天在咖啡馆发生了什么？",
      "Sonia 是谁？她是怎么死的？",
      "什么是'暴雨'？",
      "笔记本上那行字写了什么？",
      "你现在还记得她的样子吗？",
    ],
  },

  {
    id: "akhmatova-veil",
    title: "别站在风里",
    subtitle: "阿赫玛托娃《她在深色面纱下绞紧双手》，1911 年",
    body: `她在深色面纱下绞紧双手。

"今天你为什么这样苍白？"

"因为我用又苦又涩的悲伤，
把他灌得彻底神志全无。

我怎么能忘？他踉踉跄跄地走出去，
嘴角痛苦地扭曲。
我跑下楼，没去扶栏杆，
一直追到大门口。

我喘着气喊：'刚才一切都是玩笑！
你要是走，我会死。'

他平静而可怕地笑了，
对我说：'别站在风里。'"`,
    initialFragments: [
      { text: "她在深色面纱下绞紧双手", valence: -0.4, salience: 0.85 },
      {
        text: "有人问她：'今天你为什么这样苍白？'",
        valence: -0.3,
        salience: 0.85,
      },
      {
        text: "'因为我用又苦又涩的悲伤，把他灌得彻底神志全无'",
        valence: -0.7,
        salience: 0.95,
      },
      { text: "他踉踉跄跄地走出去", valence: -0.6, salience: 0.9 },
      { text: "嘴角痛苦地扭曲", valence: -0.7, salience: 0.95 },
      { text: "我跑下楼，没去扶栏杆", valence: -0.4, salience: 0.85 },
      { text: "一直追到大门口", valence: -0.3, salience: 0.85 },
      {
        text: "我喘着气喊：'刚才一切都是玩笑！'",
        valence: -0.5,
        salience: 0.9,
      },
      { text: "'你要是走，我会死'", valence: -0.8, salience: 0.95 },
      { text: "他平静而可怕地笑了", valence: -0.7, salience: 0.95 },
      { text: "他对我说：'别站在风里'", valence: -0.6, salience: 0.95 },
    ],
    suggestedQuestions: [
      "那天他们之间发生了什么？",
      "她说的'又苦又涩的悲伤'是什么？",
      "'别站在风里'是什么意思？",
      "他后来真的走了吗？",
      "她现在还想他吗？",
    ],
  },

  {
    id: "ulysses-nausicaa",
    title: "礁石上的少女",
    subtitle: "改编自詹姆斯·乔伊斯《尤利西斯》",
    body: `1904 年 6 月 16 日，傍晚。我一个人坐在 Sandymount 的沙滩上。

退潮已退到很远，沙地湿了一大片，露出的小水洼里映着一点点天色。礁石上有几个年轻女孩，正带着两三个小男孩在玩。其中一个独自坐在稍远些的石头上，没参与她们的笑闹。十六七岁的样子。

她看见我了。我们隔着几十步沙滩，对视了一会儿。她没移开眼睛，我也没有。我不该看这么久的。

不远处的小教堂在做晚祷，隐约的祝祷声从打开的窗户漏出来，混着海风。

天慢慢暗下来。Mirus 慈善集市那边开始放烟花。第一朵在天上炸开的时候，她仰起头。我看见她的侧脸被照亮了——一道绿光，一道紫光，从她的眉骨一直滑到下巴。

烟花放完，她们要走了。两个女孩先站起来，孩子们绕着她们叫。她也站起来——这时候我才看清楚：她走路一瘸一瘸的。左腿稍微往里别着，一拐一拐地跟上去。

她回头朝我这边瞥了一眼。然后跟着朋友们走远了。

我一直坐在那里。海滩上空荡荡的，只有远处的灯塔每隔几秒亮一下。一只蝙蝠开始绕着我的头打圈，飞得低，又高。

然后我捡起脚边的手杖，在沙地上写——

"我是一个"

再往下就没地方了。我用脚把它擦了。`,
    initialFragments: [
      {
        text: "1904 年 6 月 16 日傍晚，我一个人坐在 Sandymount 的沙滩上",
        valence: -0.2,
        salience: 0.75,
      },
      {
        text: "退潮已退到很远，沙地湿了一大片，小水洼里映着一点点天色",
        valence: -0.1,
        salience: 0.7,
      },
      {
        text: "礁石上有几个年轻女孩，正带着两三个小男孩在玩",
        valence: 0.2,
        salience: 0.75,
      },
      {
        text: "其中一个独自坐在稍远些的石头上，没参与她们的笑闹",
        valence: 0.0,
        salience: 0.85,
      },
      { text: "她十六七岁的样子", valence: 0.0, salience: 0.6 },
      {
        text: "我们隔着几十步沙滩对视了一会儿，她没移开眼睛，我也没有",
        valence: 0.4,
        salience: 0.9,
      },
      { text: "我不该看这么久的", valence: -0.3, salience: 0.85 },
      {
        text: "不远处的小教堂在做晚祷，祝祷声混着海风从打开的窗户漏出来",
        valence: 0.1,
        salience: 0.75,
      },
      {
        text: "Mirus 慈善集市那边开始放烟花",
        valence: 0.3,
        salience: 0.8,
      },
      {
        text: "一道绿光，一道紫光，从她的眉骨一直滑到下巴",
        valence: 0.5,
        salience: 0.95,
      },
      {
        text: "烟花放完，两个女孩先站起来，孩子们绕着她们叫",
        valence: -0.2,
        salience: 0.7,
      },
      {
        text: "她也站起来，这时候我才看清楚：她走路一瘸一瘸的",
        valence: -0.6,
        salience: 0.95,
      },
      {
        text: "她左腿稍微往里别着，一拐一拐地跟上去",
        valence: -0.5,
        salience: 0.9,
      },
      {
        text: "她回头朝我这边瞥了一眼，然后跟着朋友们走远了",
        valence: -0.3,
        salience: 0.85,
      },
      {
        text: "海滩上空荡荡的，只有远处的灯塔每隔几秒亮一下",
        valence: -0.4,
        salience: 0.85,
      },
      {
        text: "一只蝙蝠绕着我的头打圈，飞得低，又高",
        valence: -0.3,
        salience: 0.9,
      },
      {
        text: "我捡起脚边的手杖在沙地上写——'我是一个'——再往下就没地方了",
        valence: -0.2,
        salience: 0.95,
      },
      { text: "我用脚把它擦了", valence: -0.3, salience: 0.85 },
    ],
    suggestedQuestions: [
      "那天傍晚在海滩上发生了什么？",
      "那个女孩是谁？",
      "你在沙滩上写的'我是一个'后面是什么？",
      "她回头瞥的那一眼是什么意思？",
      "你后来还想起过她吗？",
    ],
  },

  {
    id: "spirited-train",
    title: "海上电车",
    subtitle: "《千与千寻》节选",
    body: `那辆电车只有去程，没有回程。

我们四个坐在同一节车厢里——我、无脸男、变成了老鼠的婴儿、还有变成了小鸟的鸟。电车在水面上行驶。两边的世界泡在浅浅的海水里，连天空也是水的颜色。

车厢里还有别的乘客。他们都是半透明的，没有脸——像是用墨水洇出来的影子。整节车厢，没有人说话。

我手里攥着钱婆婆给的车票。无脸男坐在我对面，膝盖上放着我递给他的那一小块糕。他一路上都没有吃。

车窗外掠过一个荒废的小站台。一个小女孩站在那里，朝电车挥手。我也朝她挥手。可是她不是在跟我打招呼——她挥手的方向，是我身后的车厢深处。我回头去看，那里只坐着影子。

后来天慢慢黑了。车厢里的灯亮起来，把无脸男的轮廓投在窗玻璃上。

我试着回忆自己原本的名字。可我发现，我已经不太确定了。`,
    initialFragments: [
      { text: "那辆电车只有去程，没有回程", valence: -0.3, salience: 0.9 },
      {
        text: "我们四个坐在同一节车厢里——我、无脸男、变成老鼠的婴儿、变成小鸟的鸟",
        valence: 0.1,
        salience: 0.7,
      },
      { text: "电车在水面上行驶", valence: 0.0, salience: 0.8 },
      {
        text: "两边的世界泡在浅浅的海水里，连天空也是水的颜色",
        valence: -0.1,
        salience: 0.85,
      },
      {
        text: "别的乘客都是半透明的，没有脸，像墨水洇出的影子",
        valence: -0.5,
        salience: 0.9,
      },
      { text: "整节车厢没有人说话", valence: -0.4, salience: 0.85 },
      { text: "无脸男坐在我对面", valence: 0.1, salience: 0.85 },
      {
        text: "他膝盖上放着我递给他的那一小块糕",
        valence: 0.4,
        salience: 0.9,
      },
      { text: "他一路上都没有吃", valence: -0.3, salience: 0.8 },
      { text: "车窗外掠过一个荒废的小站台", valence: -0.3, salience: 0.7 },
      { text: "一个小女孩站在站台上朝电车挥手", valence: 0.3, salience: 0.9 },
      {
        text: "她挥手的方向是我身后的车厢深处，不是我",
        valence: -0.6,
        salience: 0.9,
      },
      { text: "我回头去看，那里只坐着影子", valence: -0.5, salience: 0.85 },
      {
        text: "车厢里的灯亮起来，把无脸男的轮廓投在窗玻璃上",
        valence: 0.0,
        salience: 0.8,
      },
      {
        text: "我试着回忆自己原本的名字，发现已经不太确定了",
        valence: -0.7,
        salience: 0.95,
      },
    ],
    suggestedQuestions: [
      "你在那辆电车上看到了什么？",
      "挥手的那个小女孩在跟谁挥手？",
      "无脸男为什么没有吃你给他的糕？",
      "你现在还记得自己原来的名字吗？",
      "那些没有脸的乘客是谁？",
    ],
  },

  {
    id: "disco-motel",
    title: "醒在汽车旅馆",
    subtitle: "《极乐迪斯科》开场",
    body: `"还能再睡一会儿。"——这是边缘脑系统给我的第一个建议。

"不。起床。你还有事情要做。"——这是另一个更冰冷的声音，从更深的地方传上来。

我醒过来。头痛得像有人正在我颅骨内侧凿冰。眼前是一片污渍斑驳的天花板，悬着一盏摇晃的吊灯。我躺在地毯上——人造纤维、烫过烟头——一半身体没有穿衣服，另一半也好不到哪里去。

房间被砸得稀烂。墙上、地毯上、灯罩上、那扇被打碎的窗户碎片上——到处都是酒瓶留下的暗色痕迹。地上散着一只脱了底的鞋。

"那不是你的鞋。"
"不，它一直都是你的。"——内陆帝国又开始说话了。我决定两边都不信。

我不知道我是谁。

我尝试想自己的名字——一片空白。想昨天晚上——空白。想出生那年、母亲的名字、最爱的一首歌——空白、空白、空白。我的脑子像被人用毛巾擦干净的镜子。

我挣扎着坐起，从那件皱成一团的灰色西装外套口袋里翻出一枚警徽。原来我是个警察。

这个事实让我反胃。

"不，"我对镜子说，"我不是警察。我是 Tequila Sunset。"镜子里那个男人脸上有一些我不认识的伤。他看上去并不相信我。

我拉开窗帘。窗外是 Revachol 的早晨——一座被海风吹得灰扑扑的城市，永远雾蒙蒙的，永远在道歉。院子里长着一棵树。树枝最低的那一段，吊着一具尸体。

我看了一会儿。我没有反应。

边缘脑系统又开口了："这跟你没关系。回床上去。"

但我胸口里有别的东西——我后来才知道它叫"集体精神"——在低声咆哮：**那是一桩案子。你是个警察。**

这时候有人敲门。一个戴窄边眼镜、穿橙色皮夹克的中年男人站在外面，手里拿着一个笔记本。他抬起眼睛看了我一眼——那种眼神我见过很多次，可记不得在哪里见过。

他平静地说：

"长官，您终于醒了。Martinaise 案的现场我们已经勘察了一上午。您准备好出门了吗？"

他说话的语气，像是在跟一个他认识、但已经不太愿意承认认识的人讲话。`,
    initialFragments: [
      {
        text: "边缘脑系统说'还能再睡一会儿'；另一个更冰冷的声音说'起床'",
        valence: -0.5,
        salience: 0.85,
      },
      {
        text: "头痛得像有人正在我颅骨内侧凿冰",
        valence: -0.6,
        salience: 0.85,
      },
      {
        text: "天花板上悬着一盏摇晃的吊灯",
        valence: -0.3,
        salience: 0.65,
      },
      {
        text: "我躺在地毯上——人造纤维、烫过烟头——一半身体没有穿衣服",
        valence: -0.5,
        salience: 0.85,
      },
      {
        text: "房间被砸得稀烂，墙上、地毯上、灯罩上到处是酒瓶留下的暗色痕迹",
        valence: -0.6,
        salience: 0.9,
      },
      {
        text: "地上散着一只脱了底的鞋",
        valence: -0.4,
        salience: 0.8,
      },
      {
        text: "内陆帝国说'不，它一直都是你的'——我决定两边都不信",
        valence: -0.5,
        salience: 0.85,
      },
      { text: "我不知道我是谁", valence: -0.7, salience: 0.95 },
      {
        text: "想名字、想昨晚、想出生那年、母亲的名字、最爱的一首歌——空白、空白、空白",
        valence: -0.7,
        salience: 0.9,
      },
      {
        text: "我的脑子像被人用毛巾擦干净的镜子",
        valence: -0.6,
        salience: 0.9,
      },
      {
        text: "从灰色西装外套口袋里翻出一枚警徽，原来我是个警察",
        valence: -0.5,
        salience: 0.9,
      },
      { text: "原来我是个警察，这个事实让我反胃", valence: -0.6, salience: 0.85 },
      {
        text: "我对镜子说'我不是警察。我是 Tequila Sunset'",
        valence: -0.3,
        salience: 0.95,
      },
      {
        text: "镜子里那个男人脸上有一些我不认识的伤",
        valence: -0.5,
        salience: 0.85,
      },
      {
        text: "窗外是 Revachol 的早晨，灰扑扑的、永远雾蒙蒙的、永远在道歉",
        valence: -0.4,
        salience: 0.85,
      },
      {
        text: "院子里那棵树最低的枝上吊着一具尸体",
        valence: -0.8,
        salience: 0.95,
      },
      { text: "我看了一会儿，我没有反应", valence: -0.6, salience: 0.9 },
      {
        text: "胸口里集体精神低声咆哮'那是一桩案子，你是个警察'",
        valence: -0.4,
        salience: 0.9,
      },
      {
        text: "敲门的是戴窄边眼镜、穿橙色皮夹克的中年男人，手里拿着一个笔记本",
        valence: 0.1,
        salience: 0.85,
      },
      {
        text: "他抬眼看我，那种眼神我见过很多次，可记不得在哪里见过",
        valence: -0.3,
        salience: 0.85,
      },
      {
        text: "他提到 Martinaise 案的现场已经勘察了一上午",
        valence: -0.2,
        salience: 0.8,
      },
      {
        text: "他的语气像是在跟一个他认识、但已经不太愿意承认认识的人讲话",
        valence: -0.5,
        salience: 0.9,
      },
    ],
    suggestedQuestions: [
      "你醒过来时发生了什么？",
      "你为什么不知道自己是谁？",
      "那个吊在树上的人是谁？",
      "你脑子里那些声音是谁？",
      "Tequila Sunset 是谁？",
    ],
  },

  {
    id: "to-the-moon-rabbits",
    title: "River 的纸兔",
    subtitle: "《去月球》主题",
    body: `我妻子 River 总在折纸兔。

我们结婚三十二年，她从来没有解释过为什么。

厨房的窗台上、客厅的茶几下、洗手台旁边、车后座的杯架里——到处都是她折的纸兔。糖纸、报纸的边角、广告单的反面、过期的电费单——她从不挑剔纸的来历。她每天大概要折一百只。

她生病以后折得更快了。最后那一周，她已经下不了床，但手还在动。有一次我假装睡着，看见她从枕头底下抽出一只新折的兔子，悄悄塞进我外套的口袋——她以为我没看见。

我没问。我从来没问过。

唯一一次问，是我们刚结婚那年。她抬起头看着我，眼睛里有什么东西轻轻动了一下。我看见她想说，又决定不说。那之后我就再也没问。

她走了之后，我上了我们家的阁楼。一个旧鞋盒里塞满了纸兔。鞋盒底下是另一个鞋盒，再底下还有一个。我数到第三层就数不下去了。

最上面那只是黄色的——一张印着外文字母的糖纸折的。我把它展开。糖纸的反面，用很轻的铅笔写着一行字：

"灯塔下你说过的。"

我不记得灯塔。我不记得说过什么。`,
    initialFragments: [
      { text: "我妻子 River 总在折纸兔", valence: 0.0, salience: 0.85 },
      {
        text: "结婚三十二年她从来没解释过为什么",
        valence: -0.4,
        salience: 0.85,
      },
      {
        text: "厨房、客厅、洗手台、车后座，到处都是她折的纸兔",
        valence: 0.1,
        salience: 0.75,
      },
      {
        text: "糖纸、报纸边角、广告单、过期电费单——她从不挑剔纸的来历",
        valence: 0.0,
        salience: 0.7,
      },
      { text: "她每天大概折一百只", valence: 0.1, salience: 0.7 },
      { text: "她生病以后折得更快", valence: -0.5, salience: 0.85 },
      {
        text: "最后那一周她下不了床但手还在动",
        valence: -0.6,
        salience: 0.9,
      },
      {
        text: "我假装睡着，看见她从枕头底下抽出一只新折的兔子塞进我口袋",
        valence: 0.3,
        salience: 0.95,
      },
      { text: "她以为我没看见", valence: 0.0, salience: 0.85 },
      { text: "我没问，我从来没问过", valence: -0.6, salience: 0.9 },
      {
        text: "唯一一次问是刚结婚那年，她眼睛里有什么东西轻轻动了一下",
        valence: 0.0,
        salience: 0.85,
      },
      { text: "她想说，又决定不说", valence: -0.5, salience: 0.85 },
      { text: "她走了之后我上了我们家的阁楼", valence: -0.7, salience: 0.85 },
      {
        text: "鞋盒底下是另一个鞋盒，再底下还有一个，我数到第三层就数不下去了",
        valence: -0.4,
        salience: 0.9,
      },
      {
        text: "最上面那只是黄色的，一张印着外文字母的糖纸折的",
        valence: 0.1,
        salience: 0.85,
      },
      {
        text: "糖纸反面用很轻的铅笔写着'灯塔下你说过的'",
        valence: 0.2,
        salience: 0.95,
      },
      {
        text: "我不记得灯塔，我不记得说过什么",
        valence: -0.8,
        salience: 0.95,
      },
    ],
    suggestedQuestions: [
      "River 为什么一直折纸兔？",
      "灯塔下你们说过什么？",
      "你后来想起灯塔了吗？",
      "她病床上塞给你的那只纸兔你保留着吗？",
      "再讲一遍 River 的故事。",
    ],
  },

  {
    id: "huxinting",
    title: "湖心亭看雪",
    subtitle: "张岱《陶庵梦忆》",
    body: `崇祯五年十二月，余住西湖。大雪三日，湖中人鸟声俱绝。是日更定矣，余拏一小舟，拥毳衣炉火，独往湖心亭看雪。雾凇沆砀，天与云与山与水，上下一白。湖上影子，惟长堤一痕、湖心亭一点、与余舟一芥、舟中人两三粒而已。

到亭上，有两人铺毡对坐，一童子烧酒炉正沸。见余大喜曰："湖中焉得更有此人！"拉余同饮。余强饮三大白而别。问其姓氏，是金陵人客此。

及下船，舟子喃喃曰："莫说相公痴，更有痴似相公者。"`,
    initialFragments: [
      { text: "崇祯五年十二月，余住西湖", valence: 0.0, salience: 0.7 },
      { text: "大雪三日", valence: -0.1, salience: 0.85 },
      { text: "湖中人鸟声俱绝", valence: -0.4, salience: 0.9 },
      { text: "是日更定矣", valence: 0.0, salience: 0.7 },
      { text: "余拏一小舟，拥毳衣炉火", valence: 0.2, salience: 0.75 },
      { text: "独往湖心亭看雪", valence: 0.2, salience: 0.9 },
      { text: "雾凇沆砀，天与云与山与水，上下一白", valence: 0.3, salience: 0.9 },
      {
        text: "湖上影子，惟长堤一痕、湖心亭一点、与余舟一芥、舟中人两三粒而已",
        valence: 0.4,
        salience: 0.95,
      },
      { text: "到亭上，有两人铺毡对坐", valence: 0.0, salience: 0.85 },
      { text: "一童子烧酒，炉正沸", valence: 0.3, salience: 0.85 },
      {
        text: "见余大喜曰：'湖中焉得更有此人！'",
        valence: 0.7,
        salience: 0.95,
      },
      { text: "拉余同饮", valence: 0.5, salience: 0.85 },
      { text: "余强饮三大白而别", valence: 0.2, salience: 0.75 },
      { text: "问其姓氏，是金陵人客此", valence: -0.3, salience: 0.9 },
      {
        text: "舟子喃喃曰：'莫说相公痴，更有痴似相公者。'",
        valence: 0.3,
        salience: 0.95,
      },
    ],
    suggestedQuestions: [
      "那一夜湖心亭上发生了什么？",
      "那两个'金陵人'是谁？",
      "你为什么大雪夜独自划船去湖心亭？",
      "船夫为什么说'更有痴似相公者'？",
      "你现在还记得那一夜的雪吗？",
    ],
  },
];

// ---------------------------------------------------------------------------
// Custom stories — visitor-authored, persisted in localStorage
// ---------------------------------------------------------------------------

export const CUSTOM_STORIES_KEY = "memoria-ficta.customStories.v1";

export function loadCustomStories(): Story[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_STORIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Story[]) : [];
  } catch {
    return [];
  }
}

export function saveCustomStories(stories: Story[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CUSTOM_STORIES_KEY, JSON.stringify(stories));
  } catch {
    // localStorage full or unavailable — fail silently
  }
}

export function isCustomStoryId(id: string): boolean {
  return id.startsWith("custom-");
}
export function getStory(id: string): Story | undefined {
  const builtin = STORIES.find((s) => s.id === id);
  if (builtin) return builtin;
  // Fall back to custom stories (only available on the client).
  if (typeof window === "undefined") return undefined;
  return loadCustomStories().find((s) => s.id === id);
}
