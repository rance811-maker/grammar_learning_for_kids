// Grammar Quest - Unit Data Bank (Units 7-9)
// Aligned with Cambridge Think 2 / PET (B1)

export const unitsBatch = [
  // ==================== UNIT 7 ====================
  {
    id: 7,
    title: "First & Second Conditionals",
    description: "第一 & 第二条件句",
    icon: "🔮",

    discover: {
      storyTitle: "The Magic Wish Box",
      story: "Last summer, my cousin Leo found an old box in the attic. \"If you open it, you will get one wish!\" he joked. I laughed. \"If I were you, I wouldn't believe that,\" I said. But Leo loves dreaming. \"If I had a million pounds, I would buy a spaceship,\" he sighed. \"If it rains tomorrow, we will test the box,\" he promised. The next day it rained, so we opened the box. Inside, there was only a note: \"If you share your dreams, they will come true. Unless you try, nothing will change.\" We smiled and started planning.",
      highlightWords: ["If you open it, you will get", "If I were you", "I wouldn't believe", "If I had a million pounds", "I would buy", "If it rains tomorrow, we will test", "If you share your dreams, they will come true", "Unless you try"],
      questions: [
        {
          question: "Look at 'If it rains tomorrow, we will test the box.' Why does the writer use 'will' here and not 'would'?",
          options: [
            "Because rain tomorrow is a real, possible situation (first conditional)",
            "Because the writer is talking about the past",
            "Because rain is impossible to imagine"
          ],
          correct: 0,
          explanation: "第一条件句用于真实、可能发生的情况：If + 一般现在时 → will + 动词原形。明天可能下雨，是真实可能的事，所以用 will，不用 would。",
          subSkill: "first_conditional"
        },
        {
          question: "In 'If I were you, I wouldn't believe that,' why does the writer say 'were' and 'wouldn't' instead of 'was' and 'will'?",
          options: [
            "Because it is a real situation that will happen",
            "Because it is an imaginary/unreal situation (second conditional)",
            "Because the writer made a spelling mistake"
          ],
          correct: 1,
          explanation: "第二条件句用于不真实、想象的情况：If + 一般过去时 → would + 动词原形。'如果我是你'是不可能的假设，所以用 were 和 wouldn't。",
          subSkill: "second_conditional"
        },
        {
          question: "What does 'Unless you try, nothing will change' mean?",
          options: [
            "If you try, nothing will change",
            "If you do NOT try, nothing will change",
            "You will always change"
          ],
          correct: 1,
          explanation: "unless = if...not（如果不……）。'Unless you try' = 'If you don't try'（如果你不尝试）。所以句意是：如果你不尝试，什么都不会改变。",
          subSkill: "unless"
        }
      ],
      grammarTip: "语法小贴士：第一条件句 = 真实可能 (If + 现在时 → will)；第二条件句 = 想象假设 (If + 过去时 → would)。unless = if...not。"
    },

    practice: {
      1: [
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "If it ___ tomorrow, we will stay home.",
          options: ["rain", "rains", "will rain", "rained"],
          correct: 1,
          explanation: "第一条件句：If 后面用一般现在时。It 是第三人称单数 → rains。主句用 will stay。",
          subSkill: "first_conditional"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "If you study hard, you ___ the exam.",
          options: ["pass", "passed", "will pass", "would pass"],
          correct: 2,
          explanation: "第一条件句的主句用 will + 动词原形。If 部分是现在时（study），主句 → will pass。",
          subSkill: "first_conditional"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "If I ___ rich, I would buy a big house.",
          options: ["am", "was", "were", "will be"],
          correct: 2,
          explanation: "第二条件句（想象的情况）：If 后面用一般过去时，be 动词常用 were（所有人称）。If I were rich... ✓",
          subSkill: "second_conditional"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "If she had wings, she ___ fly to school.",
          options: ["will", "would", "is", "does"],
          correct: 1,
          explanation: "第二条件句（不可能有翅膀，是想象）：主句用 would + 动词原形 → would fly。",
          subSkill: "second_conditional"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "We won't go to the park ___ the weather is nice.",
          options: ["if", "unless", "when", "because"],
          correct: 1,
          explanation: "unless = if...not（除非/如果不）。'除非天气好，否则我们不去公园'。Unless the weather is nice. ✓",
          subSkill: "unless"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "If you ___ your vegetables, you can have dessert.",
          options: ["eat", "eats", "will eat", "ate"],
          correct: 0,
          explanation: "第一条件句，主语 you 用动词原形 eat。If you eat your vegetables... ✓",
          subSkill: "first_conditional"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "I wish I ___ a dog. My parents won't let me have one.",
          options: ["have", "had", "will have", "having"],
          correct: 1,
          explanation: "wish 表示对现在不真实情况的愿望，后面用一般过去时。I wish I had a dog（但我没有）。✓",
          subSkill: "wish"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "If they ___ early, they will catch the bus.",
          options: ["leave", "leaves", "left", "would leave"],
          correct: 0,
          explanation: "第一条件句，主语 they（复数）用动词原形 leave。If they leave early... ✓",
          subSkill: "first_conditional"
        }
      ],

      2: [
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "If I ___ a superpower, I would become invisible.",
          options: ["have", "has", "had", "will have"],
          correct: 2,
          explanation: "第二条件句（想象拥有超能力）：If 后用一般过去时 had。If I had a superpower... ✓",
          subSkill: "second_conditional"
        },
        {
          type: "match",
          instruction: "把左右两边正确配对",
          left: [
            "If it rains,",
            "If I were rich,",
            "If she calls,",
            "If you study,"
          ],
          right: [
            "I'll stay home.",
            "I'd buy a yacht.",
            "tell her I'm out.",
            "you'll pass the test."
          ],
          correctPairs: [[0, 0], [1, 1], [2, 2], [3, 3]],
          explanation: "真实情况（If it rains / If she calls / If you study）配 will（'ll）；想象情况（If I were rich）配 would（'d）。",
          subSkill: "mixed_conditionals"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "You'll miss the train ___ you hurry up.",
          options: ["if", "when", "unless", "so"],
          correct: 2,
          explanation: "unless = if...not。'除非你快点，否则你会错过火车'。Unless you hurry up. ✓",
          subSkill: "unless"
        },
        {
          type: "match",
          instruction: "把句子和它的条件句类型配对",
          left: [
            "If I see Tom, I will say hi.",
            "If I had a car, I would drive.",
            "If you heat ice, it melts.",
            "If she were taller, she'd play basketball."
          ],
          right: [
            "First conditional<br><small style='opacity:.65'>第一条件句 · 真实可能 (will)</small>",
            "Second conditional<br><small style='opacity:.65'>第二条件句 · 假想 (had → would)</small>",
            "First conditional<br><small style='opacity:.65'>第一条件句 · 普遍事实 (现在时)</small>",
            "Second conditional<br><small style='opacity:.65'>第二条件句 · 假想 (were → would)</small>"
          ],
          correctPairs: [[0, 0], [1, 1], [2, 2], [3, 3]],
          explanation: "第一条件句用于真实可能/事实（will 或现在时）；第二条件句用于想象（had/were → would）。",
          subSkill: "mixed_conditionals"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "If I were a bird, I ___ over the mountains.",
          options: ["will fly", "would fly", "fly", "flew"],
          correct: 1,
          explanation: "第二条件句（不可能变成鸟）：主句用 would + 动词原形 → would fly。",
          subSkill: "second_conditional"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "If we ___ now, we will arrive on time.",
          options: ["leave", "left", "would leave", "leaving"],
          correct: 0,
          explanation: "第一条件句（真实可能）：If 后用一般现在时 leave。主句 will arrive。",
          subSkill: "first_conditional"
        },
        {
          type: "match",
          instruction: "把 'unless' 句子和它的意思配对",
          left: [
            "Unless you run, you'll be late.",
            "Unless it rains, we'll play outside.",
            "Unless you ask, she won't help.",
            "Unless you save money, you can't buy it."
          ],
          right: [
            "If you don't run, you'll be late.",
            "If it doesn't rain, we'll play outside.",
            "If you don't ask, she won't help.",
            "If you don't save money, you can't buy it."
          ],
          correctPairs: [[0, 0], [1, 1], [2, 2], [3, 3]],
          explanation: "unless = if...not。每个 'Unless...' 都可以改写成 'If...not...'，意思相同。",
          subSkill: "unless"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "I wish I ___ taller so I could reach the shelf.",
          options: ["am", "was", "will be", "be"],
          correct: 1,
          explanation: "wish 表达对现在的愿望，后面用一般过去时。I wish I was/were taller. ✓（口语中 was 也可接受）",
          subSkill: "wish"
        }
      ],

      3: [
        {
          type: "fill",
          instruction: "用括号中单词的正确形式填空",
          sentence: "If I (be) ___ you, I would apologize.",
          answer: "were",
          acceptableAnswers: ["were", "was"],
          explanation: "第二条件句中，be 动词常用 were（所有人称）。If I were you... 是固定建议句型。✓",
          subSkill: "second_conditional"
        },
        {
          type: "fill",
          instruction: "用括号中单词的正确形式填空",
          sentence: "If it (snow) ___ tomorrow, we will build a snowman.",
          answer: "snows",
          acceptableAnswers: ["snows"],
          explanation: "第一条件句：If 后用一般现在时。It 是第三人称单数 → snows。主句 will build。",
          subSkill: "first_conditional"
        },
        {
          type: "reorder",
          instruction: "把单词排列成正确的句子",
          words: ["If", "I", "had", "wings", "I", "would", "fly"],
          correct: "If I had wings I would fly.",
          explanation: "第二条件句结构：If + 主语 + 过去时, 主语 + would + 动词原形。If I had wings I would fly. ✓",
          subSkill: "second_conditional"
        },
        {
          type: "fill",
          instruction: "用括号中单词的正确形式填空",
          sentence: "If you press this button, the machine (start) ___.",
          answer: "will start",
          acceptableAnswers: ["will start", "'ll start"],
          explanation: "第一条件句（真实可能）：If 部分现在时，主句用 will + 动词原形 → will start。",
          subSkill: "first_conditional"
        },
        {
          type: "reorder",
          instruction: "把单词排列成正确的句子",
          words: ["Unless", "you", "hurry", "you", "will", "be", "late"],
          correct: "Unless you hurry you will be late.",
          explanation: "unless = if...not。Unless you hurry you will be late.（如果你不快点，你会迟到。）✓",
          subSkill: "unless"
        },
        {
          type: "fill",
          instruction: "用括号中单词的正确形式填空",
          sentence: "I wish I (have) ___ more free time to play games.",
          answer: "had",
          acceptableAnswers: ["had"],
          explanation: "wish + 一般过去时，表达对现在不真实情况的愿望。I wish I had more free time. ✓",
          subSkill: "wish"
        },
        {
          type: "reorder",
          instruction: "把单词排列成正确的句子",
          words: ["If", "she", "studies", "she", "will", "pass", "the", "exam"],
          correct: "If she studies she will pass the exam.",
          explanation: "第一条件句：If + 现在时（studies）, 主句 will + 动词原形。If she studies she will pass the exam. ✓",
          subSkill: "first_conditional"
        },
        {
          type: "fill",
          instruction: "用括号中单词的正确形式填空",
          sentence: "If we won the lottery, we (travel) ___ around the world.",
          answer: "would travel",
          acceptableAnswers: ["would travel", "'d travel"],
          explanation: "第二条件句（赢彩票是想象）：If 部分用过去时 won，主句 would + 动词原形 → would travel。",
          subSkill: "second_conditional"
        }
      ],

      4: [
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["If", "it", "will", "rain", "we", "will", "stay", "home"],
          errorIndex: 2,
          correction: "(remove will)",
          explanation: "第一条件句中，If 部分不用 will，要用一般现在时。If it rains, we will stay home. ✓",
          subSkill: "first_conditional"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["If", "I", "was", "a", "superhero", "I", "will", "save", "the", "world"],
          errorIndex: 6,
          correction: "would",
          explanation: "第二条件句（想象当超级英雄）：主句用 would，不用 will。If I were a superhero, I would save the world. ✓",
          subSkill: "second_conditional"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["Unless", "you", "don't", "study", "you", "will", "fail"],
          errorIndex: 2,
          correction: "(remove don't)",
          explanation: "unless 本身已经包含否定（= if...not），不能再用 don't。Unless you study, you will fail. ✓",
          subSkill: "unless"
        },
        {
          type: "choice",
          instruction: "哪个句子是正确的？",
          sentence: "选出语法正确的句子：",
          options: [
            "If I would have time, I would help you.",
            "If I had time, I would help you.",
            "If I have time, I would help you.",
            "If I had time, I will help you."
          ],
          correct: 1,
          explanation: "第二条件句：If + 过去时（had）, would + 动词原形。If I had time, I would help you. ✓ If 部分绝不用 would。",
          subSkill: "second_conditional"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["I", "wish", "I", "have", "a", "pet", "dragon"],
          errorIndex: 3,
          correction: "had",
          explanation: "wish 表达想象的愿望，后面用一般过去时。I wish I had a pet dragon. ✓",
          subSkill: "wish"
        },
        {
          type: "choice",
          instruction: "哪个句子是正确的？",
          sentence: "选出语法正确的句子：",
          options: [
            "If it rains, we don't will go out.",
            "If it will rain, we won't go out.",
            "If it rains, we won't go out.",
            "If it rains, we wouldn't go out."
          ],
          correct: 2,
          explanation: "第一条件句：If + 现在时（rains）, 主句 will/won't + 动词原形。If it rains, we won't go out. ✓",
          subSkill: "first_conditional"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["If", "I", "were", "you", "I", "will", "take", "an", "umbrella"],
          errorIndex: 5,
          correction: "would",
          explanation: "第二条件句（If I were you 是建议句型）：主句用 would。If I were you, I would take an umbrella. ✓",
          subSkill: "mixed_conditionals"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "If the world ___ no internet, life would be very different.",
          options: ["has", "had", "will have", "have"],
          correct: 1,
          explanation: "第二条件句（想象世界没有网络）：If 后用过去时 had，主句 would be。If the world had no internet... ✓",
          subSkill: "second_conditional"
        }
      ],

      5: [
        {
          type: "scenario",
          instruction: "选择最合适的回答",
          context: "Your friend dreams about being famous one day.",
          dialogue: [
            { speaker: "Friend", text: "What would you do if you were famous?" }
          ],
          options: [
            "I will buy a big house.",
            "I would travel the world and help people.",
            "I travel the world."
          ],
          correct: 1,
          explanation: "朋友用第二条件句问想象的情况（if you were famous）→ 回答也用 would。I would travel... ✓",
          subSkill: "second_conditional"
        },
        {
          type: "scenario",
          instruction: "选择最合适的回答",
          context: "It is cloudy outside. You are planning a picnic with your family.",
          dialogue: [
            { speaker: "Mum", text: "Do you think we can still have the picnic?" }
          ],
          options: [
            "If it rains, we will eat inside instead.",
            "If it rained, we would eat inside instead.",
            "If it will rain, we eat inside."
          ],
          correct: 0,
          explanation: "下雨是真实可能的事 → 第一条件句。If it rains, we will eat inside. ✓",
          subSkill: "first_conditional"
        },
        {
          type: "scenario",
          instruction: "选择最合适的回答",
          context: "Your classmate keeps forgetting to do homework and is worried.",
          dialogue: [
            { speaker: "Classmate", text: "What will happen if I don't finish my homework?" }
          ],
          options: [
            "Unless you finish it, the teacher would be angry.",
            "Unless you finish it, the teacher will be angry.",
            "If you don't finish it, the teacher would be angry."
          ],
          correct: 1,
          explanation: "真实可能的情况用第一条件句。Unless（= if...not）+ 现在时，主句 will。Unless you finish it, the teacher will be angry. ✓",
          subSkill: "unless"
        },
        {
          type: "choice",
          instruction: "选择正确的答案 (PET 风格)",
          sentence: "I ___ you if I had your phone number, but I don't have it.",
          options: ["will call", "would call", "call", "called"],
          correct: 1,
          explanation: "第二条件句（我没有你的号码，是不真实情况）：If 部分 had，主句 would call。✓",
          subSkill: "second_conditional"
        },
        {
          type: "scenario",
          instruction: "选择最合适的回答",
          context: "Your little brother wishes he could do something he can't.",
          dialogue: [
            { speaker: "Brother", text: "I really want to be a grown-up right now!" }
          ],
          options: [
            "I wish I am older too.",
            "I wish I was older too, but we have to wait.",
            "I will wish older."
          ],
          correct: 1,
          explanation: "wish + 一般过去时，表达对现在的愿望。I wish I was/were older. ✓",
          subSkill: "wish"
        },
        {
          type: "choice",
          instruction: "选择正确的答案 (PET 风格)",
          sentence: "If you ___ this email today, you will get a free gift tomorrow.",
          options: ["answered", "would answer", "answer", "will answer"],
          correct: 2,
          explanation: "第一条件句（真实可能）：If + 现在时 answer，主句 will get。✓",
          subSkill: "first_conditional"
        },
        {
          type: "scenario",
          instruction: "选择最合适的回答",
          context: "You and a friend are imagining what you'd do with a time machine.",
          dialogue: [
            { speaker: "Friend", text: "If you had a time machine, where would you go?" }
          ],
          options: [
            "I will go to the future.",
            "I would go to the age of dinosaurs!",
            "I go to the dinosaurs."
          ],
          correct: 1,
          explanation: "想象的情况（if you had a time machine）→ 第二条件句，回答用 would。I would go... ✓",
          subSkill: "second_conditional"
        },
        {
          type: "choice",
          instruction: "选择正确的答案 (PET 风格)",
          sentence: "We won't win the match ___ everyone plays their best.",
          options: ["if", "unless", "when", "because"],
          correct: 1,
          explanation: "unless = if...not。'除非每个人都尽力，否则我们赢不了比赛'。Unless everyone plays their best. ✓",
          subSkill: "unless"
        }
      ]
    },

    mission: {
      title: "If I Had Superpowers",
      taskDescription: "写一段关于'如果我有超能力'的短文，用第二条件句描述你会做什么。发挥想象力，让你的超级英雄故事精彩起来！",
      icon: "🦸",
      scaffolds: [
        {
          prefix: "If I had superpowers, I would ",
          suffix: ".",
          hint: "写一个你拥有超能力后会做的事 (用 would + 动词原形)",
          grammarCheck: "conditionals",
          example: "be able to fly anywhere in seconds"
        },
        {
          prefix: "If I could be invisible, I would ",
          suffix: ".",
          hint: "如果你能隐身，你会做什么？(第二条件句)",
          grammarCheck: "conditionals",
          example: "sneak into the kitchen and grab some snacks"
        },
        {
          prefix: "If I were super strong, I would ",
          suffix: ".",
          hint: "如果你力大无穷，你会帮助谁？(用 were 表示想象)",
          grammarCheck: "conditionals",
          example: "lift cars to help people in danger"
        },
        {
          prefix: "If there is real danger, I will ",
          suffix: ".",
          hint: "如果出现真正的危险，你会怎么做？(这里用第一条件句 will)",
          grammarCheck: "conditionals",
          example: "use my powers to keep my city safe"
        },
        {
          prefix: "I wish I ",
          suffix: " so I could save the world.",
          hint: "写一个你希望拥有的能力 (用 wish + 过去时)",
          grammarCheck: "conditionals",
          example: "had the power to read minds"
        }
      ],
      completionMessage: "太棒了！你写出了一篇精彩的超能力幻想短文，你是真正的假设大师！"
    },

    badge: {
      name: "假设大师",
      icon: "🔮",
      description: "掌握了第一和第二条件句"
    }
  },

  // ==================== UNIT 8 ====================
  {
    id: 8,
    title: "Passive Voice",
    description: "被动语态",
    icon: "📰",

    discover: {
      storyTitle: "The Mystery of the School Museum",
      story: "Our school has a tiny museum, and it is loved by every student. Last week, a strange old coin was found by the cleaner near the gym. Everyone was excited! The coin is kept in a glass box now, and photos of it were taken by our teacher. \"This coin was made over 200 years ago,\" she explained. \"It was used by sailors long ago.\" Today, the museum is visited by many curious children. New objects are added every month, and labels are written by the history club. If you visit, your name will be remembered as a real explorer!",
      highlightWords: ["it is loved by", "was found by the cleaner", "is kept", "were taken by our teacher", "was made", "was used by sailors", "is visited by many", "are added", "are written by the history club"],
      questions: [
        {
          question: "Look at 'a strange old coin was found by the cleaner.' Why does the writer focus on the coin instead of the cleaner?",
          options: [
            "Because the coin is the important thing, and 'who did it' is less important",
            "Because the cleaner is more important than the coin",
            "Because the sentence is in the future tense"
          ],
          correct: 0,
          explanation: "被动语态用来强调'动作的承受者'（the coin），而不是'谁做的'。当我们更关心发生了什么、对谁/什么发生时，就用被动语态。结构：be + 过去分词。",
          subSkill: "active_vs_passive"
        },
        {
          question: "Compare 'This coin was made 200 years ago' and 'The museum is visited by many children.' What is the difference?",
          options: [
            "'was made' is past passive; 'is visited' is present passive",
            "Both are present tense",
            "'was made' is active; 'is visited' is passive"
          ],
          correct: 0,
          explanation: "现在被动语态用 is/are + 过去分词（is visited）；过去被动语态用 was/were + 过去分词（was made）。be 动词的时态决定整个句子的时态。",
          subSkill: "past_passive"
        },
        {
          question: "In 'photos were taken by our teacher,' what does 'by our teacher' tell us?",
          options: [
            "When the photos were taken",
            "Who did the action (the agent)",
            "Where the photos are kept"
          ],
          correct: 1,
          explanation: "在被动语态中，by + 某人/某物 用来说明'动作是谁/什么做的'，这叫做'施动者'(agent)。by our teacher = 是老师拍的。",
          subSkill: "by_agent"
        }
      ],
      grammarTip: "语法小贴士：被动语态 = be + 过去分词。现在：is/are made；过去：was/were built。想说'谁做的'就用 by + 施动者。"
    },

    practice: {
      1: [
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "English ___ in many countries around the world.",
          options: ["speak", "speaks", "is spoken", "spoke"],
          correct: 2,
          explanation: "英语被人们说 → 现在被动语态：is/are + 过去分词。English（单数）→ is spoken。✓",
          subSkill: "present_passive"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "This bridge ___ in 1995.",
          options: ["builds", "is built", "was built", "build"],
          correct: 2,
          explanation: "桥在1995年被建造 → 过去被动语态：was/were + 过去分词。This bridge（单数）→ was built。✓",
          subSkill: "past_passive"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "Cheese ___ from milk.",
          options: ["is made", "makes", "made", "is making"],
          correct: 0,
          explanation: "奶酪由牛奶制成 → 现在被动语态。Cheese（单数）→ is made from milk。✓",
          subSkill: "present_passive"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "These cars ___ in Japan.",
          options: ["is made", "are made", "make", "makes"],
          correct: 1,
          explanation: "这些车在日本制造 → 现在被动语态。These cars（复数）→ are made。✓",
          subSkill: "present_passive"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "The Mona Lisa was painted ___ Leonardo da Vinci.",
          options: ["with", "by", "from", "of"],
          correct: 1,
          explanation: "想说'谁画的'用 by + 施动者。was painted by Leonardo da Vinci。✓",
          subSkill: "by_agent"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "The windows ___ every morning by the cleaner.",
          options: ["clean", "cleans", "are cleaned", "is cleaned"],
          correct: 2,
          explanation: "窗户每天早上被打扫 → 现在被动语态。The windows（复数）→ are cleaned。✓",
          subSkill: "present_passive"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "My phone ___ last week. I need a new one.",
          options: ["was stolen", "is stolen", "steals", "stole"],
          correct: 0,
          explanation: "我的手机上周被偷了 → 过去被动语态。My phone（单数）+ last week → was stolen。✓",
          subSkill: "past_passive"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "The pyramids ___ thousands of years ago.",
          options: ["are built", "was built", "were built", "build"],
          correct: 2,
          explanation: "金字塔几千年前被建造 → 过去被动语态。The pyramids（复数）→ were built。✓",
          subSkill: "past_passive"
        }
      ],

      2: [
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "Pizza ___ in Italy a long time ago.",
          options: ["invented", "was invented", "is invented", "invents"],
          correct: 1,
          explanation: "披萨很久以前被发明 → 过去被动语态。Pizza（单数）→ was invented。✓",
          subSkill: "past_passive"
        },
        {
          type: "match",
          instruction: "把左右两边正确配对",
          left: [
            "Chocolate is made",
            "The book was written",
            "These shoes are made",
            "The goal was scored"
          ],
          right: [
            "from cocoa beans.",
            "by a famous author.",
            "in Italy.",
            "by our best player."
          ],
          correctPairs: [[0, 0], [1, 1], [2, 2], [3, 3]],
          explanation: "被动语态结构 be + 过去分词，后面可接 from（原料）/by（施动者）/in（地点）。",
          subSkill: "by_agent"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "Many languages ___ at our international school.",
          options: ["is spoken", "are spoken", "speak", "speaks"],
          correct: 1,
          explanation: "很多语言被使用 → 现在被动语态。Many languages（复数）→ are spoken。✓",
          subSkill: "present_passive"
        },
        {
          type: "match",
          instruction: "把主动句和对应的被动句配对",
          left: [
            "Tom cleans the room.",
            "Tom cleaned the room.",
            "They build houses.",
            "They built a house."
          ],
          right: [
            "The room is cleaned by Tom.",
            "The room was cleaned by Tom.",
            "Houses are built by them.",
            "A house was built by them."
          ],
          correctPairs: [[0, 0], [1, 1], [2, 2], [3, 3]],
          explanation: "主动变被动：宾语变主语 + be（时态对应）+ 过去分词 + by + 原主语。现在 → is/are；过去 → was/were。",
          subSkill: "active_vs_passive"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "___ this letter written by your grandfather?",
          options: ["Did", "Was", "Is", "Does"],
          correct: 1,
          explanation: "过去被动语态的疑问句：Was/Were + 主语 + 过去分词？This letter（单数，过去）→ Was this letter written...? ✓",
          subSkill: "passive_questions"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "The homework ___ by the teacher every day.",
          options: ["checks", "is checked", "check", "was checked"],
          correct: 1,
          explanation: "作业每天被检查 → 现在被动语态。The homework（单数）+ every day → is checked。✓",
          subSkill: "present_passive"
        },
        {
          type: "match",
          instruction: "把句子和它的时态配对",
          left: [
            "The cake is eaten quickly.",
            "The cake was eaten yesterday.",
            "The walls are painted white.",
            "The walls were painted last year."
          ],
          right: [
            "Present passive<br><small style='opacity:.65'>现在被动 · is + 过去分词</small>",
            "Past passive<br><small style='opacity:.65'>过去被动 · was + 过去分词</small>",
            "Present passive<br><small style='opacity:.65'>现在被动 · are + 过去分词</small>",
            "Past passive<br><small style='opacity:.65'>过去被动 · were + 过去分词</small>"
          ],
          correctPairs: [[0, 0], [1, 1], [2, 2], [3, 3]],
          explanation: "is/are + 过去分词 = 现在被动；was/were + 过去分词 = 过去被动。be 动词决定时态。",
          subSkill: "past_passive"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "Where ___ these toys made?",
          options: ["is", "are", "do", "does"],
          correct: 1,
          explanation: "现在被动语态疑问句：Where are + 主语 + 过去分词？these toys（复数）→ Where are these toys made? ✓",
          subSkill: "passive_questions"
        }
      ],

      3: [
        {
          type: "fill",
          instruction: "用括号中单词的正确形式填空 (被动语态)",
          sentence: "Paper (make) ___ from trees.",
          answer: "is made",
          acceptableAnswers: ["is made"],
          explanation: "纸由树制成 → 现在被动语态。Paper（单数）→ is made。✓",
          subSkill: "present_passive"
        },
        {
          type: "fill",
          instruction: "用括号中单词的正确形式填空 (被动语态)",
          sentence: "The castle (build) ___ over 500 years ago.",
          answer: "was built",
          acceptableAnswers: ["was built"],
          explanation: "城堡500多年前被建造 → 过去被动语态。The castle（单数）→ was built。✓",
          subSkill: "past_passive"
        },
        {
          type: "reorder",
          instruction: "把单词排列成正确的句子 (被动语态)",
          words: ["The", "song", "was", "written", "by", "a", "student"],
          correct: "The song was written by a student.",
          explanation: "过去被动语态：主语 + was/were + 过去分词 + by + 施动者。The song was written by a student. ✓",
          subSkill: "by_agent"
        },
        {
          type: "fill",
          instruction: "用括号中单词的正确形式填空 (被动语态)",
          sentence: "These photos (take) ___ by my brother yesterday.",
          answer: "were taken",
          acceptableAnswers: ["were taken"],
          explanation: "这些照片昨天被我哥哥拍的 → 过去被动。These photos（复数）→ were taken。✓",
          subSkill: "past_passive"
        },
        {
          type: "reorder",
          instruction: "把单词排列成正确的句子 (被动语态)",
          words: ["Rice", "is", "grown", "in", "many", "Asian", "countries"],
          correct: "Rice is grown in many Asian countries.",
          explanation: "现在被动语态：主语 + is/are + 过去分词。Rice is grown in many Asian countries. ✓",
          subSkill: "present_passive"
        },
        {
          type: "fill",
          instruction: "用括号中单词的正确形式填空 (被动语态)",
          sentence: "The new stadium (open) ___ next month.",
          answer: "will be opened",
          acceptableAnswers: ["will be opened"],
          explanation: "新体育场下个月将被开放 → 将来被动语态：will be + 过去分词。will be opened。✓",
          subSkill: "active_vs_passive"
        },
        {
          type: "reorder",
          instruction: "把单词排列成正确的句子 (被动语态疑问句)",
          words: ["Was", "this", "picture", "painted", "by", "you"],
          correct: "Was this picture painted by you?",
          explanation: "过去被动疑问句：Was/Were + 主语 + 过去分词 + by...? Was this picture painted by you? ✓",
          subSkill: "passive_questions"
        },
        {
          type: "fill",
          instruction: "用括号中单词的正确形式填空 (被动语态)",
          sentence: "Our classroom (clean) ___ every afternoon.",
          answer: "is cleaned",
          acceptableAnswers: ["is cleaned"],
          explanation: "教室每天下午被打扫 → 现在被动语态。Our classroom（单数）→ is cleaned。✓",
          subSkill: "present_passive"
        }
      ],

      4: [
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["The", "letter", "was", "write", "by", "my", "friend"],
          errorIndex: 3,
          correction: "written",
          explanation: "被动语态用 be + 过去分词。write 的过去分词是 written。The letter was written. ✓",
          subSkill: "past_passive"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["These", "books", "is", "read", "by", "many", "children"],
          errorIndex: 2,
          correction: "are",
          explanation: "These books 是复数，be 动词用 are。These books are read by many children. ✓",
          subSkill: "present_passive"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["The", "window", "was", "broken", "with", "a", "ball"],
          errorIndex: 4,
          correction: "by",
          explanation: "说明'被什么/谁'做的动作用 by。The window was broken by a ball. ✓（with 表示工具，但施动者用 by）",
          subSkill: "by_agent"
        },
        {
          type: "choice",
          instruction: "哪个句子是正确的？",
          sentence: "选出语法正确的被动句：",
          options: [
            "The cake was eat by the dog.",
            "The cake was eaten by the dog.",
            "The cake eaten by the dog.",
            "The cake is eat by the dog."
          ],
          correct: 1,
          explanation: "过去被动语态：was/were + 过去分词。eat 的过去分词是 eaten。The cake was eaten by the dog. ✓",
          subSkill: "past_passive"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["Is", "these", "computers", "used", "in", "your", "school"],
          errorIndex: 0,
          correction: "Are",
          explanation: "these computers 是复数，疑问句用 Are。Are these computers used in your school? ✓",
          subSkill: "passive_questions"
        },
        {
          type: "choice",
          instruction: "哪个句子是正确的？",
          sentence: "选出正确的被动句（主动句：They make toys in this factory.）：",
          options: [
            "Toys are made in this factory.",
            "Toys is made in this factory.",
            "Toys are make in this factory.",
            "Toys made in this factory."
          ],
          correct: 0,
          explanation: "主动变被动：宾语 toys（复数）作主语 + are + 过去分词 made。Toys are made in this factory. ✓",
          subSkill: "active_vs_passive"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["The", "song", "is", "sang", "by", "a", "famous", "singer"],
          errorIndex: 3,
          correction: "sung",
          explanation: "sing 的过去分词是 sung，不是 sang（sang 是过去式）。The song is sung by a famous singer. ✓",
          subSkill: "present_passive"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "The thief ___ by the police last night.",
          options: ["catches", "is caught", "was caught", "catch"],
          correct: 2,
          explanation: "小偷昨晚被警察抓住 → 过去被动语态。The thief（单数）+ last night → was caught。✓",
          subSkill: "past_passive"
        }
      ],

      5: [
        {
          type: "scenario",
          instruction: "选择最合适的回答",
          context: "A reporter is interviewing the owner of a famous chocolate factory.",
          dialogue: [
            { speaker: "Reporter", text: "Where is your chocolate made?" }
          ],
          options: [
            "We make in Switzerland.",
            "It is made in Switzerland with the best cocoa.",
            "It was make in Switzerland."
          ],
          correct: 1,
          explanation: "记者问'巧克力在哪里制造'（现在被动）→ 回答用现在被动语态 is made。✓",
          subSkill: "present_passive"
        },
        {
          type: "scenario",
          instruction: "选择最合适的回答",
          context: "You are visiting an old castle on a school trip.",
          dialogue: [
            { speaker: "Guide", text: "Do you know when this castle was built?" }
          ],
          options: [
            "It was built in the 13th century.",
            "It is built in the 13th century.",
            "They build it in the 13th century."
          ],
          correct: 0,
          explanation: "导游问'城堡何时被建造'（过去被动）→ 回答用过去被动语态 was built。✓",
          subSkill: "past_passive"
        },
        {
          type: "scenario",
          instruction: "选择最合适的回答",
          context: "A news reporter is talking about a robbery at the bank.",
          dialogue: [
            { speaker: "Reporter", text: "What happened to the stolen money?" }
          ],
          options: [
            "The police find the money.",
            "The money was found by the police this morning.",
            "The money is find by the police."
          ],
          correct: 1,
          explanation: "新闻报道常用被动语态强调'事情'。钱被警察找到 → 过去被动 was found by the police。✓",
          subSkill: "by_agent"
        },
        {
          type: "choice",
          instruction: "选择正确的答案 (PET 风格)",
          sentence: "The results of the competition ___ tomorrow.",
          options: ["announce", "are announced", "will be announced", "announced"],
          correct: 2,
          explanation: "比赛结果明天将被公布 → 将来被动语态 will be + 过去分词。will be announced。✓",
          subSkill: "active_vs_passive"
        },
        {
          type: "scenario",
          instruction: "选择最合适的回答",
          context: "A TV news anchor is reporting breaking news about a new bridge.",
          dialogue: [
            { speaker: "Anchor", text: "Tell our viewers about the new bridge." }
          ],
          options: [
            "A new bridge was opened in the city centre today.",
            "A new bridge opens it today.",
            "A new bridge is open by workers."
          ],
          correct: 0,
          explanation: "新闻播报用被动语态突出事件。新桥今天被开通 → 过去被动 was opened。✓",
          subSkill: "past_passive"
        },
        {
          type: "choice",
          instruction: "选择正确的答案 (PET 风格)",
          sentence: "Millions of emails ___ every single day around the world.",
          options: ["is sent", "are sent", "send", "sends"],
          correct: 1,
          explanation: "数百万封邮件每天被发送 → 现在被动语态。Millions of emails（复数）→ are sent。✓",
          subSkill: "present_passive"
        },
        {
          type: "scenario",
          instruction: "选择最合适的回答",
          context: "You are at a museum and ask the guide about a painting.",
          dialogue: [
            { speaker: "You", text: "Who was this painting created by?" }
          ],
          options: [
            "It paints by a Spanish artist.",
            "It was painted by a famous Spanish artist.",
            "A Spanish artist paint it."
          ],
          correct: 1,
          explanation: "问'被谁创作'→ 用 by + 施动者的过去被动。It was painted by a famous Spanish artist. ✓",
          subSkill: "by_agent"
        },
        {
          type: "choice",
          instruction: "选择正确的答案 (PET 风格)",
          sentence: "___ your bike repaired at that shop?",
          options: ["Did", "Does", "Was", "Do"],
          correct: 2,
          explanation: "过去被动疑问句：Was/Were + 主语 + 过去分词？Was your bike repaired...? ✓",
          subSkill: "passive_questions"
        }
      ]
    },

    mission: {
      title: "Breaking News",
      taskDescription: "写一段新闻报道，用被动语态来描述发生的事件。像真正的新闻主播一样，让你的报道既正式又精彩！",
      icon: "📺",
      scaffolds: [
        {
          prefix: "This morning, a ",
          suffix: " was discovered in our town.",
          hint: "写一个被发现的东西 (用过去被动语态的句型)",
          grammarCheck: "passive",
          example: "mysterious old treasure chest"
        },
        {
          prefix: "The object was found by ",
          suffix: ".",
          hint: "说明是谁发现的 (用 by + 施动者)",
          grammarCheck: "passive",
          example: "a young schoolboy on his way home"
        },
        {
          prefix: "It is believed that the item was made ",
          suffix: ".",
          hint: "描述它是何时/在哪里制造的 (过去被动)",
          grammarCheck: "passive",
          example: "over a hundred years ago in another country"
        },
        {
          prefix: "Now the treasure is kept ",
          suffix: ".",
          hint: "说明它现在被保存在哪里 (现在被动)",
          grammarCheck: "passive",
          example: "safely in the town museum"
        },
        {
          prefix: "The full story will be told ",
          suffix: ".",
          hint: "新闻结尾：完整故事将在哪里/何时被讲述 (将来被动)",
          grammarCheck: "passive",
          example: "on tomorrow's evening news at six o'clock"
        }
      ],
      completionMessage: "太棒了！你写出了一篇专业的新闻报道，你就是真正的新闻主播！"
    },

    badge: {
      name: "新闻主播",
      icon: "📰",
      description: "掌握了被动语态"
    }
  },

  // ==================== UNIT 9 ====================
  {
    id: 9,
    title: "Relative Clauses",
    description: "定语从句",
    icon: "🔗",

    discover: {
      storyTitle: "The Friend Who Saved the Day",
      story: "I have a friend who is amazing at fixing things. Last week, my bike, which I got for my birthday, suddenly broke near the park where we always meet. I was worried! Then I called Sam, whose toolbox is always full of useful gadgets. Sam, who lives next door, came in five minutes. \"This is the bike that needs new brakes,\" he said. He used a tool which looked very strange, and soon my bike worked again. The park where we play is far from home, so a good friend who can fix bikes is worth a million pounds!",
      highlightWords: ["a friend who is amazing", "my bike, which I got", "the park where we always meet", "Sam, whose toolbox", "who lives next door", "the bike that needs new brakes", "a tool which looked very strange", "The park where we play", "a good friend who can fix bikes"],
      questions: [
        {
          question: "Look at 'a friend who is amazing at fixing things.' Why does the writer use 'who' and not 'which'?",
          options: [
            "Because 'who' is used for people, and a friend is a person",
            "Because 'who' is used for things",
            "Because 'who' is used for places"
          ],
          correct: 0,
          explanation: "who 用来指人。a friend（朋友）是人，所以用 who。如果是东西，就用 which 或 that；如果是地点，用 where。",
          subSkill: "who_people"
        },
        {
          question: "In 'my bike, which I got for my birthday,' why does the writer use 'which'?",
          options: [
            "Because a bike is a person",
            "Because 'which' is used for things, and a bike is a thing",
            "Because 'which' is used for places"
          ],
          correct: 1,
          explanation: "which 用来指物（东西）。my bike（自行车）是东西，所以用 which。指人用 who，指物用 which/that。",
          subSkill: "which_things"
        },
        {
          question: "Look at 'the park where we always meet' and 'Sam, whose toolbox is full.' What do 'where' and 'whose' tell us?",
          options: [
            "'where' is for places; 'whose' shows possession (belonging to)",
            "Both are used only for people",
            "'where' is for things; 'whose' is for places"
          ],
          correct: 0,
          explanation: "where 用来指地点（the park where = 在公园里）；whose 表示'谁的'，说明所属关系（Sam's toolbox → whose toolbox）。",
          subSkill: "whose_possession"
        }
      ],
      grammarTip: "语法小贴士：who = 人, which = 物, that = 人或物, where = 地点, whose = 谁的（所属）。关系词把两个句子连接起来。"
    },

    practice: {
      1: [
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "The girl ___ sits next to me is from Spain.",
          options: ["which", "who", "where", "whose"],
          correct: 1,
          explanation: "the girl 是人，用 who 引导定语从句。The girl who sits next to me... ✓",
          subSkill: "who_people"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "This is the book ___ won a big prize.",
          options: ["who", "where", "which", "whose"],
          correct: 2,
          explanation: "the book 是物，用 which（或 that）。This is the book which won a big prize. ✓",
          subSkill: "which_things"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "That's the restaurant ___ we had dinner last night.",
          options: ["which", "who", "where", "whose"],
          correct: 2,
          explanation: "the restaurant 是地点，用 where 表示'在那里'。the restaurant where we had dinner. ✓",
          subSkill: "where_places"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "She is the woman ___ dog barks all night.",
          options: ["who", "which", "where", "whose"],
          correct: 3,
          explanation: "whose 表示'谁的'（所属）。the woman whose dog = 这个女人的狗。✓",
          subSkill: "whose_possession"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "I have a friend ___ can speak four languages.",
          options: ["which", "who", "where", "whose"],
          correct: 1,
          explanation: "a friend 是人，用 who。I have a friend who can speak four languages. ✓",
          subSkill: "who_people"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "A dictionary is a book ___ tells you what words mean.",
          options: ["who", "that", "where", "whose"],
          correct: 1,
          explanation: "a book 是物，可以用 that（指人或物都可以）。a book that tells you... ✓",
          subSkill: "that_usage"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "This is the house ___ my grandparents live.",
          options: ["which", "who", "where", "whose"],
          correct: 2,
          explanation: "the house 是地点，用 where。the house where my grandparents live. ✓",
          subSkill: "where_places"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "He's the boy ___ won the running race.",
          options: ["which", "who", "where", "whose"],
          correct: 1,
          explanation: "the boy 是人，用 who。He's the boy who won the running race. ✓",
          subSkill: "who_people"
        }
      ],

      2: [
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "The phone ___ I bought yesterday is broken.",
          options: ["who", "which", "where", "whose"],
          correct: 1,
          explanation: "the phone 是物，用 which（或 that）。The phone which I bought yesterday... ✓",
          subSkill: "which_things"
        },
        {
          type: "match",
          instruction: "把左右两边正确配对",
          left: [
            "The man who",
            "The cake which",
            "The school where",
            "The girl whose"
          ],
          right: [
            "lives here is a doctor.",
            "Mum made was delicious.",
            "I study is very big.",
            "bag was stolen is crying."
          ],
          correctPairs: [[0, 0], [1, 1], [2, 2], [3, 3]],
          explanation: "who 指人，which 指物，where 指地点，whose 表所属。每个关系词后面跟正确的句子。",
          subSkill: "whose_possession"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "A vet is a doctor ___ takes care of animals.",
          options: ["which", "who", "where", "whose"],
          correct: 1,
          explanation: "a doctor 是人，用 who。A vet is a doctor who takes care of animals. ✓",
          subSkill: "who_people"
        },
        {
          type: "match",
          instruction: "把关系词和它的用法配对",
          left: ["who", "which", "where", "whose"],
          right: [
            "for people",
            "for things",
            "for places",
            "for possession (belonging to)"
          ],
          correctPairs: [[0, 0], [1, 1], [2, 2], [3, 3]],
          explanation: "who = 人, which = 物, where = 地点, whose = 谁的（所属）。记住这些基本规则！",
          subSkill: "which_things"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "London is a city ___ millions of tourists visit every year.",
          options: ["who", "that", "whose", "where"],
          correct: 1,
          explanation: "这里 city 是从句的宾语（tourists visit it），用 that/which。a city that millions of tourists visit. ✓",
          subSkill: "that_usage"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "That's the museum ___ we saw the dinosaur bones.",
          options: ["which", "who", "where", "whose"],
          correct: 2,
          explanation: "the museum 是地点，用 where。the museum where we saw the dinosaur bones. ✓",
          subSkill: "where_places"
        },
        {
          type: "match",
          instruction: "把句子和正确的关系词配对",
          left: [
            "The teacher ___ helps us is kind.",
            "The game ___ we played was fun.",
            "The town ___ I was born is small.",
            "The boy ___ father is a pilot."
          ],
          right: ["who", "which", "where", "whose"],
          correctPairs: [[0, 0], [1, 1], [2, 2], [3, 3]],
          explanation: "teacher（人）→ who；game（物）→ which；town（地点）→ where；boy's father（所属）→ whose。",
          subSkill: "whose_possession"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "I know a girl ___ brother plays for the national team.",
          options: ["who", "which", "whose", "where"],
          correct: 2,
          explanation: "whose 表示所属。a girl whose brother = 这个女孩的哥哥。✓",
          subSkill: "whose_possession"
        }
      ],

      3: [
        {
          type: "fill",
          instruction: "用 who / which / where / whose 填空",
          sentence: "The man ___ helped us was very kind.",
          answer: "who",
          acceptableAnswers: ["who", "that"],
          explanation: "the man 是人，用 who（或 that）。The man who helped us... ✓",
          subSkill: "who_people"
        },
        {
          type: "fill",
          instruction: "用 who / which / where / whose 填空",
          sentence: "I lost the watch ___ my dad gave me.",
          answer: "which",
          acceptableAnswers: ["which", "that"],
          explanation: "the watch 是物，用 which（或 that）。the watch which my dad gave me. ✓",
          subSkill: "which_things"
        },
        {
          type: "reorder",
          instruction: "把单词排列成正确的句子",
          words: ["This", "is", "the", "park", "where", "we", "play"],
          correct: "This is the park where we play.",
          explanation: "where 引导地点定语从句。This is the park where we play. ✓",
          subSkill: "where_places"
        },
        {
          type: "fill",
          instruction: "用 who / which / where / whose 填空",
          sentence: "That is the girl ___ painting won first prize.",
          answer: "whose",
          acceptableAnswers: ["whose"],
          explanation: "whose 表示所属。the girl whose painting = 这个女孩的画。✓",
          subSkill: "whose_possession"
        },
        {
          type: "reorder",
          instruction: "把单词排列成正确的句子",
          words: ["He", "is", "the", "teacher", "who", "teaches", "maths"],
          correct: "He is the teacher who teaches maths.",
          explanation: "who 指人，引导定语从句。He is the teacher who teaches maths. ✓",
          subSkill: "who_people"
        },
        {
          type: "fill",
          instruction: "用 who / which / where / whose 填空",
          sentence: "This is the café ___ we first met.",
          answer: "where",
          acceptableAnswers: ["where"],
          explanation: "the café 是地点，用 where。the café where we first met. ✓",
          subSkill: "where_places"
        },
        {
          type: "reorder",
          instruction: "把单词排列成正确的句子",
          words: ["I", "have", "a", "cat", "which", "loves", "fish"],
          correct: "I have a cat which loves fish.",
          explanation: "which 指物/动物，引导定语从句。I have a cat which loves fish. ✓",
          subSkill: "which_things"
        },
        {
          type: "fill",
          instruction: "用 who / which / where / whose 填空",
          sentence: "A library is a place ___ you can borrow books.",
          answer: "where",
          acceptableAnswers: ["where"],
          explanation: "a place 是地点，用 where。a place where you can borrow books. ✓",
          subSkill: "where_places"
        }
      ],

      4: [
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["The", "boy", "which", "broke", "the", "window", "ran", "away"],
          errorIndex: 2,
          correction: "who",
          explanation: "the boy 是人，应该用 who，不是 which。The boy who broke the window... ✓",
          subSkill: "who_people"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["This", "is", "the", "phone", "who", "I", "want", "to", "buy"],
          errorIndex: 4,
          correction: "which",
          explanation: "the phone 是物，应该用 which（或 that），不是 who。the phone which I want to buy. ✓",
          subSkill: "which_things"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["That's", "the", "city", "which", "I", "grew", "up"],
          errorIndex: 3,
          correction: "where",
          explanation: "the city 是地点，且后面有完整句子（I grew up there），应用 where。the city where I grew up. ✓",
          subSkill: "where_places"
        },
        {
          type: "choice",
          instruction: "哪个句子是正确的？",
          sentence: "选出语法正确的句子：",
          options: [
            "The dog who has brown fur is mine.",
            "The dog which has brown fur is mine.",
            "The dog where has brown fur is mine.",
            "The dog whose has brown fur is mine."
          ],
          correct: 1,
          explanation: "the dog 是动物（物），用 which（或 that）。The dog which has brown fur is mine. ✓",
          subSkill: "which_things"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["She's", "the", "woman", "who's", "car", "is", "red"],
          errorIndex: 3,
          correction: "whose",
          explanation: "表示所属用 whose，不是 who's（= who is）。the woman whose car is red. ✓",
          subSkill: "whose_possession"
        },
        {
          type: "choice",
          instruction: "哪个句子是正确的？",
          sentence: "选出语法正确的句子：",
          options: [
            "This is the school which I learn English.",
            "This is the school who I learn English.",
            "This is the school where I learn English.",
            "This is the school whose I learn English."
          ],
          correct: 2,
          explanation: "the school 是地点，用 where。This is the school where I learn English. ✓",
          subSkill: "where_places"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["A", "chef", "is", "a", "person", "which", "cooks", "food"],
          errorIndex: 5,
          correction: "who",
          explanation: "a person 是人，用 who（或 that），不是 which。a person who cooks food. ✓",
          subSkill: "who_people"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "The students ___ projects were the best won a prize.",
          options: ["who", "which", "whose", "where"],
          correct: 2,
          explanation: "whose 表示所属。the students whose projects = 学生们的项目。✓",
          subSkill: "whose_possession"
        }
      ],

      5: [
        {
          type: "scenario",
          instruction: "选择最合适的回答",
          context: "You are describing your new classmate to your mum.",
          dialogue: [
            { speaker: "Mum", text: "So, who is your new friend?" }
          ],
          options: [
            "He's the boy which sits behind me.",
            "He's the boy who sits behind me and loves football.",
            "He's the boy where sits behind me."
          ],
          correct: 1,
          explanation: "the boy 是人，用 who。He's the boy who sits behind me. ✓",
          subSkill: "who_people"
        },
        {
          type: "scenario",
          instruction: "选择最合适的回答",
          context: "Your friend can't find a book and asks you about it.",
          dialogue: [
            { speaker: "Friend", text: "Which book do you mean?" }
          ],
          options: [
            "The one who has a dragon on the cover.",
            "The one which has a dragon on the cover.",
            "The one where has a dragon on the cover."
          ],
          correct: 1,
          explanation: "book 是物，用 which（或 that）。The one which has a dragon on the cover. ✓",
          subSkill: "which_things"
        },
        {
          type: "scenario",
          instruction: "选择最合适的回答",
          context: "A tourist is asking you for directions to a special place.",
          dialogue: [
            { speaker: "Tourist", text: "What is that big building over there?" }
          ],
          options: [
            "It's the library which you can read books.",
            "It's the library where you can read and study.",
            "It's the library who you can read books."
          ],
          correct: 1,
          explanation: "the library 是地点，用 where。It's the library where you can read and study. ✓",
          subSkill: "where_places"
        },
        {
          type: "choice",
          instruction: "选择正确的答案 (PET 风格)",
          sentence: "I met a girl ___ mother is a famous actress.",
          options: ["who", "which", "whose", "where"],
          correct: 2,
          explanation: "whose 表示所属。a girl whose mother = 这个女孩的妈妈。✓",
          subSkill: "whose_possession"
        },
        {
          type: "scenario",
          instruction: "选择最合适的回答",
          context: "You are playing a guessing game. You describe a person for your friend to guess.",
          dialogue: [
            { speaker: "Friend", text: "Give me a clue about the mystery person!" }
          ],
          options: [
            "It's the teacher which helps us with science.",
            "It's the teacher whose glasses are always on her head.",
            "It's the teacher where helps us with science."
          ],
          correct: 1,
          explanation: "whose 表示所属。the teacher whose glasses = 老师的眼镜。✓",
          subSkill: "whose_possession"
        },
        {
          type: "choice",
          instruction: "选择正确的答案 (PET 风格)",
          sentence: "The hotel ___ we stayed last summer had a huge pool.",
          options: ["which", "who", "where", "whose"],
          correct: 2,
          explanation: "the hotel 是地点，用 where。The hotel where we stayed last summer... ✓",
          subSkill: "where_places"
        },
        {
          type: "scenario",
          instruction: "选择最合适的回答",
          context: "You are telling your friend about a great app you found.",
          dialogue: [
            { speaker: "Friend", text: "Tell me about that app you mentioned." }
          ],
          options: [
            "It's an app who helps you learn grammar.",
            "It's an app that helps you learn grammar quickly.",
            "It's an app where helps you learn grammar."
          ],
          correct: 1,
          explanation: "an app 是物，用 that（或 which）。It's an app that helps you learn grammar. ✓",
          subSkill: "that_usage"
        },
        {
          type: "choice",
          instruction: "选择正确的答案 (PET 风格)",
          sentence: "The musician ___ played the violin was only ten years old.",
          options: ["which", "who", "where", "whose"],
          correct: 1,
          explanation: "the musician 是人，用 who。The musician who played the violin... ✓",
          subSkill: "who_people"
        }
      ]
    },

    mission: {
      title: "Guess Who",
      taskDescription: "描述3个人，但不要说出他们的名字！用定语从句（who, which, where, whose）给出线索，让别人来猜你描述的是谁。",
      icon: "🕵️",
      scaffolds: [
        {
          prefix: "Person 1 is someone who ",
          suffix: ".",
          hint: "用 who 描述第一个人做的事 (指人用 who)",
          grammarCheck: "relative",
          example: "always tells funny jokes and makes everyone laugh"
        },
        {
          prefix: "This is the person whose ",
          suffix: ".",
          hint: "用 whose 描述这个人的某样东西 (whose 表所属)",
          grammarCheck: "relative",
          example: "backpack is covered in superhero stickers"
        },
        {
          prefix: "Person 2 is the one who ",
          suffix: ".",
          hint: "用 who 描述第二个人的特点或爱好",
          grammarCheck: "relative",
          example: "can run faster than anyone in our class"
        },
        {
          prefix: "You often see this person in the place where ",
          suffix: ".",
          hint: "用 where 描述常常见到这个人的地点",
          grammarCheck: "relative",
          example: "we eat lunch every day"
        },
        {
          prefix: "Person 3 is the friend who has a pet which ",
          suffix: ".",
          hint: "用 who 和 which 描述第三个人和他的宠物",
          grammarCheck: "relative",
          example: "loves chasing its own tail"
        }
      ],
      completionMessage: "太棒了！你用定语从句写出了精彩的线索，你是真正的描述高手！"
    },

    badge: {
      name: "描述高手",
      icon: "🔗",
      description: "掌握了定语从句"
    }
  }
];
