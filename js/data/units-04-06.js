// Grammar Quest - Unit Data Bank (Units 4-6)
// Aligned with Cambridge Think 2 / PET (B1)

export const unitsBatch = [
  // ==================== UNIT 4 ====================
  {
    id: 4,
    title: "Comparatives & Superlatives",
    description: "比较级 & 最高级",
    icon: "📊",

    discover: {
      storyTitle: "The Big Sports Day Showdown",
      story: "Sports Day was the most exciting day of the year! Tom is taller than me, so everyone thought he was the fastest runner in our class. But guess what? I am quicker than Tom over short distances! The long jump was harder than the running race, and my friend Lily was the best of all — she jumped the furthest. Maths is more interesting to me than sport, but today sport felt better than anything. The cake at the end was the most delicious cake ever, and it was even bigger than my head!",
      highlightWords: ["the most exciting", "taller than", "the fastest", "quicker than", "harder than", "the best", "the furthest", "more interesting", "better than", "the most delicious", "bigger than"],
      questions: [
        {
          question: "Look at 'taller than me' and 'the fastest runner'. Why does one use 'than' and the other use 'the'?",
          options: [
            "'taller than' compares two things; 'the fastest' picks the number one out of a group",
            "'than' and 'the fastest' mean exactly the same thing",
            "'taller' is past tense and 'fastest' is present tense"
          ],
          correct: 0,
          explanation: "比较级（taller than）用来比较两个人或事物，常和 than 连用；最高级（the fastest）表示一个群体中“最……”的那一个，前面要加 the。",
          subSkill: "than_usage"
        },
        {
          question: "Why does the story say 'more interesting' but 'taller', not 'interestinger' or 'more tall'?",
          options: [
            "Because 'interesting' sounds nicer with 'more'",
            "Short adjectives add -er (taller); long adjectives use 'more' (more interesting)",
            "There is no rule — you can choose any form you like"
          ],
          correct: 1,
          explanation: "短的形容词（一、两个音节）直接加 -er：tall → taller。长的形容词（三个或以上音节）前面加 more：interesting → more interesting。不能说 interestinger 或 more tall。",
          subSkill: "long_adj_more_most"
        },
        {
          question: "Look at 'the best of all' and 'better than anything'. What is special about 'good'?",
          options: [
            "'good' becomes 'gooder' and 'goodest'",
            "'good' is irregular: good → better → best",
            "'good' never changes its form"
          ],
          correct: 1,
          explanation: "good 是不规则形容词，它的比较级是 better，最高级是 best，不能加 -er 或 -est。同样 bad → worse → worst，far → further → furthest。",
          subSkill: "irregular_comparison"
        }
      ],
      grammarTip: "语法小贴士：短形容词加 -er/-est（tall→taller→tallest）；长形容词用 more/most（more/most interesting）；good→better→best，bad→worse→worst 要背熟！"
    },

    practice: {
      1: [
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "My bag is ___ than yours.",
          options: ["heavy", "heavier", "heaviest", "more heavy"],
          correct: 1,
          explanation: "heavy 是短形容词，比较级把 y 变成 i 再加 -er → heavier。后面有 than，说明是比较级。",
          subSkill: "short_adj_er_est"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "This is the ___ video game in the whole shop.",
          options: ["expensive", "more expensive", "most expensive", "expensiver"],
          correct: 2,
          explanation: "前面有 the，后面有 in the whole shop（在某个范围内），是最高级。expensive 是长形容词，最高级用 the most expensive。",
          subSkill: "long_adj_more_most"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "Maths is ___ than science for me.",
          options: ["difficult", "difficulter", "more difficult", "most difficult"],
          correct: 2,
          explanation: "difficult 是长形容词（三个音节），比较级前面加 more → more difficult。后面有 than 说明是比较级。",
          subSkill: "long_adj_more_most"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "Lucy sings ___ than her brother. She has a beautiful voice.",
          options: ["good", "better", "best", "more good"],
          correct: 1,
          explanation: "good 是不规则形容词，比较级是 better（不是 gooder 或 more good）。后面有 than，用比较级 better。",
          subSkill: "irregular_comparison"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "Today the weather is ___ than yesterday. It's raining all day!",
          options: ["bad", "badder", "worse", "worst"],
          correct: 2,
          explanation: "bad 是不规则形容词，比较级是 worse（不是 badder）。后面有 than，用比较级。",
          subSkill: "irregular_comparison"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "My cat is ___ the small white dog. They are the same size.",
          options: ["as big as", "bigger than", "the biggest", "more big than"],
          correct: 0,
          explanation: "“一样大”用 as + 形容词 + as 结构 → as big as。表示两者相同，不是比较谁更大。",
          subSkill: "as_as"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "Mount Everest is the ___ mountain in the world.",
          options: ["high", "higher", "highest", "more high"],
          correct: 2,
          explanation: "前面有 the，后面有 in the world，是最高级。high 是短形容词，最高级加 -est → the highest。",
          subSkill: "short_adj_er_est"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "This phone is ___ than my old one. I love it!",
          options: ["the better", "more good", "better", "best"],
          correct: 2,
          explanation: "good 的比较级是 better。有 than 用比较级，比较级前面不加 the，所以选 better。",
          subSkill: "irregular_comparison"
        }
      ],
      2: [
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "A cheetah runs ___ than a horse.",
          options: ["fast", "faster", "fastest", "more fast"],
          correct: 1,
          explanation: "fast 是短形容词，比较级加 -er → faster。后面有 than，用比较级。",
          subSkill: "short_adj_er_est"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "Of all my friends, Sam is the ___ at football.",
          options: ["good", "better", "best", "most good"],
          correct: 2,
          explanation: "Of all my friends 表示在一个群体中“最……”，用最高级。good 的最高级是 best → the best。",
          subSkill: "irregular_comparison"
        },
        {
          type: "match",
          instruction: "把形容词和它的比较级正确配对",
          left: ["good", "bad", "far", "happy"],
          right: ["better", "worse", "further", "happier"],
          correctPairs: [[0, 0], [1, 1], [2, 2], [3, 3]],
          explanation: "good→better，bad→worse，far→further 是不规则变化；happy 以辅音+y 结尾，把 y 变 i 加 -er → happier。",
          subSkill: "irregular_comparison"
        },
        {
          type: "match",
          instruction: "把形容词和它的最高级正确配对",
          left: ["tall", "interesting", "big", "good"],
          right: ["the tallest", "the most interesting", "the biggest", "the best"],
          correctPairs: [[0, 0], [1, 1], [2, 2], [3, 3]],
          explanation: "短形容词加 -est（tallest）；以短元音+辅音结尾要双写辅音（biggest）；长形容词用 the most（most interesting）；good 不规则 → the best。",
          subSkill: "long_adj_more_most"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "My homework was ___ as my sister's, so we both finished at the same time.",
          options: ["as easy", "easier", "as easy as", "the easiest"],
          correct: 2,
          explanation: "“和……一样容易”用 as easy as。题目说两人同时完成，表示难度相同，用 as...as 结构。",
          subSkill: "as_as"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "Pizza is ___ delicious food I have ever eaten!",
          options: ["the more", "the most", "more", "most"],
          correct: 1,
          explanation: "delicious 是长形容词，最高级用 the most delicious。have ever eaten（我吃过的）也是最高级的标志。",
          subSkill: "long_adj_more_most"
        },
        {
          type: "match",
          instruction: "把句子开头和正确的结尾配对",
          left: [
            "An elephant is heavier...",
            "She is the smartest...",
            "This game is as fun...",
            "Winter is colder..."
          ],
          right: [
            "than a mouse.",
            "student in the class.",
            "as that one.",
            "than autumn."
          ],
          correctPairs: [[0, 0], [1, 1], [2, 2], [3, 3]],
          explanation: "比较级配 than（heavier than, colder than）；最高级配 the...in（the smartest...in the class）；as...as 配 as（as fun as）。",
          subSkill: "than_usage"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "My new shoes are ___ comfortable than my old ones.",
          options: ["most", "more", "the most", "as"],
          correct: 1,
          explanation: "comfortable 是长形容词，比较级用 more comfortable。后面有 than，是比较两双鞋。",
          subSkill: "long_adj_more_most"
        }
      ],
      3: [
        {
          type: "fill",
          instruction: "用括号中单词的正确形式填空",
          sentence: "A train is (fast) ___ than a bus.",
          answer: "faster",
          acceptableAnswers: ["faster"],
          explanation: "fast 是短形容词，比较级加 -er → faster。后面有 than，用比较级。",
          subSkill: "short_adj_er_est"
        },
        {
          type: "fill",
          instruction: "用括号中单词的正确形式填空",
          sentence: "This is the (exciting) ___ film of the year.",
          answer: "most exciting",
          acceptableAnswers: ["most exciting", "the most exciting"],
          explanation: "前面有 the，后面有 of the year，是最高级。exciting 是长形容词，用 most exciting。",
          subSkill: "long_adj_more_most"
        },
        {
          type: "fill",
          instruction: "用括号中单词的正确形式填空",
          sentence: "My grades this term are (good) ___ than last term. I'm so happy!",
          answer: "better",
          acceptableAnswers: ["better"],
          explanation: "good 是不规则形容词，比较级是 better。后面有 than，用比较级。",
          subSkill: "irregular_comparison"
        },
        {
          type: "reorder",
          instruction: "把单词排列成正确的句子",
          words: ["is", "the", "tallest", "he", "boy", "in", "class", "the"],
          correct: "He is the tallest boy in the class.",
          explanation: "最高级句型：主语 + is + the + 最高级 + 名词 + in + 范围。He is the tallest boy in the class.",
          subSkill: "short_adj_er_est"
        },
        {
          type: "fill",
          instruction: "用括号中单词的正确形式填空",
          sentence: "Today is (hot) ___ than yesterday. Let's go swimming!",
          answer: "hotter",
          acceptableAnswers: ["hotter"],
          explanation: "hot 以“短元音+辅音”结尾，要双写 t 再加 -er → hotter。后面有 than，用比较级。",
          subSkill: "short_adj_er_est"
        },
        {
          type: "reorder",
          instruction: "把单词排列成正确的句子",
          words: ["English", "more", "is", "than", "interesting", "history"],
          correct: "English is more interesting than history.",
          explanation: "长形容词比较级句型：主语 + is + more + 形容词 + than + 比较对象。English is more interesting than history.",
          subSkill: "long_adj_more_most"
        },
        {
          type: "fill",
          instruction: "用括号中单词的正确形式填空",
          sentence: "My bag is as (light) ___ as a feather.",
          answer: "light",
          acceptableAnswers: ["light"],
          explanation: "as + 形容词原形 + as 表示“和……一样”。在 as...as 中间用形容词原形 light，不变比较级。",
          subSkill: "as_as"
        },
        {
          type: "reorder",
          instruction: "把单词排列成正确的句子",
          words: ["the", "this", "is", "best", "day", "ever"],
          correct: "This is the best day ever.",
          explanation: "good 的最高级是 best，前面加 the。This is the best day ever. （ever 表示“有史以来”）",
          subSkill: "irregular_comparison"
        }
      ],
      4: [
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["She", "is", "more", "taller", "than", "me"],
          errorIndex: 2,
          correction: "(remove)",
          explanation: "tall 已经是短形容词，比较级是 taller，不能再加 more。应该是 She is taller than me. ✓ 不能 more + taller。",
          subSkill: "short_adj_er_est"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["This", "book", "is", "the", "interestingest", "of", "all"],
          errorIndex: 4,
          correction: "most interesting",
          explanation: "interesting 是长形容词，最高级用 the most interesting，不能加 -est。应该是 the most interesting of all. ✓",
          subSkill: "long_adj_more_most"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["My", "test", "score", "is", "gooder", "than", "yours"],
          errorIndex: 4,
          correction: "better",
          explanation: "good 是不规则形容词，比较级是 better，不能说 gooder。My test score is better than yours. ✓",
          subSkill: "irregular_comparison"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["He", "is", "the", "more", "popular", "boy", "in", "school"],
          errorIndex: 3,
          correction: "most",
          explanation: "句中有 the 和 in school，是最高级。popular 是长形容词，最高级用 the most popular，不是 the more。",
          subSkill: "long_adj_more_most"
        },
        {
          type: "choice",
          instruction: "哪个句子是正确的？",
          sentence: "选出语法正确的句子：",
          options: [
            "My dog is more bigger than your cat.",
            "My dog is bigger than your cat.",
            "My dog is the bigger than your cat."
          ],
          correct: 1,
          explanation: "big 是短形容词，双写 g 加 -er → bigger，不加 more，比较级前不加 the。My dog is bigger than your cat. ✓",
          subSkill: "short_adj_er_est"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["This", "phone", "is", "as", "expensive", "than", "that", "one"],
          errorIndex: 5,
          correction: "as",
          explanation: "as...as 结构两边都要用 as，不能用 than。应该是 as expensive as that one. ✓",
          subSkill: "as_as"
        },
        {
          type: "choice",
          instruction: "哪个句子是正确的？",
          sentence: "选出语法正确的句子：",
          options: [
            "She is the worst player in the team.",
            "She is the worse player in the team.",
            "She is the baddest player in the team."
          ],
          correct: 0,
          explanation: "bad 的最高级是 worst（不是 worse 或 baddest）。最高级前加 the。She is the worst player in the team. ✓",
          subSkill: "irregular_comparison"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["Football", "is", "excitinger", "than", "chess"],
          errorIndex: 2,
          correction: "more exciting",
          explanation: "exciting 是长形容词，比较级用 more exciting，不能加 -er。Football is more exciting than chess. ✓",
          subSkill: "long_adj_more_most"
        }
      ],
      5: [
        {
          type: "scenario",
          instruction: "选择最合适的回答",
          context: "Your friend wants to buy a new phone and asks which one is the best choice.",
          dialogue: [
            { speaker: "Friend", text: "There are two phones. Which one should I buy?" }
          ],
          options: [
            "This one is good phone.",
            "This one is cheaper and faster than that one.",
            "This one is the more good than that one."
          ],
          correct: 1,
          explanation: "比较两个手机用比较级 + than。cheap → cheaper，fast → faster。“This one is cheaper and faster than that one.” ✓",
          subSkill: "than_usage"
        },
        {
          type: "scenario",
          instruction: "选择最合适的回答",
          context: "Your cousin asks you to describe the restaurant you visited last night.",
          dialogue: [
            { speaker: "Cousin", text: "How was the pizza place? Was it good?" }
          ],
          options: [
            "It served the most delicious pizza I have ever eaten!",
            "It served the deliciousest pizza.",
            "It served more delicious pizza I have ever eaten."
          ],
          correct: 0,
          explanation: "delicious 是长形容词，最高级是 the most delicious。have ever eaten 也是最高级标志。✓",
          subSkill: "long_adj_more_most"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "Of the three sisters, Anna is ___.",
          options: ["taller", "the tallest", "as tall", "more tall"],
          correct: 1,
          explanation: "“三个人中最……的”用最高级。tall 的最高级是 the tallest。Of the three 是最高级的标志。",
          subSkill: "short_adj_er_est"
        },
        {
          type: "scenario",
          instruction: "选择最合适的回答",
          context: "Your classmate is comparing two cafes for your school project.",
          dialogue: [
            { speaker: "Classmate", text: "Café A and Café B both have nice cakes. Are they the same?" }
          ],
          options: [
            "Café A's cake is as nice as Café B's cake.",
            "Café A's cake is more nicer than Café B.",
            "Café A's cake is the nicest as Café B."
          ],
          correct: 0,
          explanation: "两者“一样好”用 as nice as。表示相同水平时用 as + 原级 + as。✓",
          subSkill: "as_as"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "The blue jacket costs $50 and the red one costs $50. The blue jacket is ___ the red one.",
          options: ["cheaper than", "more expensive than", "as expensive as", "the cheapest"],
          correct: 2,
          explanation: "两件夹克价格相同（都是 $50），用 as expensive as 表示“一样贵”。",
          subSkill: "as_as"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "My grade went from a C to an A. My English is ___ now!",
          options: ["worse", "the worst", "much better", "as good"],
          correct: 2,
          explanation: "成绩从 C 到 A，进步了，所以用 good 的比较级 better。much better 表示“好多了”。",
          subSkill: "irregular_comparison"
        },
        {
          type: "scenario",
          instruction: "选择最合适的回答",
          context: "You are writing a review comparing Burger King and McDonald's for your blog.",
          dialogue: [
            { speaker: "Reader", text: "Which restaurant has the friendliest staff?" }
          ],
          options: [
            "McDonald's has the friendliest staff of all.",
            "McDonald's has more friendlier staff.",
            "McDonald's has the most friendly than all."
          ],
          correct: 0,
          explanation: "friendly 以辅音+y 结尾，最高级把 y 变 i 加 -est → the friendliest。of all 是最高级标志。✓",
          subSkill: "short_adj_er_est"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "Read the review: 'Pizza Palace is good, but Pasta House is ___.'",
          options: ["good", "best", "even better", "the better"],
          correct: 2,
          explanation: "比较两家餐厅，Pasta House 更好，用 good 的比较级 better。even better 表示“更好”，加强语气。",
          subSkill: "than_usage"
        }
      ]
    },

    mission: {
      title: "Restaurant Review",
      taskDescription: "你是一位小小美食评测家！请写一篇短评，比较你去过的两家餐厅（比如汉堡店和披萨店）。用上比较级和最高级，告诉读者哪一家更好、哪一道菜最好吃。",
      icon: "🍔",
      scaffolds: [
        {
          prefix: "Last week I visited two restaurants. The first one was ",
          suffix: ".",
          hint: "介绍第一家餐厅（用一个形容词，如 small, cosy, modern）",
          grammarCheck: "comparatives",
          example: "a small but cosy burger shop near my school"
        },
        {
          prefix: "The pizza at the second restaurant was ",
          suffix: " than the burgers at the first one.",
          hint: "用比较级比较两家的食物（如 tastier, more delicious）",
          grammarCheck: "comparatives",
          example: "much tastier and cheaper"
        },
        {
          prefix: "The first restaurant was ",
          suffix: " than the second one.",
          hint: "用比较级比较两家餐厅的某个方面（如服务、价格、装修）",
          grammarCheck: "comparatives",
          example: "more crowded and noisier"
        },
        {
          prefix: "The best dish of all was ",
          suffix: ".",
          hint: "用最高级说出你最喜欢的一道菜（the best / the most delicious）",
          grammarCheck: "comparatives",
          example: "the chocolate cake, which was the most delicious thing I have ever eaten"
        },
        {
          prefix: "In my opinion, the second restaurant is ",
          suffix: ", so I give it five stars!",
          hint: "用最高级或比较级给出你的总结评价",
          grammarCheck: "comparatives",
          example: "the best restaurant in our town"
        }
      ],
      completionMessage: "太棒了！你完成了一篇专业的美食评测，比较级和最高级用得真地道！"
    },

    badge: {
      name: "评比达人",
      icon: "🏆",
      description: "掌握了比较级和最高级的用法"
    }
  },

  // ==================== UNIT 5 ====================
  {
    id: 5,
    title: "Modal Verbs",
    description: "情态动词",
    icon: "🎯",

    discover: {
      storyTitle: "My Naughty Cat and the Big Match",
      story: "My cat Whiskers can open doors, but he can't catch mice! Today I have football practice, so I must leave home by four o'clock. My coach says we should warm up before every game, and we mustn't be late. \"You could be our best player,\" he told me, \"but you have to train harder.\" After practice it might rain, so I may take my umbrella. Mum says I can stay out until six, but I should call her first. \"Could you feed Whiskers tonight?\" she asked. Of course I can — he is naughty, but I love him!",
      highlightWords: ["can open", "can't catch", "must leave", "should warm up", "mustn't be", "could be", "have to train", "might rain", "may take", "can stay", "should call", "Could you"],
      questions: [
        {
          question: "Look at 'can open doors' and 'can't catch mice'. What does 'can' tell us here?",
          options: [
            "It talks about ability — what someone is or isn't able to do",
            "It talks about the past",
            "It is a way to ask for food"
          ],
          correct: 0,
          explanation: "can / can't 表示能力，说明某人会不会做某事。can open = 会开门；can't catch = 不会抓。情态动词后面用动词原形。",
          subSkill: "ability_can_could"
        },
        {
          question: "Why does the coach say 'we mustn't be late' and 'you have to train harder'?",
          options: [
            "Because they describe things that are possible but not sure",
            "Because they show obligation — rules and things you are required to do",
            "Because they are polite ways to ask a question"
          ],
          correct: 1,
          explanation: "must / mustn't / have to 表示义务或规定。must = 必须；mustn't = 禁止；have to = 不得不。它们告诉我们必须做或不能做的事。",
          subSkill: "obligation_must_haveto"
        },
        {
          question: "Look at 'it might rain' and 'I may take my umbrella'. What do 'might' and 'may' show?",
          options: [
            "That something is certain to happen",
            "That something is forbidden",
            "That something is possible but not certain"
          ],
          correct: 2,
          explanation: "might / may 表示可能性，说明某事也许会发生，但不确定。might rain = 也许会下雨；may take = 也许会带。",
          subSkill: "possibility_might"
        }
      ],
      grammarTip: "语法小贴士：情态动词后面跟动词原形！can=能力，must/have to=必须，should=应该（建议），might/may=可能，could/can=请求许可。"
    },

    practice: {
      1: [
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "My little sister ___ swim very well. She practises every day.",
          options: ["can", "must", "should", "might"],
          correct: 0,
          explanation: "“会游泳”表示能力，用 can。can swim = 会游泳。情态动词后面用动词原形 swim。",
          subSkill: "ability_can_could"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "You ___ wear a helmet when you ride a bike. It's the law.",
          options: ["might", "must", "could", "may"],
          correct: 1,
          explanation: "“必须”戴头盔，因为是法律规定，表示义务，用 must。must wear = 必须戴。",
          subSkill: "obligation_must_haveto"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "You look tired. You ___ go to bed early tonight.",
          options: ["should", "can't", "mustn't", "could"],
          correct: 0,
          explanation: "给别人建议用 should（应该）。You should go to bed early = 你应该早点睡觉。",
          subSkill: "advice_should"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "Take an umbrella. It ___ rain this afternoon.",
          options: ["must", "should", "might", "can't"],
          correct: 2,
          explanation: "“也许会下雨”表示可能性（不确定），用 might。It might rain = 也许会下雨。",
          subSkill: "possibility_might"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "___ I borrow your pen, please?",
          options: ["Must", "Should", "Could", "Might"],
          correct: 2,
          explanation: "礼貌地请求许可用 Could I...? 或 Can I...?。Could I borrow your pen? = 我可以借你的笔吗？",
          subSkill: "permission"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "When I was five, I ___ ride a bike without help.",
          options: ["can", "could", "must", "should"],
          correct: 1,
          explanation: "表示过去的能力用 could（can 的过去式）。When I was five 是过去时间，用 could ride。",
          subSkill: "ability_can_could"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "Students ___ run in the school corridors. It's dangerous.",
          options: ["mustn't", "should", "might", "could"],
          correct: 0,
          explanation: "“禁止”在走廊跑步，用 mustn't（一定不能）。mustn't run = 禁止跑步。",
          subSkill: "obligation_must_haveto"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "You ___ eat so many sweets. They are bad for your teeth.",
          options: ["should", "shouldn't", "can", "could"],
          correct: 1,
          explanation: "建议某人“不应该”做某事用 shouldn't。You shouldn't eat so many sweets = 你不应该吃这么多糖。",
          subSkill: "advice_should"
        }
      ],
      2: [
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "I ___ to wear a uniform at my school. It's a rule.",
          options: ["have", "should", "might", "can"],
          correct: 0,
          explanation: "have to 表示“不得不、必须”（规定）。I have to wear a uniform = 我必须穿校服。have to 后面接动词原形。",
          subSkill: "obligation_must_haveto"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "My phone is dead, so I ___ call you tonight. Maybe tomorrow.",
          options: ["can", "can't", "must", "should"],
          correct: 1,
          explanation: "手机没电了，所以“不能”打电话，表示没有能力做某事，用 can't。",
          subSkill: "ability_can_could"
        },
        {
          type: "match",
          instruction: "把情态动词和它表达的意思配对",
          left: ["can", "must", "should", "might"],
          right: ["ability (能力)", "obligation (必须)", "advice (建议)", "possibility (可能)"],
          correctPairs: [[0, 0], [1, 1], [2, 2], [3, 3]],
          explanation: "can = 能力；must = 必须（义务）；should = 应该（建议）；might = 可能（不确定）。这是情态动词最常见的四种用法。",
          subSkill: "possibility_might"
        },
        {
          type: "match",
          instruction: "把句子开头和正确的结尾配对",
          left: [
            "It's late, so you should...",
            "You mustn't...",
            "Could you...",
            "She can..."
          ],
          right: [
            "go home now.",
            "touch the hot oven.",
            "help me, please?",
            "speak three languages."
          ],
          correctPairs: [[0, 0], [1, 1], [2, 2], [3, 3]],
          explanation: "should go = 建议；mustn't touch = 禁止；Could you...please = 礼貌请求；can speak = 能力。情态动词后都接动词原形。",
          subSkill: "advice_should"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "We ___ hurry. The film starts in five minutes!",
          options: ["might", "must", "could", "may"],
          correct: 1,
          explanation: "电影五分钟后开始，所以“必须”赶快，表示紧急的义务，用 must。We must hurry = 我们必须快点。",
          subSkill: "obligation_must_haveto"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "I'm not sure where Tom is. He ___ be in the library.",
          options: ["must", "should", "might", "can't"],
          correct: 2,
          explanation: "“不确定”Tom 在哪，他“可能”在图书馆，用 might（表示可能性）。He might be = 他可能在。",
          subSkill: "possibility_might"
        },
        {
          type: "match",
          instruction: "把现在的句子和它的过去式配对",
          left: ["I can swim.", "She must leave.", "You can't come.", "We can play."],
          right: ["I could swim.", "She had to leave.", "You couldn't come.", "We could play."],
          correctPairs: [[0, 0], [1, 1], [2, 2], [3, 3]],
          explanation: "can 的过去式是 could；must（义务）的过去式用 had to；can't 的过去式是 couldn't。情态动词没有过去式时常用替代词。",
          subSkill: "ability_can_could"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "___ I leave the table now, Mum? I've finished my dinner.",
          options: ["May", "Must", "Should", "Might"],
          correct: 0,
          explanation: "请求许可（离开餐桌）用 May I...? 或 Can I...? / Could I...?。May I leave...? = 我可以离开吗？",
          subSkill: "permission"
        }
      ],
      3: [
        {
          type: "fill",
          instruction: "用合适的情态动词填空 (can/must/should/might)",
          sentence: "Penguins ___ swim but they can't fly.",
          answer: "can",
          acceptableAnswers: ["can"],
          explanation: "企鹅“会”游泳，表示能力，用 can。后面 can't fly 也是能力的否定。",
          subSkill: "ability_can_could"
        },
        {
          type: "fill",
          instruction: "用 should 或 shouldn't 填空",
          sentence: "You have a test tomorrow. You ___ stay up too late tonight.",
          answer: "shouldn't",
          acceptableAnswers: ["shouldn't", "should not"],
          explanation: "明天有考试，建议“不应该”熬夜太晚，用 shouldn't。给出建议性的劝告。",
          subSkill: "advice_should"
        },
        {
          type: "fill",
          instruction: "用 have to 的正确形式填空",
          sentence: "My brother ___ to wear glasses to read. (use 'have' in correct form)",
          answer: "has",
          acceptableAnswers: ["has"],
          explanation: "My brother = he，第三人称单数，have to 变成 has to。He has to wear glasses = 他必须戴眼镜。",
          subSkill: "obligation_must_haveto"
        },
        {
          type: "reorder",
          instruction: "把单词排列成正确的句子",
          words: ["you", "could", "the", "window", "open", "please"],
          correct: "Could you open the window please?",
          explanation: "礼貌请求句型：Could you + 动词原形 + ... please? Could you open the window please? = 你能开下窗户吗？",
          subSkill: "permission"
        },
        {
          type: "fill",
          instruction: "用 might 或 must 填空",
          sentence: "Look at those dark clouds! It ___ rain very soon.",
          answer: "might",
          acceptableAnswers: ["might", "may"],
          explanation: "看到乌云，“也许”很快下雨，表示可能性（不百分百确定），用 might 或 may。",
          subSkill: "possibility_might"
        },
        {
          type: "reorder",
          instruction: "把单词排列成正确的句子",
          words: ["should", "you", "more", "drink", "water"],
          correct: "You should drink more water.",
          explanation: "建议句型：You should + 动词原形 + ... You should drink more water = 你应该多喝水。",
          subSkill: "advice_should"
        },
        {
          type: "fill",
          instruction: "用 can 或 could 填空",
          sentence: "Two years ago I couldn't speak English, but now I ___ understand a lot.",
          answer: "can",
          acceptableAnswers: ["can"],
          explanation: "“现在”能听懂很多，用 can（现在的能力）。前面 couldn't 是过去的能力否定。",
          subSkill: "ability_can_could"
        },
        {
          type: "reorder",
          instruction: "把单词排列成正确的句子",
          words: ["mustn't", "we", "noise", "make", "in", "the", "library"],
          correct: "We mustn't make noise in the library.",
          explanation: "表示禁止：主语 + mustn't + 动词原形 + ... We mustn't make noise = 我们不能制造噪音。",
          subSkill: "obligation_must_haveto"
        }
      ],
      4: [
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["She", "can", "to", "play", "the", "piano"],
          errorIndex: 2,
          correction: "(remove)",
          explanation: "情态动词 can 后面直接接动词原形，不加 to。应该是 She can play the piano. ✓",
          subSkill: "ability_can_could"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["You", "should", "to", "see", "a", "doctor"],
          errorIndex: 2,
          correction: "(remove)",
          explanation: "should 后面直接接动词原形，不加 to。应该是 You should see a doctor. ✓",
          subSkill: "advice_should"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["He", "musts", "finish", "his", "homework", "first"],
          errorIndex: 1,
          correction: "must",
          explanation: "情态动词 must 不随主语变化，第三人称也不加 -s。应该是 He must finish... ✓",
          subSkill: "obligation_must_haveto"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["Can", "you", "helping", "me", "with", "this"],
          errorIndex: 2,
          correction: "help",
          explanation: "情态动词 can 后面接动词原形，不用 -ing 形式。应该是 Can you help me with this? ✓",
          subSkill: "permission"
        },
        {
          type: "choice",
          instruction: "哪个句子是正确的？",
          sentence: "选出语法正确的句子：",
          options: [
            "You don't must run in the corridor.",
            "You mustn't run in the corridor.",
            "You mustn't to run in the corridor."
          ],
          correct: 1,
          explanation: "must 的否定是 mustn't（不用 don't），后面接动词原形（不加 to）。You mustn't run. ✓",
          subSkill: "obligation_must_haveto"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["It", "mights", "snow", "tomorrow", "morning"],
          errorIndex: 1,
          correction: "might",
          explanation: "might 是情态动词，不加 -s。应该是 It might snow tomorrow morning. ✓",
          subSkill: "possibility_might"
        },
        {
          type: "choice",
          instruction: "哪个句子是正确的？",
          sentence: "选出语法正确的句子：",
          options: [
            "When I was young, I can climb trees.",
            "When I was young, I could climb trees.",
            "When I was young, I could to climb trees."
          ],
          correct: 1,
          explanation: "过去的能力用 could（can 的过去式），后面接动词原形（不加 to）。I could climb trees. ✓",
          subSkill: "ability_can_could"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["Do", "I", "have", "wear", "a", "tie"],
          errorIndex: 3,
          correction: "to wear",
          explanation: "have to 中间不能省略 to。疑问句是 Do I have to wear a tie? ✓",
          subSkill: "obligation_must_haveto"
        }
      ],
      5: [
        {
          type: "scenario",
          instruction: "选择最合适的回答",
          context: "Your friend's cat keeps scratching the sofa and won't stop. Your friend asks you for advice.",
          dialogue: [
            { speaker: "Friend", text: "My cat scratches the sofa every day! What should I do?" }
          ],
          options: [
            "You must buy a new sofa right now.",
            "You should buy a scratching post for your cat.",
            "You can't have a cat."
          ],
          correct: 1,
          explanation: "给建议用 should。买一个猫抓板是个好建议。You should buy a scratching post. ✓",
          subSkill: "advice_should"
        },
        {
          type: "scenario",
          instruction: "选择最合适的回答",
          context: "You are at a friend's house and you want to use the bathroom.",
          dialogue: [
            { speaker: "You", text: "..." }
          ],
          options: [
            "Could I use your bathroom, please?",
            "I must use your bathroom.",
            "You should use your bathroom."
          ],
          correct: 0,
          explanation: "礼貌请求许可用 Could I...please?。Could I use your bathroom, please? = 我可以用下洗手间吗？✓",
          subSkill: "permission"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "Your friend has a headache. What is the best advice?",
          options: [
            "You must take ten pills now.",
            "You should rest and drink some water.",
            "You can't have a headache."
          ],
          correct: 1,
          explanation: "给生病的朋友建议，用 should。You should rest and drink water = 你应该休息、喝水。这是最合理的建议。",
          subSkill: "advice_should"
        },
        {
          type: "scenario",
          instruction: "选择最合适的回答",
          context: "Your little brother wants to know if you are free to play after dinner. You are not sure.",
          dialogue: [
            { speaker: "Brother", text: "Will you play video games with me tonight?" }
          ],
          options: [
            "I must play with you.",
            "I might play with you if I finish my homework.",
            "I can't ever play with you."
          ],
          correct: 1,
          explanation: "你不确定，所以用 might 表示可能性。I might play with you if... = 如果我写完作业，也许会和你玩。✓",
          subSkill: "possibility_might"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "Sign at the swimming pool: 'You ___ run near the pool. It's slippery and dangerous.'",
          options: ["should", "mustn't", "might", "could"],
          correct: 1,
          explanation: "游泳池边湿滑危险，禁止跑步，用 mustn't（一定不能）。这是安全规定。",
          subSkill: "obligation_must_haveto"
        },
        {
          type: "scenario",
          instruction: "选择最合适的回答",
          context: "Your friend is worried because his dog barks all night and the neighbours are angry.",
          dialogue: [
            { speaker: "Friend", text: "My dog barks all night! The neighbours are angry. Help!" }
          ],
          options: [
            "You should take your dog to a training class.",
            "You must give your dog away today.",
            "You mustn't have a dog at all."
          ],
          correct: 0,
          explanation: "给出温和、有帮助的建议用 should。You should take your dog to a training class = 你应该带狗去上训练课。✓",
          subSkill: "advice_should"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "Library rule: 'Visitors ___ eat or drink in the reading room.'",
          options: ["should", "can", "mustn't", "might"],
          correct: 2,
          explanation: "图书馆规定不许在阅览室吃喝，用 mustn't（禁止）。这是一条明确的规则。",
          subSkill: "obligation_must_haveto"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "Your teacher asks: 'Who ___ answer this difficult question?' You know the answer!",
          options: ["must", "can", "should", "mustn't"],
          correct: 1,
          explanation: "老师问谁“能”回答，表示能力，用 can。你会，所以你 can answer。",
          subSkill: "ability_can_could"
        }
      ]
    },

    mission: {
      title: "Advice Column",
      taskDescription: "你是学校报纸“建议信箱”的小专栏作家！你的朋友写信说他的猫太调皮了，到处搞破坏。请用情态动词（should/shouldn't、must、can、might）给他写一封建议信，帮他解决问题。",
      icon: "💌",
      scaffolds: [
        {
          prefix: "Dear friend, I'm sorry your cat is so naughty. First, you ",
          suffix: ".",
          hint: "用 should 给出第一个建议",
          grammarCheck: "modals",
          example: "should buy some toys to keep your cat busy"
        },
        {
          prefix: "You ",
          suffix: ", because it makes cats angry.",
          hint: "用 shouldn't 告诉他不要做什么",
          grammarCheck: "modals",
          example: "shouldn't shout at your cat"
        },
        {
          prefix: "If your cat scratches the sofa, you ",
          suffix: ".",
          hint: "用 can 提出一个他能做的办法",
          grammarCheck: "modals",
          example: "can put a scratching post next to it"
        },
        {
          prefix: "Your cat is naughty because it is bored, so you ",
          suffix: " every day.",
          hint: "用 must 强调一件必须做的事",
          grammarCheck: "modals",
          example: "must play with your cat for ten minutes"
        },
        {
          prefix: "If you try these ideas, your cat ",
          suffix: ".",
          hint: "用 might 说出一个可能的好结果",
          grammarCheck: "modals",
          example: "might become much calmer and happier"
        }
      ],
      completionMessage: "太棒了！你写了一封超棒的建议信，情态动词用得又准又自然！"
    },

    badge: {
      name: "建议大师",
      icon: "🧠",
      description: "掌握了情态动词的各种用法"
    }
  },

  // ==================== UNIT 6 ====================
  {
    id: 6,
    title: "Future Forms",
    description: "将来时的各种表达",
    icon: "🚀",

    discover: {
      storyTitle: "Planning the Perfect Summer",
      story: "Summer holidays start next week and I have big plans! I am going to visit my grandparents in the countryside — we already bought the train tickets. On Saturday I am meeting my friends at the cinema; we arranged it yesterday. My dad thinks it will be the hottest summer ever, so I will probably swim a lot. \"Oh, the phone is ringing! I'll get it,\" I shouted. My mum smiled and said, \"Shall I make some lemonade for everyone?\" I'm sure this holiday is going to be amazing, and I think I will remember it forever!",
      highlightWords: ["am going to visit", "am meeting", "will be", "will probably swim", "I'll get it", "Shall I make", "is going to be", "will remember"],
      questions: [
        {
          question: "Look at 'I am going to visit my grandparents' (tickets already bought) and 'I will probably swim a lot'. What's the difference?",
          options: [
            "'going to' is for plans you already decided; 'will' is for predictions or things you think will happen",
            "They mean exactly the same thing",
            "'going to' is past and 'will' is present"
          ],
          correct: 0,
          explanation: "be going to 表示已经计划好、打算做的事（已经买票了）；will 常用来做预测或表示“我觉得会……”。两者都谈将来，但侧重点不同。",
          subSkill: "going_to_plans"
        },
        {
          question: "Why does the writer say 'I am meeting my friends on Saturday' instead of 'I will meet'?",
          options: [
            "Because it is a fixed arrangement with other people (already agreed)",
            "Because meeting friends is happening right now",
            "Because 'will meet' is grammatically wrong"
          ],
          correct: 0,
          explanation: "现在进行时也能表示将来——用于已经和别人约好、安排好的事（we arranged it yesterday）。am meeting = 已经约好周六见面。",
          subSkill: "present_cont_future"
        },
        {
          question: "Look at '\\'I'll get it,\\' I shouted' (phone ringing) and 'Shall I make some lemonade?'. What do these show?",
          options: [
            "Both are talking about the distant future",
            "'I'll get it' is a spontaneous decision; 'Shall I...?' is an offer to help",
            "They are both predictions about the weather"
          ],
          correct: 1,
          explanation: "will 可表示当场临时做的决定（电话响了，我立刻说“我去接”→ I'll get it）；Shall I...? 用来主动提出帮忙或提建议（我来做柠檬水好吗？）。",
          subSkill: "shall_offers"
        }
      ],
      grammarTip: "语法小贴士：will=预测/临时决定（I think.../OK, I'll do it）；be going to=已定的计划；现在进行时=约好的安排；Shall I...?=主动提议帮忙。"
    },

    practice: {
      1: [
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "I think it ___ be sunny tomorrow.",
          options: ["will", "is going", "am", "shall"],
          correct: 0,
          explanation: "“我觉得明天会晴天”是预测，用 will。I think...will... 是预测的常见句型。will be sunny。",
          subSkill: "will_prediction"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "Look at those black clouds! It ___ rain.",
          options: ["will", "is going to", "shall", "are going to"],
          correct: 1,
          explanation: "看到乌云（有现在的证据），表示“看样子要下雨了”，用 be going to。It is going to rain。",
          subSkill: "going_to_plans"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "We ___ visit Disneyland next summer. We've already planned it.",
          options: ["will", "are going to", "shall", "is going to"],
          correct: 1,
          explanation: "“已经计划好”要去迪士尼，表示打算/计划，用 be going to。We are going to visit。",
          subSkill: "going_to_plans"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "The bag is heavy. ___ I help you carry it?",
          options: ["Will", "Shall", "Am", "Going"],
          correct: 1,
          explanation: "主动提出帮忙用 Shall I...?。Shall I help you? = 要我帮你吗？",
          subSkill: "shall_offers"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "A: The phone is ringing! B: Don't worry, I ___ answer it.",
          options: ["am going to", "will", "shall", "am answering"],
          correct: 1,
          explanation: "电话突然响了，当场临时决定去接，用 will（I'll）。临时决定用 will，不用 be going to。",
          subSkill: "will_spontaneous"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "I ___ my dentist at 3 pm tomorrow. The appointment is fixed.",
          options: ["will see", "am seeing", "shall see", "see"],
          correct: 1,
          explanation: "已经约好的安排（固定的预约）用现在进行时表将来。I am seeing my dentist at 3 pm = 我明天三点要看牙医。",
          subSkill: "present_cont_future"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "In the year 2050, people ___ travel to space for holidays.",
          options: ["are going", "will", "shall", "are"],
          correct: 1,
          explanation: "对遥远未来的预测用 will。In 2050, people will travel to space = 2050年人们会去太空旅行。",
          subSkill: "will_prediction"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "She ___ buy a new bike. She has saved enough money.",
          options: ["will", "is going to", "shall", "are going to"],
          correct: 1,
          explanation: "她攒够了钱，打算买新自行车，表示已有的计划/打算，用 be going to。She is going to buy。",
          subSkill: "going_to_plans"
        }
      ],
      2: [
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "Our team is strong. I'm sure we ___ win the match.",
          options: ["are going", "will", "are", "shall"],
          correct: 1,
          explanation: "“我确信我们会赢”是基于信心的预测，用 will。I'm sure...will... 是预测句型。",
          subSkill: "will_prediction"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "A: It's so hot in here. B: ___ I open the window?",
          options: ["Will", "Shall", "Going", "Am"],
          correct: 1,
          explanation: "主动提出帮忙（开窗）用 Shall I...?。Shall I open the window? = 要我开窗吗？",
          subSkill: "shall_offers"
        },
        {
          type: "match",
          instruction: "把句子和它表达的将来意义配对",
          left: [
            "I'm meeting Tom at 6.",
            "I think it will snow.",
            "I'm going to study tonight.",
            "Shall I carry that?"
          ],
          right: [
            "fixed arrangement (已约好)",
            "prediction (预测)",
            "plan/intention (计划)",
            "offer (主动提议)"
          ],
          correctPairs: [[0, 0], [1, 1], [2, 2], [3, 3]],
          explanation: "现在进行时=已约好的安排；will=预测；be going to=计划；Shall I...?=主动提议帮忙。",
          subSkill: "present_cont_future"
        },
        {
          type: "match",
          instruction: "把句子开头和正确的结尾配对",
          left: [
            "We are going to",
            "I'm sure you will",
            "I'm flying to Paris",
            "Shall I"
          ],
          right: [
            "have a party next week.",
            "pass the exam.",
            "on Friday morning.",
            "make you a cup of tea?"
          ],
          correctPairs: [[0, 0], [1, 1], [2, 2], [3, 3]],
          explanation: "be going to + 动词原形=计划；will + 动词原形=预测；现在进行时（am flying）=已订好的安排；Shall I...?=提议。",
          subSkill: "going_to_plans"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "A: I've forgotten my lunch money. B: Don't worry, I ___ lend you some.",
          options: ["am going to", "am lending", "will", "shall"],
          correct: 2,
          explanation: "听到朋友忘带午饭钱，当场决定借钱给他，临时决定用 will。I'll lend you some。",
          subSkill: "will_spontaneous"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "What ___ you ___ do during the holidays? Any plans?",
          options: ["will / going", "are / going to", "shall / going", "are / will"],
          correct: 1,
          explanation: "问别人的计划/打算用 be going to。What are you going to do? = 你打算做什么？",
          subSkill: "going_to_plans"
        },
        {
          type: "match",
          instruction: "把情景和最合适的将来表达配对",
          left: [
            "It's raining and you have no umbrella.",
            "You and friends agreed to meet at 7.",
            "Your bag looks very heavy.",
            "You already decided to learn the guitar."
          ],
          right: [
            "It is going to get wet.",
            "We are meeting at 7.",
            "Shall I help you?",
            "I am going to learn the guitar."
          ],
          correctPairs: [[0, 0], [1, 1], [2, 2], [3, 3]],
          explanation: "有现在证据的推测/计划用 going to；已约好用现在进行时；主动帮忙用 Shall I...?。根据情景选对应表达。",
          subSkill: "going_to_plans"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "We ___ our grandparents this weekend. Mum already booked the tickets.",
          options: ["will visit", "are visiting", "shall visit", "visit"],
          correct: 1,
          explanation: "已经订好票的安排用现在进行时表将来。We are visiting our grandparents this weekend = 我们这周末要去看望祖父母。",
          subSkill: "present_cont_future"
        }
      ],
      3: [
        {
          type: "fill",
          instruction: "用 will 加括号中的动词填空",
          sentence: "I think robots (do) ___ our homework in the future.",
          answer: "will do",
          acceptableAnswers: ["will do"],
          explanation: "对未来的预测用 will + 动词原形。I think...will do... = 我觉得机器人将来会做我们的作业。",
          subSkill: "will_prediction"
        },
        {
          type: "fill",
          instruction: "用 be going to 加括号中的动词填空",
          sentence: "Look out! You (fall) ___ off your bike!",
          answer: "are going to fall",
          acceptableAnswers: ["are going to fall"],
          explanation: "看到当前的证据（快摔了），用 be going to。You are going to fall = 你要摔倒了！",
          subSkill: "going_to_plans"
        },
        {
          type: "fill",
          instruction: "用现在进行时表将来填空",
          sentence: "I (have) ___ a party next Friday. I've already sent the invitations.",
          answer: "am having",
          acceptableAnswers: ["am having"],
          explanation: "已经发出邀请的安排用现在进行时表将来。I am having a party next Friday = 我下周五要办派对。",
          subSkill: "present_cont_future"
        },
        {
          type: "reorder",
          instruction: "把单词排列成正确的句子",
          words: ["I", "carry", "shall", "bags", "your"],
          correct: "Shall I carry your bags?",
          explanation: "主动提议帮忙的句型：Shall I + 动词原形 + ...? Shall I carry your bags? = 要我帮你拿包吗？",
          subSkill: "shall_offers"
        },
        {
          type: "fill",
          instruction: "用 will（'ll）加括号中的动词填空",
          sentence: "A: I'm cold. B: OK, I (close) ___ the door for you.",
          answer: "will close",
          acceptableAnswers: ["will close", "'ll close"],
          explanation: "听到朋友说冷，当场决定关门，临时决定用 will。I'll close the door = 我来关门。",
          subSkill: "will_spontaneous"
        },
        {
          type: "reorder",
          instruction: "把单词排列成正确的句子",
          words: ["going", "we", "are", "to", "the", "beach", "tomorrow"],
          correct: "We are going to the beach tomorrow.",
          explanation: "be going to + 地点表示计划好的活动。We are going to the beach tomorrow = 我们明天打算去海滩。",
          subSkill: "going_to_plans"
        },
        {
          type: "fill",
          instruction: "用 be going to 加括号中的动词填空",
          sentence: "My sister (study) ___ medicine at university. That's her plan.",
          answer: "is going to study",
          acceptableAnswers: ["is going to study"],
          explanation: "“她的计划”用 be going to。My sister is going to study medicine = 我姐姐打算学医。第三人称用 is。",
          subSkill: "going_to_plans"
        },
        {
          type: "reorder",
          instruction: "把单词排列成正确的句子",
          words: ["will", "you", "the", "exam", "pass", "I'm", "sure"],
          correct: "I'm sure you will pass the exam.",
          explanation: "预测句型：I'm sure + 主语 + will + 动词原形。I'm sure you will pass the exam = 我确信你会通过考试。",
          subSkill: "will_prediction"
        }
      ],
      4: [
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["I", "will", "to", "help", "you", "tomorrow"],
          errorIndex: 2,
          correction: "(remove)",
          explanation: "will 后面直接接动词原形，不加 to。应该是 I will help you tomorrow. ✓",
          subSkill: "will_prediction"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["She", "is", "going", "buy", "a", "new", "phone"],
          errorIndex: 3,
          correction: "to buy",
          explanation: "be going to 中间不能漏掉 to。应该是 She is going to buy a new phone. ✓",
          subSkill: "going_to_plans"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["We", "will", "going", "to", "watch", "a", "film"],
          errorIndex: 1,
          correction: "(remove)",
          explanation: "不能 will 和 going to 一起用。要么 We will watch，要么 We are going to watch。这里去掉 will → We are going to watch. ✓",
          subSkill: "going_to_plans"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["Shall", "I", "to", "open", "the", "window"],
          errorIndex: 2,
          correction: "(remove)",
          explanation: "Shall I 后面直接接动词原形，不加 to。应该是 Shall I open the window? ✓",
          subSkill: "shall_offers"
        },
        {
          type: "choice",
          instruction: "哪个句子是正确的？",
          sentence: "选出语法正确的句子：",
          options: [
            "I think it will to rain later.",
            "I think it will rain later.",
            "I think it will raining later."
          ],
          correct: 1,
          explanation: "will + 动词原形（不加 to，不加 -ing）。I think it will rain later. ✓",
          subSkill: "will_prediction"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["They", "are", "going", "to", "playing", "tennis", "later"],
          errorIndex: 4,
          correction: "play",
          explanation: "be going to 后面接动词原形，不用 -ing。应该是 They are going to play tennis later. ✓",
          subSkill: "going_to_plans"
        },
        {
          type: "choice",
          instruction: "哪个句子是正确的？",
          sentence: "选出语法正确的句子：",
          options: [
            "I am meeting my friends tomorrow afternoon.",
            "I am meet my friends tomorrow afternoon.",
            "I will meeting my friends tomorrow afternoon."
          ],
          correct: 0,
          explanation: "现在进行时表将来（已约好的安排）：am/is/are + 动词-ing。I am meeting my friends tomorrow. ✓",
          subSkill: "present_cont_future"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["Will", "I", "carry", "your", "bag", "for", "you"],
          errorIndex: 0,
          correction: "Shall",
          explanation: "主动提议帮忙用 Shall I...?，不用 Will I...?。Shall I carry your bag for you? ✓",
          subSkill: "shall_offers"
        }
      ],
      5: [
        {
          type: "scenario",
          instruction: "选择最合适的回答",
          context: "You and your family are planning your summer holiday. Your mum asks about your plans.",
          dialogue: [
            { speaker: "Mum", text: "What are your plans for the summer holiday?" }
          ],
          options: [
            "I am going to learn how to surf at the beach.",
            "I learn how to surf at the beach.",
            "I will going to learn how to surf."
          ],
          correct: 0,
          explanation: "谈已经计划好的暑假打算用 be going to。I am going to learn how to surf = 我打算学冲浪。✓",
          subSkill: "going_to_plans"
        },
        {
          type: "scenario",
          instruction: "选择最合适的回答",
          context: "Your friend is carrying a lot of heavy books and looks tired.",
          dialogue: [
            { speaker: "Friend", text: "Ugh, these books are so heavy!" }
          ],
          options: [
            "You are going to carry them.",
            "Shall I help you carry some of them?",
            "I am carrying them tomorrow."
          ],
          correct: 1,
          explanation: "看到朋友很累，主动提出帮忙用 Shall I...?。Shall I help you carry some? = 要我帮你拿一些吗？✓",
          subSkill: "shall_offers"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "Weather forecaster on TV: 'Tomorrow ___ be cold and windy in the north.'",
          options: ["is", "will", "is going", "shall"],
          correct: 1,
          explanation: "天气预报对未来的预测常用 will。Tomorrow will be cold and windy = 明天会又冷又有风。",
          subSkill: "will_prediction"
        },
        {
          type: "scenario",
          instruction: "选择最合适的回答",
          context: "You're planning your dream holiday and your friend asks where you'll stay.",
          dialogue: [
            { speaker: "Friend", text: "Where are you staying on your dream holiday?" }
          ],
          options: [
            "I am staying in a hotel right next to the beach. It's all booked!",
            "I will stay in a hotel right now.",
            "I stay in a hotel next to the beach yesterday."
          ],
          correct: 0,
          explanation: "已经订好的住宿安排用现在进行时表将来。I am staying in a hotel...It's all booked = 我要住海边的酒店，已经订好了。✓",
          subSkill: "present_cont_future"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "A: There's no milk left in the fridge. B: Oh, ___ buy some on my way home.",
          options: ["I'm going to", "I am buying", "I'll", "I shall"],
          correct: 2,
          explanation: "刚发现没牛奶了，当场决定去买，临时决定用 will（I'll）。这是脱口而出的决定。",
          subSkill: "will_spontaneous"
        },
        {
          type: "scenario",
          instruction: "选择最合适的回答",
          context: "Your cousin asks what you predict the future will be like in 100 years.",
          dialogue: [
            { speaker: "Cousin", text: "What do you think life will be like in 100 years?" }
          ],
          options: [
            "I think cars will fly and robots will do all the work.",
            "I think cars flew and robots did all the work.",
            "I think cars are flying and robots do all the work."
          ],
          correct: 0,
          explanation: "对遥远未来的预测用 will + 动词原形。I think cars will fly and robots will do... = 我觉得汽车会飞，机器人会干所有活。✓",
          subSkill: "will_prediction"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "You have already decided and booked everything for your trip. You say: '___ explore the old castle on day two.'",
          options: ["I will maybe", "We are going to", "Shall we", "We explore"],
          correct: 1,
          explanation: "已经定好的行程计划用 be going to。We are going to explore the old castle = 我们打算去探索古堡。",
          subSkill: "going_to_plans"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "Your friend looks lost with a big suitcase at the station. You offer: '___ show you the way?'",
          options: ["Will I", "Shall I", "Am I going to", "Do I"],
          correct: 1,
          explanation: "主动提出帮忙用 Shall I...?。Shall I show you the way? = 要我给你带路吗？这是礼貌的提议。",
          subSkill: "shall_offers"
        }
      ]
    },

    mission: {
      title: "Dream Holiday Plan",
      taskDescription: "假期就要来啦！请写一段短文，描述你的梦想假期。用上各种将来时表达：be going to（计划）、will（预测）、现在进行时（已约好的安排）、Shall I/we...?（提议），让你的计划听起来既具体又精彩！",
      icon: "🏖️",
      scaffolds: [
        {
          prefix: "For my dream holiday, I am going to ",
          suffix: ".",
          hint: "用 be going to 说出你假期的主要计划",
          grammarCheck: "future_simple",
          example: "travel to Japan with my family"
        },
        {
          prefix: "We are flying there on ",
          suffix: ", and the tickets are already booked.",
          hint: "用现在进行时（已订好的安排）写出发的日子",
          grammarCheck: "future_simple",
          example: "the first day of the holiday"
        },
        {
          prefix: "I think the weather will ",
          suffix: ".",
          hint: "用 will 做一个关于天气的预测",
          grammarCheck: "future_simple",
          example: "be warm and sunny every day"
        },
        {
          prefix: "On the second day, we are going to ",
          suffix: ".",
          hint: "再用 be going to 写一个具体的活动计划",
          grammarCheck: "future_simple",
          example: "visit a famous temple and eat lots of noodles"
        },
        {
          prefix: "I'm sure this holiday will ",
          suffix: ", and I will never forget it!",
          hint: "用 will 给出你对这次假期的预测或感想",
          grammarCheck: "future_simple",
          example: "be the best holiday of my life"
        }
      ],
      completionMessage: "太棒了！你规划了一个梦想假期，将来时的各种用法都掌握得很好！"
    },

    badge: {
      name: "未来规划师",
      icon: "🗺️",
      description: "掌握了 will、be going to 等将来时表达"
    }
  }
];
