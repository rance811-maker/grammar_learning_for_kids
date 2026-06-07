// Grammar Quest - Unit Data Bank (Units 1-3)
// Aligned with Cambridge Think 2 / PET (B1)

export const unitsBatch = [
  // ==================== UNIT 1 ====================
  {
    id: 1,
    title: "Present Simple & Continuous",
    description: "一般现在时 & 现在进行时",
    icon: "🕐",

    discover: {
      storyTitle: "A Crazy Morning at Home",
      story: "It is 7:30 on a Monday morning. Mum usually makes breakfast at 7 o'clock, but today she is talking on the phone. Dad always drives to work, but right now he is looking for his car keys. My sister loves music — she listens to pop songs every morning. At this moment, she is singing loudly in the bathroom! I normally walk to school with my best friend, but today I am running because I am late. Our cat, Mimi, sleeps on the sofa every day, but look — she is chasing a butterfly in the garden! Mornings at my house are never boring.",
      highlightWords: ["usually makes", "is talking", "always drives", "is looking", "listens", "is singing", "normally walk", "am running", "sleeps", "is chasing"],
      questions: [
        {
          question: "Look at 'Mum usually makes breakfast' and 'today she is talking on the phone'. Why does the author use different verb forms?",
          options: [
            "'makes' is for habits/routines; 'is talking' is for what's happening right now",
            "'makes' is past tense; 'is talking' is future tense",
            "There is no difference — both mean the same thing"
          ],
          correct: 0,
          explanation: "一般现在时（makes）用来描述习惯性的、经常做的事；现在进行时（is talking）用来描述此刻正在发生的事。注意时间标志词：usually = 习惯 → 一般现在时；today/right now = 现在 → 现在进行时。"
        },
        {
          question: "Why does the story say 'she listens' with an -s, but 'I normally walk' without -s?",
          options: [
            "Because 'listens' is a longer word",
            "Because 'she' is third person singular and needs -s; 'I' does not",
            "Because listening is harder than walking"
          ],
          correct: 1,
          explanation: "一般现在时中，第三人称单数（he/she/it）动词要加 -s 或 -es。其他人称（I/you/we/they）用动词原形。She listens ✓ / I walk ✓"
        },
        {
          question: "Which time markers tell you to use present continuous?",
          options: [
            "every day, always, usually",
            "right now, at this moment, today, look",
            "yesterday, last week, ago"
          ],
          correct: 1,
          explanation: "现在进行时的时间标志词包括：right now（现在）、at this moment（此刻）、today（今天，强调与平时不同）、look/listen（看/听，提醒注意正在发生的事）。"
        }
      ],
      grammarTip: "语法小贴士：一般现在时 = 习惯/事实（every day, always）；现在进行时 = 正在做（now, at the moment）。第三人称单数记得加 -s！"
    },

    practice: {
      1: [
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "She ___ to school every day.",
          options: ["go", "goes", "going", "is go"],
          correct: 1,
          explanation: "她每天上学 → every day 表示习惯，用一般现在时。主语 she 是第三人称单数，动词加 -es → goes。",
          subSkill: "third_person_s"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "Look! The children ___ in the park.",
          options: ["play", "plays", "are playing", "is playing"],
          correct: 2,
          explanation: "Look! 表示'看！'，提醒你注意正在发生的事 → 用现在进行时。The children 是复数 → are playing。",
          subSkill: "time_markers"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "My brother always ___ his homework after dinner.",
          options: ["do", "does", "is doing", "doing"],
          correct: 1,
          explanation: "always 表示'总是'，描述习惯 → 一般现在时。My brother = he，第三人称单数 → does。",
          subSkill: "third_person_s"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "I ___ this book is very interesting.",
          options: ["think", "am thinking", "thinks", "thinking"],
          correct: 0,
          explanation: "think 表示'认为'时是状态动词，不用进行时。I think = 我认为 ✓（不说 I am thinking 表达观点时）。",
          subSkill: "state_verbs"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "Right now, Tom ___ a video on his phone.",
          options: ["watches", "watch", "is watching", "are watching"],
          correct: 2,
          explanation: "Right now 表示'现在'→ 用现在进行时。Tom = he，单数 → is watching。",
          subSkill: "time_markers"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "Water ___ at 100 degrees Celsius.",
          options: ["boil", "boils", "is boiling", "are boiling"],
          correct: 1,
          explanation: "水在100度沸腾 → 这是科学事实，永远成立 → 用一般现在时。Water = it → boils。",
          subSkill: "third_person_s"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "She ___ like pizza. She prefers noodles.",
          options: ["don't", "doesn't", "isn't", "aren't"],
          correct: 1,
          explanation: "一般现在时的否定句：第三人称单数用 doesn't + 动词原形。She doesn't like... ✓",
          subSkill: "negative_forms"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "___ you usually get up early on weekdays?",
          options: ["Are", "Do", "Does", "Is"],
          correct: 1,
          explanation: "一般现在时疑问句：主语 you 用 Do 开头。Do you usually...? ✓",
          subSkill: "question_forms"
        }
      ],

      2: [
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "My dad ___ the newspaper every morning, but today he ___ TV.",
          options: [
            "reads / watches",
            "reads / is watching",
            "is reading / watches",
            "read / is watching"
          ],
          correct: 1,
          explanation: "every morning → 习惯 → reads（一般现在时）；today → 今天特殊情况 → is watching（现在进行时）。",
          subSkill: "time_markers"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "I ___ chocolate ice cream. It's my favourite!",
          options: ["love", "am loving", "loves", "loving"],
          correct: 0,
          explanation: "love 是状态动词，表示喜好，通常不用进行时。I love... ✓",
          subSkill: "state_verbs"
        },
        {
          type: "match",
          instruction: "把左右两边正确配对",
          left: [
            "She always...",
            "Listen! Someone...",
            "We usually...",
            "At the moment, they..."
          ],
          right: [
            "walks to school.",
            "is knocking on the door.",
            "have lunch at 12 o'clock.",
            "are playing basketball."
          ],
          correctPairs: [[0, 0], [1, 1], [2, 2], [3, 3]],
          explanation: "always/usually → 习惯 → 一般现在时；Listen!/At the moment → 正在发生 → 现在进行时。",
          subSkill: "time_markers"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "The Earth ___ around the Sun.",
          options: ["is going", "goes", "go", "are going"],
          correct: 1,
          explanation: "地球绕着太阳转 → 客观事实/自然规律 → 用一般现在时。The Earth = it → goes。",
          subSkill: "third_person_s"
        },
        {
          type: "match",
          instruction: "把时间标志词和对应的时态配对",
          left: ["every day", "right now", "at the moment", "usually"],
          right: [
            "Present Simple<br><small style='opacity:.65'>一般现在时</small>",
            "Present Continuous<br><small style='opacity:.65'>现在进行时</small>",
            "Present Continuous<br><small style='opacity:.65'>现在进行时</small>",
            "Present Simple<br><small style='opacity:.65'>一般现在时</small>"
          ],
          correctPairs: [[0, 0], [1, 1], [2, 2], [3, 3]],
          explanation: "every day/usually → 一般现在时（习惯）；right now/at the moment → 现在进行时（正在进行）。",
          subSkill: "time_markers"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "Why ___ you wearing a coat? It's so hot today!",
          options: ["do", "does", "are", "is"],
          correct: 2,
          explanation: "询问'你为什么正穿着外套'→ 现在进行时疑问句 → Are you wearing...?",
          subSkill: "question_forms"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "This soup ___ delicious! Can I have more?",
          options: ["tastes", "is tasting", "taste", "tasting"],
          correct: 0,
          explanation: "taste 表示'尝起来'时是状态动词（感官动词），不用进行时 → tastes ✓。",
          subSkill: "state_verbs"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "My cat ___ on my bed right now. She usually ___ on the sofa.",
          options: [
            "sleeps / is sleeping",
            "is sleeping / sleeps",
            "is sleeping / is sleeping",
            "sleeps / sleeps"
          ],
          correct: 1,
          explanation: "right now → 正在 → is sleeping；usually → 习惯 → sleeps。注意两个时态的对比！",
          subSkill: "time_markers"
        }
      ],

      3: [
        {
          type: "fill",
          instruction: "用括号中单词的正确形式填空",
          sentence: "She (watch) ___ a cartoon at the moment.",
          answer: "is watching",
          acceptableAnswers: ["is watching"],
          explanation: "at the moment → 现在进行时。She → is watching。",
          subSkill: "time_markers"
        },
        {
          type: "fill",
          instruction: "用括号中单词的正确形式填空",
          sentence: "They (not/eat) ___ meat. They are vegetarians.",
          answer: "don't eat",
          acceptableAnswers: ["don't eat", "do not eat"],
          explanation: "他们是素食者 → 事实/习惯 → 一般现在时否定。They → don't eat。",
          subSkill: "negative_forms"
        },
        {
          type: "reorder",
          instruction: "把单词排列成正确的句子",
          words: ["is", "brother", "playing", "my", "football", "now", "right"],
          correct: "My brother is playing football right now.",
          explanation: "主语 + is/are + 动词-ing + 其他 + 时间状语。My brother is playing football right now.",
          subSkill: "time_markers"
        },
        {
          type: "fill",
          instruction: "用括号中单词的正确形式填空",
          sentence: "He (go) ___ to the gym three times a week.",
          answer: "goes",
          acceptableAnswers: ["goes"],
          explanation: "three times a week → 频率 → 一般现在时。He → goes（第三人称加 -es）。",
          subSkill: "third_person_s"
        },
        {
          type: "reorder",
          instruction: "把单词排列成正确的句子",
          words: ["does", "she", "where", "every", "lunch", "have", "day"],
          correct: "Where does she have lunch every day?",
          explanation: "一般现在时特殊疑问句：疑问词 + does + 主语 + 动词原形？Where does she have lunch every day?",
          subSkill: "question_forms"
        },
        {
          type: "fill",
          instruction: "用括号中单词的正确形式填空",
          sentence: "Listen! The birds (sing) ___ outside the window.",
          answer: "are singing",
          acceptableAnswers: ["are singing"],
          explanation: "Listen! → 正在发生 → 现在进行时。The birds（复数）→ are singing。",
          subSkill: "time_markers"
        },
        {
          type: "reorder",
          instruction: "把单词排列成正确的句子",
          words: ["usually", "I", "bus", "the", "take", "to", "school"],
          correct: "I usually take the bus to school.",
          explanation: "频率副词 usually 放在实义动词前面。I usually take the bus to school.",
          subSkill: "time_markers"
        },
        {
          type: "fill",
          instruction: "用括号中单词的正确形式填空",
          sentence: "Shh! The baby (sleep) ___. Don't make any noise.",
          answer: "is sleeping",
          acceptableAnswers: ["is sleeping"],
          explanation: "Shh! 说明宝宝正在睡觉 → 现在进行时 → is sleeping。",
          subSkill: "time_markers"
        }
      ],

      4: [
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["She", "don't", "like", "coffee", "very", "much"],
          errorIndex: 1,
          correction: "doesn't",
          explanation: "She 是第三人称单数，否定用 doesn't，不是 don't。She doesn't like coffee very much. ✓",
          subSkill: "negative_forms"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["He", "is", "wanting", "a", "new", "bicycle"],
          errorIndex: 2,
          correction: "wants",
          explanation: "want 是状态动词，不用进行时。应该是 He wants a new bicycle. ✓",
          subSkill: "state_verbs"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["Look!", "Tom", "plays", "football", "in", "the", "rain"],
          errorIndex: 2,
          correction: "is playing",
          explanation: "Look! 表示'看！正在发生的事'→ 用现在进行时 → Tom is playing football in the rain. ✓",
          subSkill: "time_markers"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["My", "sister", "studys", "English", "every", "evening"],
          errorIndex: 2,
          correction: "studies",
          explanation: "以辅音字母 + y 结尾的动词，变 y 为 i 再加 -es。study → studies ✓",
          subSkill: "third_person_s"
        },
        {
          type: "choice",
          instruction: "哪个句子是正确的？",
          sentence: "选出语法正确的句子：",
          options: [
            "I am knowing the answer.",
            "I know the answer.",
            "I knowing the answer.",
            "I does know the answer."
          ],
          correct: 1,
          explanation: "know 是状态动词（表示'知道'），不用进行时。I know the answer. ✓",
          subSkill: "state_verbs"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["Do", "she", "speak", "French", "well"],
          errorIndex: 0,
          correction: "Does",
          explanation: "she 是第三人称单数，疑问句用 Does。Does she speak French well? ✓",
          subSkill: "question_forms"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "Be quiet! I ___ to concentrate on my homework.",
          options: ["try", "am trying", "tries", "trying"],
          correct: 1,
          explanation: "Be quiet! 说明此刻需要安静 → 现在进行时。I am trying to concentrate. ✓",
          subSkill: "time_markers"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["They", "are", "have", "lunch", "in", "the", "canteen"],
          errorIndex: 2,
          correction: "having",
          explanation: "现在进行时结构是 are + 动词-ing。They are having lunch. ✓（这里 have 表示'吃'，不是状态动词）",
          subSkill: "time_markers"
        }
      ],

      5: [
        {
          type: "scenario",
          instruction: "选择最合适的回答",
          context: "You call your friend after school. You hear loud music in the background.",
          dialogue: [
            { speaker: "You", text: "Hi! What's going on? It's so noisy!" }
          ],
          options: [
            "My brother plays the drums every day.",
            "My brother is playing the drums right now. Sorry about the noise!",
            "My brother played the drums yesterday."
          ],
          correct: 1,
          explanation: "电话里听到很大的音乐声 → 说明正在发生 → 用现在进行时 is playing。",
          subSkill: "time_markers"
        },
        {
          type: "scenario",
          instruction: "选择最合适的回答",
          context: "A new classmate asks about your daily routine.",
          dialogue: [
            { speaker: "Classmate", text: "What do you usually do after school?" }
          ],
          options: [
            "I am playing basketball and doing homework.",
            "I usually play basketball and then do my homework.",
            "I played basketball yesterday."
          ],
          correct: 1,
          explanation: "问的是 usually（通常），描述日常习惯 → 用一般现在时。",
          subSkill: "time_markers"
        },
        {
          type: "scenario",
          instruction: "选择最合适的回答",
          context: "You are at the zoo with your family. You see something exciting.",
          dialogue: [
            { speaker: "You", text: "Wow! Look at the monkeys! They ___!" }
          ],
          options: [
            "climb the trees",
            "are climbing the trees",
            "climbs the trees"
          ],
          correct: 1,
          explanation: "Look! + 眼前正在发生的事 → 现在进行时 → are climbing。",
          subSkill: "time_markers"
        },
        {
          type: "choice",
          instruction: "选择正确的答案（PET 风格阅读）",
          sentence: "Read the notice: 'The library closes at 5 pm on weekdays. It ___ at 3 pm on Saturdays.'",
          options: ["is closing", "close", "closes", "closing"],
          correct: 2,
          explanation: "图书馆的营业时间是固定安排/时间表 → 一般现在时。It closes at 3 pm. ✓",
          subSkill: "third_person_s"
        },
        {
          type: "scenario",
          instruction: "选择最合适的回答",
          context: "Your teacher asks why you are not paying attention in class.",
          dialogue: [
            { speaker: "Teacher", text: "Why aren't you listening?" }
          ],
          options: [
            "Sorry, I think about my lunch.",
            "Sorry, I am thinking about my lunch.",
            "Sorry, I thinks about my lunch."
          ],
          correct: 1,
          explanation: "老师在问你此刻为什么走神 → 现在进行时。注意：think 表示'正在想某事'时可以用进行时（和表示'认为'不同）。",
          subSkill: "state_verbs"
        },
        {
          type: "fill",
          instruction: "读短文，用正确的时态填空",
          sentence: "My name is Lily. I (go) ___ to Green Park School. This week, we (prepare) ___ for Sports Day.",
          answer: "go, are preparing",
          acceptableAnswers: ["go, are preparing", "go , are preparing"],
          explanation: "I go to... → 事实，一般现在时；This week, we are preparing → 这周正在进行的临时活动 → 现在进行时。",
          subSkill: "time_markers"
        },
        {
          type: "scenario",
          instruction: "选择最合适的描述",
          context: "You are writing a diary entry about your typical school day and what is different today.",
          dialogue: [
            { speaker: "Diary", text: "Complete the entry:" }
          ],
          options: [
            "I walk to school every day. Today I am taking the bus because it is raining.",
            "I am walking to school every day. Today I take the bus because it rains.",
            "I walk to school every day. Today I take the bus because it rains."
          ],
          correct: 0,
          explanation: "every day → 习惯 → walk（一般现在时）；Today → 今天不同 → am taking（现在进行时）；it is raining → 现在正在下雨。",
          subSkill: "time_markers"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "Which sentence is correct for a PET Writing task about 'My Best Friend'?",
          options: [
            "My best friend is call Emma and she is like dancing.",
            "My best friend is called Emma and she likes dancing.",
            "My best friend called Emma and she is liking dancing.",
            "My best friend calling Emma and she like dancing."
          ],
          correct: 1,
          explanation: "is called → 被叫做（被动语态）；likes → 喜好用一般现在时（like 是状态动词不用进行时）。",
          subSkill: "state_verbs"
        }
      ]
    },

    mission: {
      title: "My Daily Life",
      taskDescription: "写一段介绍你日常生活的短文，描述你每天做什么，以及你现在正在做什么。",
      icon: "📝",
      scaffolds: [
        {
          prefix: "Every morning, I ",
          suffix: ".",
          hint: "写一个你每天早上做的事 (用一般现在时)",
          grammarCheck: "present_simple",
          example: "wake up at 7 o'clock"
        },
        {
          prefix: "After school, I usually ",
          suffix: ".",
          hint: "写一个你放学后经常做的事",
          grammarCheck: "present_simple",
          example: "play basketball with my friends"
        },
        {
          prefix: "Right now, I am ",
          suffix: ".",
          hint: "写一个你现在正在做的事 (用现在进行时)",
          grammarCheck: "present_continuous",
          example: "sitting in my room and doing homework"
        },
        {
          prefix: "My best friend ",
          suffix: " every weekend.",
          hint: "描述你好朋友每周末做什么",
          grammarCheck: "present_simple",
          example: "plays video games"
        },
        {
          prefix: "This week, we are ",
          suffix: ".",
          hint: "写这周你们正在做的一件特别的事",
          grammarCheck: "present_continuous",
          example: "preparing for the school concert"
        }
      ],
      completionMessage: "太棒了！你完成了一篇'我的日常生活'短文！"
    },

    badge: {
      name: "日常达人",
      icon: "🌅",
      description: "掌握了一般现在时和现在进行时"
    }
  },

  // ==================== UNIT 2 ====================
  {
    id: 2,
    title: "Past Simple & Past Continuous",
    description: "一般过去时 & 过去进行时",
    icon: "⏪",

    discover: {
      storyTitle: "The Camping Trip Disaster",
      story: "Last weekend, my family went camping in the mountains. We arrived at the campsite at 3 pm and set up our tent. Dad was cooking dinner while Mum was reading a book. I played with my dog near the river. Suddenly, while we were eating, we heard a strange noise! A raccoon was stealing our snacks from the bag! Dad jumped up and shouted, but the raccoon didn't stop. It grabbed a packet of biscuits and ran away. We all laughed so hard! We didn't sleep very well that night because we were worrying about more raccoons.",
      highlightWords: ["went", "arrived", "set up", "was cooking", "was reading", "played", "were eating", "heard", "was stealing", "jumped", "shouted", "didn't stop", "grabbed", "ran", "laughed", "didn't sleep", "were worrying"],
      questions: [
        {
          question: "Look at 'Dad was cooking dinner while Mum was reading a book.' Why is 'was cooking' and 'was reading' used instead of 'cooked' and 'read'?",
          options: [
            "Because they are describing long actions happening at the same time in the past",
            "Because cooking and reading are difficult activities",
            "Because it happened many times"
          ],
          correct: 0,
          explanation: "过去进行时（was/were + -ing）表示过去某个时候正在进行的动作。while 连接两个同时进行的动作：爸爸在做饭的同时，妈妈在看书。"
        },
        {
          question: "In 'while we were eating, we heard a strange noise', why are two different tenses used?",
          options: [
            "To make the story sound more interesting",
            "The longer action (were eating) was interrupted by a short action (heard)",
            "Both actions are the same — no real difference"
          ],
          correct: 1,
          explanation: "过去进行时（were eating）描述正在持续的背景动作，一般过去时（heard）描述突然插入的短动作。'我们正在吃饭时，突然听到一个奇怪的声音'→ 长动作被短动作打断。"
        },
        {
          question: "Which words in the story tell you something happened in the past?",
          options: [
            "always, usually, every day",
            "last weekend, suddenly, that night",
            "tomorrow, next week, soon"
          ],
          correct: 1,
          explanation: "过去时的时间标志词包括：last weekend（上周末）、suddenly（突然）、that night（那晚）、yesterday、ago 等。"
        }
      ],
      grammarTip: "语法小贴士：一般过去时 = 过去完成的动作（went, played）；过去进行时 = 过去正在进行的动作（was playing）。When/While 引导时间，长动作用进行时，短动作用过去时。"
    },

    practice: {
      1: [
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "I ___ a great movie last night.",
          options: ["watch", "watched", "was watching", "am watching"],
          correct: 1,
          explanation: "last night → 过去的具体时间 → 一般过去时 → watched。",
          subSkill: "irregular_verbs"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "She ___ to music when I called her.",
          options: ["listened", "was listening", "listens", "is listening"],
          correct: 1,
          explanation: "when I called → 我打电话时她正在做某事 → 过去进行时 → was listening。",
          subSkill: "when_while"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "They ___ to the beach yesterday.",
          options: ["go", "goes", "went", "were going"],
          correct: 2,
          explanation: "yesterday → 昨天 → 过去完成的动作 → 一般过去时。go 的过去式是 went（不规则动词）。",
          subSkill: "irregular_verbs"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "We ___ dinner at 7 pm last night.",
          options: ["have", "had", "were having", "having"],
          correct: 2,
          explanation: "at 7 pm last night → 昨晚七点那个时刻正在做 → 过去进行时 → were having。",
          subSkill: "was_were"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "He ___ his bike to school every day last year.",
          options: ["rides", "rode", "was riding", "ridden"],
          correct: 1,
          explanation: "every day last year → 去年的习惯 → 一般过去时。ride → rode（不规则）。",
          subSkill: "irregular_verbs"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "I ___ (not) see you at the party. Were you there?",
          options: ["don't", "didn't", "wasn't", "weren't"],
          correct: 1,
          explanation: "一般过去时否定 → didn't + 动词原形 → I didn't see you. ✓",
          subSkill: "negative_past"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "___ you do your homework yesterday?",
          options: ["Do", "Did", "Were", "Was"],
          correct: 1,
          explanation: "一般过去时疑问句 → Did + 主语 + 动词原形。Did you do...? ✓",
          subSkill: "question_past"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "At 9 o'clock last night, I ___ in bed.",
          options: ["sleep", "slept", "was sleeping", "am sleeping"],
          correct: 2,
          explanation: "At 9 o'clock last night → 过去某个具体时刻正在做的事 → 过去进行时 → was sleeping。",
          subSkill: "was_were"
        }
      ],

      2: [
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "While I ___ my teeth, my phone rang.",
          options: ["brush", "brushed", "was brushing", "am brushing"],
          correct: 2,
          explanation: "While + 长动作（过去进行时），短动作用一般过去时。While I was brushing → 正在刷牙时。",
          subSkill: "when_while"
        },
        {
          type: "match",
          instruction: "把左右两边正确配对",
          left: [
            "While she was sleeping,",
            "He ate breakfast and",
            "When the teacher came in,",
            "It was raining, so"
          ],
          right: [
            "the alarm clock rang.",
            "went to school.",
            "the students were talking loudly.",
            "we stayed at home."
          ],
          correctPairs: [[0, 0], [1, 1], [2, 2], [3, 3]],
          explanation: "While + 进行时 + 一般过去时（打断）；连续动作用一般过去时；When + 一般过去时 + 进行时（背景）；过去进行时 + so + 一般过去时（因果）。",
          subSkill: "when_while"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "I ___ breakfast when someone knocked on the door.",
          options: ["have", "had", "was having", "having"],
          correct: 2,
          explanation: "when someone knocked → 有人敲门打断了正在做的事 → was having breakfast。",
          subSkill: "when_while"
        },
        {
          type: "match",
          instruction: "把动词原形和过去式配对",
          left: ["go", "eat", "see", "take"],
          right: ["went", "ate", "saw", "took"],
          correctPairs: [[0, 0], [1, 1], [2, 2], [3, 3]],
          explanation: "这些都是不规则动词：go→went, eat→ate, see→saw, take→took。需要背诵记忆！",
          subSkill: "irregular_verbs"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "The children ___ while the teacher ___ on the board.",
          options: [
            "talked / wrote",
            "were talking / was writing",
            "talked / was writing",
            "were talking / wrote"
          ],
          correct: 1,
          explanation: "两个同时进行的长动作 → 都用过去进行时。While 连接两个并行动作。",
          subSkill: "when_while"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "She ___ born in Beijing in 2013.",
          options: ["is", "was", "were", "did"],
          correct: 1,
          explanation: "in 2013 → 过去 → 一般过去时。She was born... ✓（be born 表示出生）。",
          subSkill: "was_were"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "___ it raining when you left the house?",
          options: ["Is", "Was", "Did", "Does"],
          correct: 1,
          explanation: "过去进行时疑问句 → Was/Were + 主语 + -ing？Was it raining? ✓",
          subSkill: "question_past"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "We ___ (not) go out last Sunday because it was snowing.",
          options: ["don't", "didn't", "weren't", "isn't"],
          correct: 1,
          explanation: "一般过去时否定 → didn't + 动词原形。We didn't go out. ✓",
          subSkill: "negative_past"
        }
      ],

      3: [
        {
          type: "fill",
          instruction: "用括号中单词的正确形式填空",
          sentence: "They (play) ___ football when it started to rain.",
          answer: "were playing",
          acceptableAnswers: ["were playing"],
          explanation: "when it started → 开始下雨打断了正在做的事 → were playing（过去进行时）。",
          subSkill: "when_while"
        },
        {
          type: "fill",
          instruction: "用括号中单词的正确形式填空",
          sentence: "I (see) ___ a famous singer at the shopping mall yesterday.",
          answer: "saw",
          acceptableAnswers: ["saw"],
          explanation: "yesterday → 一般过去时。see → saw（不规则动词）。",
          subSkill: "irregular_verbs"
        },
        {
          type: "reorder",
          instruction: "把单词排列成正确的句子",
          words: ["was", "she", "while", "homework", "her", "doing", "the", "rang", "phone"],
          correct: "While she was doing her homework, the phone rang.",
          explanation: "While + 主语 + was/were + -ing（长动作），主语 + 动词过去式（短动作）。",
          subSkill: "when_while"
        },
        {
          type: "fill",
          instruction: "用括号中单词的正确形式填空",
          sentence: "He (not/go) ___ to the party last Friday.",
          answer: "didn't go",
          acceptableAnswers: ["didn't go", "did not go"],
          explanation: "last Friday → 过去时否定 → didn't + 动词原形 → didn't go。",
          subSkill: "negative_past"
        },
        {
          type: "reorder",
          instruction: "把单词排列成正确的句子",
          words: ["did", "what", "you", "yesterday", "do", "evening"],
          correct: "What did you do yesterday evening?",
          explanation: "一般过去时特殊疑问句：疑问词 + did + 主语 + 动词原形？",
          subSkill: "question_past"
        },
        {
          type: "fill",
          instruction: "用括号中单词的正确形式填空",
          sentence: "At 10 pm last night, we (watch) ___ a scary film.",
          answer: "were watching",
          acceptableAnswers: ["were watching"],
          explanation: "At 10 pm last night → 过去某个具体时刻 → 过去进行时。We → were watching。",
          subSkill: "was_were"
        },
        {
          type: "reorder",
          instruction: "把单词排列成正确的句子",
          words: ["the", "when", "dog", "I", "sleeping", "was", "barked"],
          correct: "The dog barked when I was sleeping.",
          explanation: "短动作 when 长动作：The dog barked（短）when I was sleeping（长）。",
          subSkill: "when_while"
        },
        {
          type: "fill",
          instruction: "用括号中单词的正确形式填空",
          sentence: "She (write) ___ three emails and then (leave) ___ the office.",
          answer: "wrote, left",
          acceptableAnswers: ["wrote, left", "wrote , left"],
          explanation: "两个连续完成的过去动作 → 都用一般过去时。write→wrote, leave→left。",
          subSkill: "irregular_verbs"
        }
      ],

      4: [
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["I", "was", "go", "to", "the", "cinema", "yesterday"],
          errorIndex: 2,
          correction: "went",
          explanation: "yesterday → 一般过去时 → I went to the cinema yesterday. ✓ 不是 was go。",
          subSkill: "irregular_verbs"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["She", "didn't", "went", "to", "school", "last", "Monday"],
          errorIndex: 2,
          correction: "go",
          explanation: "didn't 后面用动词原形！didn't go ✓，不是 didn't went。",
          subSkill: "negative_past"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["While", "I", "walked", "home", "it", "started", "raining"],
          errorIndex: 2,
          correction: "was walking",
          explanation: "While + 长动作 → 过去进行时。While I was walking home, it started raining. ✓",
          subSkill: "when_while"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["They", "was", "playing", "tennis", "at", "5", "pm"],
          errorIndex: 1,
          correction: "were",
          explanation: "They 是复数 → 用 were，不用 was。They were playing tennis. ✓",
          subSkill: "was_were"
        },
        {
          type: "choice",
          instruction: "哪个句子是正确的？",
          sentence: "选出语法正确的句子：",
          options: [
            "When I arrived, everyone was dance.",
            "When I arrived, everyone was dancing.",
            "When I was arriving, everyone danced.",
            "When I arriving, everyone was dancing."
          ],
          correct: 1,
          explanation: "When + 短动作（arrived）→ 一般过去时；长动作（was dancing）→ 过去进行时。",
          subSkill: "when_while"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["Did", "you", "saw", "the", "new", "superhero", "movie"],
          errorIndex: 2,
          correction: "see",
          explanation: "Did 开头的疑问句，动词用原形。Did you see...? ✓ 不是 Did you saw。",
          subSkill: "question_past"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "I ___ a strange sound while I ___ in the forest.",
          options: [
            "heard / walked",
            "was hearing / walked",
            "heard / was walking",
            "was hearing / was walking"
          ],
          correct: 2,
          explanation: "heard → 突然的短动作（一般过去时）；was walking → 持续的长动作（过去进行时）。",
          subSkill: "when_while"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["He", "eated", "three", "sandwiches", "for", "lunch"],
          errorIndex: 1,
          correction: "ate",
          explanation: "eat 是不规则动词，过去式是 ate，不是 eated。He ate three sandwiches. ✓",
          subSkill: "irregular_verbs"
        }
      ],

      5: [
        {
          type: "scenario",
          instruction: "选择最合适的回答",
          context: "Your teacher asks about your holiday last summer.",
          dialogue: [
            { speaker: "Teacher", text: "What did you do last summer?" }
          ],
          options: [
            "I go to Shanghai with my family.",
            "I went to Shanghai with my family.",
            "I was going to Shanghai with my family."
          ],
          correct: 1,
          explanation: "last summer → 过去完成的事 → 一般过去时 → went。",
          subSkill: "irregular_verbs"
        },
        {
          type: "scenario",
          instruction: "选择最合适的描述",
          context: "You are telling a friend about a funny moment yesterday.",
          dialogue: [
            { speaker: "You", text: "Yesterday something funny happened. While I ___, I tripped and fell!" }
          ],
          options: [
            "run in the playground",
            "was running in the playground",
            "ran in the playground"
          ],
          correct: 1,
          explanation: "While + 长动作（was running），突然发生的事（tripped）打断了它。",
          subSkill: "when_while"
        },
        {
          type: "scenario",
          instruction: "选择最合适的回答",
          context: "Your mum asks you about what happened when she was out.",
          dialogue: [
            { speaker: "Mum", text: "What were you doing when I called you at 8 o'clock?" }
          ],
          options: [
            "I do my homework.",
            "I did my homework.",
            "I was doing my homework."
          ],
          correct: 2,
          explanation: "when I called → 妈妈打电话那个时刻你正在做什么 → 过去进行时 → was doing。",
          subSkill: "was_were"
        },
        {
          type: "choice",
          instruction: "阅读短文，选择正确答案",
          sentence: "Emma's diary: 'It ___ a beautiful day. Birds ___ in the trees and the sun ___ brightly. I decided to go for a bike ride.'",
          options: [
            "was / sang / shone",
            "was / were singing / was shining",
            "is / are singing / is shining",
            "was / were singing / shone"
          ],
          correct: 1,
          explanation: "日记描述过去的场景背景 → 过去进行时（birds were singing, sun was shining）；was a beautiful day → 状态。背景描写用进行时让画面更生动。",
          subSkill: "when_while"
        },
        {
          type: "scenario",
          instruction: "选择最合适的回答",
          context: "A police officer is asking you about what you saw.",
          dialogue: [
            { speaker: "Officer", text: "Can you tell me what happened?" }
          ],
          options: [
            "I walk home. A man is running past me and he drops a bag.",
            "I was walking home. A man ran past me and dropped a bag.",
            "I walked home. A man was running past me and he was dropping a bag."
          ],
          correct: 1,
          explanation: "背景/持续动作 → was walking（过去进行时）；突然发生的事件 → ran, dropped（一般过去时）。",
          subSkill: "when_while"
        },
        {
          type: "fill",
          instruction: "用括号中单词的正确形式填空",
          sentence: "When I (open) ___ the door, my cat (sit) ___ on the kitchen table!",
          answer: "opened, was sitting",
          acceptableAnswers: ["opened, was sitting", "opened , was sitting"],
          explanation: "When I opened（短动作） → 一般过去时；was sitting（场景）→ 过去进行时。开门的那一刻，猫正坐在桌上！",
          subSkill: "when_while"
        },
        {
          type: "scenario",
          instruction: "选择最合适的描述",
          context: "You are writing an adventure story for English class.",
          dialogue: [
            { speaker: "Story", text: "It was midnight. The wind ___ and the trees ___ scary shadows on the wall." }
          ],
          options: [
            "blew / made",
            "was blowing / were making",
            "blows / makes"
          ],
          correct: 1,
          explanation: "故事中的背景描写 → 过去进行时让场景更生动。The wind was blowing... the trees were making...",
          subSkill: "was_were"
        },
        {
          type: "choice",
          instruction: "选择正确的答案（PET 风格）",
          sentence: "Last Saturday, I ___ shopping. While I ___ for the bus, I met my old friend Tom.",
          options: [
            "go / wait",
            "went / was waiting",
            "was going / waited",
            "went / waited"
          ],
          correct: 1,
          explanation: "went shopping → 完成的动作（一般过去时）；was waiting → 正在等车时遇到朋友 → 长动作被打断。",
          subSkill: "when_while"
        }
      ]
    },

    mission: {
      title: "My Weekend Adventure",
      taskDescription: "写一段关于你上周末冒险经历的短文，描述发生了什么事，以及当时你正在做什么。",
      icon: "🏕️",
      scaffolds: [
        {
          prefix: "Last weekend, I ",
          suffix: " with my family.",
          hint: "写你上周末去了哪里/做了什么 (用一般过去时)",
          grammarCheck: "past_simple",
          example: "went to the countryside"
        },
        {
          prefix: "While we were ",
          suffix: ", something funny happened.",
          hint: "描述你们当时正在做什么 (用过去进行时)",
          grammarCheck: "past_continuous",
          example: "having a picnic by the river"
        },
        {
          prefix: "Suddenly, a ",
          suffix: "!",
          hint: "写突然发生了什么 (用一般过去时)",
          grammarCheck: "past_simple",
          example: "big dog ran towards us and stole our sandwiches"
        },
        {
          prefix: "I was so surprised that I ",
          suffix: ".",
          hint: "写你的反应 (用一般过去时)",
          grammarCheck: "past_simple",
          example: "jumped up and screamed"
        },
        {
          prefix: "When we got home, we were ",
          suffix: " but very happy.",
          hint: "描述回家时的状态",
          grammarCheck: "past_simple",
          example: "tired and hungry"
        }
      ],
      completionMessage: "太棒了！你完成了一篇精彩的'周末冒险'故事！"
    },

    badge: {
      name: "冒险家",
      icon: "🏕️",
      description: "掌握了一般过去时和过去进行时"
    }
  },

  // ==================== UNIT 3 ====================
  {
    id: 3,
    title: "Present Perfect vs Past Simple",
    description: "现在完成时 vs 一般过去时",
    icon: "✅",

    discover: {
      storyTitle: "Travel Talk at Lunch",
      story: "It's lunchtime at school. Amy and Jack are talking about their travel experiences. Amy says, 'I have been to Japan twice. I went there last summer and the summer before. I have also visited Thailand, but I have never been to Europe.' Jack replies, 'Really? I have just come back from France! I went to Paris last week. I have already seen the Eiffel Tower — it was amazing! Have you ever tried French food?' Amy answers, 'No, I haven't tried it yet, but I have always wanted to. My family has lived in Shanghai for ten years, so we usually travel around Asia.'",
      highlightWords: ["have been", "went", "have also visited", "have never been", "have just come back", "went", "have already seen", "was", "Have you ever tried", "haven't tried", "have always wanted", "has lived"],
      questions: [
        {
          question: "Amy says 'I have been to Japan twice' but 'I went there last summer'. Why does she use different tenses?",
          options: [
            "'have been' talks about experience (no specific time); 'went' gives a specific time (last summer)",
            "There is no difference, both are the same tense",
            "'have been' is for places far away; 'went' is for places nearby"
          ],
          correct: 0,
          explanation: "现在完成时（have been）强调经历/经验，不说具体时间；一般过去时（went）提到了具体时间 last summer。问'你去过日本吗？'→ Have you been to Japan? 问'你什么时候去的？'→ When did you go?"
        },
        {
          question: "What do the words 'just', 'already', 'never', 'yet' tell us?",
          options: [
            "They are only used with past simple",
            "They are signal words for present perfect tense",
            "They can be used with any tense"
          ],
          correct: 1,
          explanation: "just（刚刚）、already（已经）、never（从不）、yet（还没有）是现在完成时的标志词。have just come back = 刚回来；have already seen = 已经看过；haven't tried yet = 还没试过。"
        },
        {
          question: "Amy says 'My family has lived in Shanghai for ten years.' Why 'has lived' and not 'lived'?",
          options: [
            "Because ten years is a very long time",
            "Because the action started in the past and continues until now — they still live there",
            "Because Shanghai is a big city"
          ],
          correct: 1,
          explanation: "现在完成时 + for/since 表示从过去开始一直持续到现在的状态。has lived for ten years = 住了十年（而且现在还住在那里）。for + 时间段，since + 时间点。"
        }
      ],
      grammarTip: "语法小贴士：现在完成时 = 经历/刚完成/持续到现在（ever, never, just, already, yet, for, since）；一般过去时 = 过去具体时间的事（yesterday, last week, in 2020）。"
    },

    practice: {
      1: [
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "I have ___ been to London. I'd love to go!",
          options: ["ever", "never", "already", "yet"],
          correct: 1,
          explanation: "I'd love to go = 我很想去 → 说明从没去过 → never（从不/从未）。",
          subSkill: "ever_never"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "She has ___ finished her homework. She can play now.",
          options: ["yet", "never", "already", "ever"],
          correct: 2,
          explanation: "She can play now = 她现在可以玩了 → 说明已经完成 → already（已经）。",
          subSkill: "already_yet"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "They ___ to the new shopping mall last weekend.",
          options: ["have gone", "have been", "went", "go"],
          correct: 2,
          explanation: "last weekend → 具体过去时间 → 一般过去时 → went。",
          subSkill: "specific_time_marker"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "Have you ___ eaten sushi?",
          options: ["never", "ever", "already", "just"],
          correct: 1,
          explanation: "疑问句中用 ever（曾经）。Have you ever...? = 你曾经...吗？",
          subSkill: "ever_never"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "I have known her ___ 2019.",
          options: ["for", "since", "from", "at"],
          correct: 1,
          explanation: "2019 是时间点 → 用 since。since 2019 = 从2019年起。for + 时间段（for 5 years），since + 时间点（since 2019）。",
          subSkill: "for_since"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "We have lived here ___ three years.",
          options: ["for", "since", "ago", "at"],
          correct: 0,
          explanation: "three years 是时间段 → 用 for。for three years = 三年了。",
          subSkill: "for_since"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "He has ___ come back from the library.",
          options: ["yet", "ever", "just", "ago"],
          correct: 2,
          explanation: "just = 刚刚。He has just come back = 他刚刚回来。",
          subSkill: "already_yet"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "She hasn't called me ___.",
          options: ["already", "just", "ever", "yet"],
          correct: 3,
          explanation: "否定句中用 yet（还、尚未）。hasn't called me yet = 还没给我打电话。",
          subSkill: "already_yet"
        }
      ],

      2: [
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "___ you ever ___ a horse?",
          options: [
            "Did / ride",
            "Have / ridden",
            "Have / rode",
            "Did / ridden"
          ],
          correct: 1,
          explanation: "Have you ever + 过去分词？ride → ridden（不规则动词）。Have you ever ridden a horse? = 你骑过马吗？",
          subSkill: "past_participle"
        },
        {
          type: "match",
          instruction: "把左右两边正确配对",
          left: [
            "I have visited Japan",
            "I visited Japan",
            "She has lived here",
            "She lived here"
          ],
          right: [
            "three times. (经历)",
            "in 2022. (具体时间)",
            "since 2018. (持续到现在)",
            "for two years, then she moved. (过去的事)"
          ],
          correctPairs: [[0, 0], [1, 1], [2, 2], [3, 3]],
          explanation: "现在完成时强调经历或持续到现在；一般过去时强调过去的具体时间或已结束的事。",
          subSkill: "specific_time_marker"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "I ___ this film before. Let's watch something else.",
          options: ["see", "saw", "have seen", "am seeing"],
          correct: 2,
          explanation: "before → 以前看过 → 现在完成时。have seen this film before = 以前看过这部电影。",
          subSkill: "past_participle"
        },
        {
          type: "match",
          instruction: "把动词原形和过去分词配对",
          left: ["eat", "write", "break", "swim"],
          right: ["eaten", "written", "broken", "swum"],
          correctPairs: [[0, 0], [1, 1], [2, 2], [3, 3]],
          explanation: "不规则动词的过去分词：eat→eaten, write→written, break→broken, swim→swum。",
          subSkill: "past_participle"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "'When ___ you ___ to Beijing?' 'I ___ there in July.'",
          options: [
            "have / been / went",
            "did / go / went",
            "have / gone / have been",
            "did / go / have been"
          ],
          correct: 1,
          explanation: "When 问具体时间 → 用一般过去时：When did you go? I went there in July.",
          subSkill: "specific_time_marker"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "She ___ her keys. She can't find them anywhere!",
          options: ["lost", "has lost", "loses", "is losing"],
          correct: 1,
          explanation: "她现在找不到钥匙 → 过去丢的，结果影响到现在 → 现在完成时 → has lost。",
          subSkill: "past_participle"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "I ___ three cups of milk tea today.",
          options: [
            "drink",
            "drank",
            "have drunk",
            "was drinking"
          ],
          correct: 2,
          explanation: "today → 今天还没结束 → 到目前为止的经历 → 现在完成时 → have drunk。",
          subSkill: "specific_time_marker"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "He ___ in this school since he was six years old.",
          options: ["studies", "studied", "has studied", "is studying"],
          correct: 2,
          explanation: "since he was six → 从六岁起到现在 → 持续到现在 → 现在完成时 → has studied。",
          subSkill: "for_since"
        }
      ],

      3: [
        {
          type: "fill",
          instruction: "用括号中单词的正确形式填空",
          sentence: "I (not/see) ___ that movie yet.",
          answer: "haven't seen",
          acceptableAnswers: ["haven't seen", "have not seen"],
          explanation: "yet → 现在完成时否定。haven't + 过去分词。see → seen。",
          subSkill: "already_yet"
        },
        {
          type: "fill",
          instruction: "用括号中单词的正确形式填空",
          sentence: "She (live) ___ in Hangzhou for five years.",
          answer: "has lived",
          acceptableAnswers: ["has lived"],
          explanation: "for five years → 持续到现在 → 现在完成时。She has lived... ✓",
          subSkill: "for_since"
        },
        {
          type: "reorder",
          instruction: "把单词排列成正确的句子",
          words: ["have", "you", "been", "ever", "to", "Disneyland"],
          correct: "Have you ever been to Disneyland?",
          explanation: "现在完成时疑问句：Have + 主语 + ever + 过去分词？Have you ever been to...?",
          subSkill: "ever_never"
        },
        {
          type: "fill",
          instruction: "用括号中单词的正确形式填空",
          sentence: "They (just/finish) ___ their lunch.",
          answer: "have just finished",
          acceptableAnswers: ["have just finished"],
          explanation: "just → 刚刚 → 现在完成时。They have just finished. ✓",
          subSkill: "already_yet"
        },
        {
          type: "reorder",
          instruction: "把单词排列成正确的句子",
          words: ["she", "already", "the", "has", "read", "book"],
          correct: "She has already read the book.",
          explanation: "already 放在 has 和过去分词之间。She has already read the book. ✓",
          subSkill: "already_yet"
        },
        {
          type: "fill",
          instruction: "用括号中单词的正确形式填空",
          sentence: "We (know) ___ each other since primary school.",
          answer: "have known",
          acceptableAnswers: ["have known"],
          explanation: "since primary school → 从小学起到现在 → 现在完成时。know → known。",
          subSkill: "for_since"
        },
        {
          type: "reorder",
          instruction: "把单词排列成正确的句子",
          words: ["hasn't", "he", "his", "yet", "finished", "project"],
          correct: "He hasn't finished his project yet.",
          explanation: "现在完成时否定 + yet 放句尾。He hasn't finished... yet. ✓",
          subSkill: "already_yet"
        },
        {
          type: "fill",
          instruction: "用括号中单词的正确形式填空",
          sentence: "I (be) ___ to that restaurant many times. The food is great!",
          answer: "have been",
          acceptableAnswers: ["have been"],
          explanation: "many times → 经历 → 现在完成时。be → been。I have been to... = 我去过...",
          subSkill: "past_participle"
        }
      ],

      4: [
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["I", "have", "went", "to", "Paris", "three", "times"],
          errorIndex: 2,
          correction: "been",
          explanation: "现在完成时用过去分词。go 的过去分词是 gone/been。I have been to Paris. ✓（不是 have went）。",
          subSkill: "past_participle"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["She", "has", "lived", "here", "for", "2015"],
          errorIndex: 4,
          correction: "since",
          explanation: "2015 是时间点 → 用 since，不用 for。She has lived here since 2015. ✓",
          subSkill: "for_since"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["I", "have", "seen", "this", "movie", "yesterday"],
          errorIndex: 5,
          correction: "(remove — use past simple: I saw this movie yesterday)",
          explanation: "yesterday 是具体过去时间 → 不能和现在完成时一起用！应该是 I saw this movie yesterday. 或者 I have seen this movie before.",
          subSkill: "specific_time_marker"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["Have", "you", "ever", "ate", "Korean", "food"],
          errorIndex: 3,
          correction: "eaten",
          explanation: "现在完成时：Have + 主语 + 过去分词。eat → eaten（不是 ate，ate 是过去式）。",
          subSkill: "past_participle"
        },
        {
          type: "choice",
          instruction: "哪个句子是正确的？",
          sentence: "选出语法正确的句子：",
          options: [
            "I have been to America last year.",
            "I went to America last year.",
            "I have went to America last year.",
            "I did go to America last year."
          ],
          correct: 1,
          explanation: "last year → 具体过去时间 → 一般过去时 → I went to America last year. ✓",
          subSkill: "specific_time_marker"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["They", "haven't", "arrive", "yet"],
          errorIndex: 2,
          correction: "arrived",
          explanation: "现在完成时：haven't + 过去分词。arrive → arrived。They haven't arrived yet. ✓",
          subSkill: "past_participle"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "'How long ___ you ___ this phone?' 'I ___ it two years ago.'",
          options: [
            "did / have / bought",
            "have / had / bought",
            "have / had / have bought",
            "did / have / have bought"
          ],
          correct: 1,
          explanation: "How long have you had...? → 你拥有多久了（持续到现在）。I bought it... ago → 具体过去时间。",
          subSkill: "for_since"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["We", "have", "already", "did", "our", "homework"],
          errorIndex: 3,
          correction: "done",
          explanation: "have already + 过去分词。do → done（不是 did）。We have already done our homework. ✓",
          subSkill: "past_participle"
        }
      ],

      5: [
        {
          type: "scenario",
          instruction: "选择最合适的回答",
          context: "Your friend invites you to see a new movie at the cinema.",
          dialogue: [
            { speaker: "Friend", text: "Do you want to go see 'Space Adventure 3'?" }
          ],
          options: [
            "No thanks, I already see it.",
            "No thanks, I've already seen it.",
            "No thanks, I see it yesterday."
          ],
          correct: 1,
          explanation: "已经看过（对现在的影响：所以不想再去）→ 现在完成时 + already → I've already seen it.",
          subSkill: "already_yet"
        },
        {
          type: "scenario",
          instruction: "选择最合适的回答",
          context: "Your English teacher asks the class about travel experiences.",
          dialogue: [
            { speaker: "Teacher", text: "Tell me about a country you have visited." }
          ],
          options: [
            "I have visited Korea. I went there last summer with my parents. We ate delicious food and visited many temples.",
            "I have visited Korea. I have gone there last summer. We have eaten delicious food.",
            "I visit Korea last summer. I eat delicious food."
          ],
          correct: 0,
          explanation: "先用现在完成时说经历（have visited），再用一般过去时给具体细节（went, ate, visited + last summer）。",
          subSkill: "specific_time_marker"
        },
        {
          type: "scenario",
          instruction: "选择最合适的回答",
          context: "You are at a restaurant with your family.",
          dialogue: [
            { speaker: "Waiter", text: "Have you decided what to order?" }
          ],
          options: [
            "Yes, we decided already.",
            "Yes, we have already decided. We'd like the pasta, please.",
            "Yes, we decide now."
          ],
          correct: 1,
          explanation: "already + 现在完成时 → 已经决定好了。We have already decided. ✓",
          subSkill: "already_yet"
        },
        {
          type: "choice",
          instruction: "选择正确的答案（PET 风格）",
          sentence: "Read the email: 'Hi Tom! I ___ (just/get) a new puppy! I ___ (want) a dog since I was little. We ___ (buy) him from a pet shop last Saturday.'",
          options: [
            "have just got / have wanted / bought",
            "just got / wanted / have bought",
            "have just got / wanted / bought",
            "just got / have wanted / bought"
          ],
          correct: 0,
          explanation: "have just got → 刚刚得到；have wanted since → 从小就想要（持续到现在）；bought last Saturday → 具体时间用过去时。",
          subSkill: "for_since"
        },
        {
          type: "scenario",
          instruction: "选择最合适的回答",
          context: "You just finished reading a book and your classmate asks about it.",
          dialogue: [
            { speaker: "Classmate", text: "Is the book good? Have you finished it?" }
          ],
          options: [
            "Yes, I just finish it. It is great!",
            "Yes, I've just finished it. It was great!",
            "Yes, I finished it just. It has been great!"
          ],
          correct: 1,
          explanation: "have just finished → 刚刚看完（现在完成时）；It was great → 评价这本书（过去时，因为阅读已结束）。",
          subSkill: "already_yet"
        },
        {
          type: "fill",
          instruction: "用括号中单词的正确形式填空",
          sentence: "I (not/try) ___ bungee jumping, but I (do) ___ rock climbing last summer.",
          answer: "haven't tried, did",
          acceptableAnswers: ["haven't tried, did", "have not tried, did", "haven't tried , did"],
          explanation: "haven't tried → 从未尝试过（经历）→ 现在完成时；did rock climbing last summer → 具体时间 → 一般过去时。",
          subSkill: "specific_time_marker"
        },
        {
          type: "scenario",
          instruction: "选择最合适的回答",
          context: "Your pen pal from England asks about your hobbies.",
          dialogue: [
            { speaker: "Pen pal", text: "How long have you played the piano?" }
          ],
          options: [
            "I played the piano three years.",
            "I have played the piano for three years.",
            "I play the piano since three years."
          ],
          correct: 1,
          explanation: "How long have you...? → 用现在完成时回答。for three years → 三年了（持续到现在）。",
          subSkill: "for_since"
        },
        {
          type: "choice",
          instruction: "选择正确的答案（PET 风格）",
          sentence: "Which is the best response? 'You look happy!' — '___'",
          options: [
            "Yes! I just passed my maths exam!",
            "Yes! I have just passed my maths exam!",
            "Yes! I pass my maths exam!",
            "Yes! I was passing my maths exam!"
          ],
          correct: 1,
          explanation: "刚刚通过考试 → 对现在有影响（所以看起来很开心）→ have just passed ✓。",
          subSkill: "already_yet"
        }
      ]
    },

    mission: {
      title: "My Bucket List",
      taskDescription: "写一篇'人生愿望清单'，描述你已经做过和还没做过的事情。",
      icon: "🌟",
      scaffolds: [
        {
          prefix: "I have already ",
          suffix: ", and it was amazing!",
          hint: "写一件你已经做过的很棒的事",
          grammarCheck: "present_perfect",
          example: "visited Disneyland in Shanghai"
        },
        {
          prefix: "I have never ",
          suffix: ", but I really want to.",
          hint: "写一件你从来没做过但很想做的事",
          grammarCheck: "present_perfect",
          example: "seen snow in real life"
        },
        {
          prefix: "My family has lived in ",
          suffix: " for a long time.",
          hint: "写你的家人住在哪里以及住了多久",
          grammarCheck: "present_perfect",
          example: "our city for eight years"
        },
        {
          prefix: "Last year, I ",
          suffix: " for the first time.",
          hint: "写去年你第一次做的一件事 (用一般过去时)",
          grammarCheck: "past_simple",
          example: "tried ice skating"
        },
        {
          prefix: "I haven't ",
          suffix: " yet, but it's on my list!",
          hint: "写一件你还没做的事",
          grammarCheck: "present_perfect",
          example: "learned to play the guitar"
        }
      ],
      completionMessage: "太棒了！你的'人生愿望清单'写得很棒！希望你的梦想都能实现！"
    },

    badge: {
      name: "经验达人",
      icon: "✅",
      description: "掌握了现在完成时和一般过去时的区别"
    }
  },

];
