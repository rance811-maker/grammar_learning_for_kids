// Grammar Quest - Unit Data Bank (Units 10-12)
// Aligned with Cambridge Think 2 / PET (B1)

export const unitsBatch = [
  // ==================== UNIT 10 ====================
  {
    id: 10,
    title: "Gerunds & Infinitives",
    description: "动名词 & 不定式",
    icon: "🎯",

    discover: {
      storyTitle: "My Weekend Plans",
      story: "Hi! My name is Leo, and I love telling people about my hobbies. On Saturdays, I enjoy playing video games with my brother, but he hates losing! In the afternoon, I want to go to the swimming pool because swimming is my favourite sport. My best friend Mia is good at drawing, so we decided to make a comic book together. Reading is fun too, so before bed I always finish doing my homework and then I hope to read one chapter of my book. My mum says learning new things keeps your brain happy!",
      highlightWords: ["love telling", "enjoy playing", "hates losing", "want to go", "swimming is my favourite", "good at drawing", "decided to make", "Reading is fun", "finish doing", "hope to read", "learning new things"],
      questions: [
        {
          question: "Look at 'I enjoy playing video games' and 'I want to go to the swimming pool'. Why are the verb forms after 'enjoy' and 'want' different?",
          options: [
            "Some verbs (like enjoy) are followed by -ing; others (like want) are followed by 'to' + verb",
            "'playing' is past tense and 'to go' is future tense",
            "There is no rule — you can use either form anywhere"
          ],
          correct: 0,
          explanation: "有些动词后面要接动名词（-ing 形式），比如 enjoy/finish/hate；有些动词后面要接不定式（to + 动词原形），比如 want/decide/hope。这需要记住固定搭配。",
          subSkill: "verb_plus_ing"
        },
        {
          question: "The story says 'Swimming is my favourite sport' and 'Reading is fun'. What job do 'Swimming' and 'Reading' do in these sentences?",
          options: [
            "They are adjectives describing the sport",
            "They are gerunds acting as the subject of the sentence",
            "They are mistakes — it should be 'To swim' and 'To read'"
          ],
          correct: 1,
          explanation: "动名词（-ing 形式）可以当句子的主语，表示一项活动。Swimming is fun. = 游泳很有趣。这时它就像一个名词。",
          subSkill: "as_subject"
        },
        {
          question: "Why does the story say 'good at drawing' and not 'good at to draw'?",
          options: [
            "Because 'draw' is too short a word",
            "Because after a preposition (like 'at', 'of', 'in') we always use the -ing form",
            "Because drawing is more difficult than other hobbies"
          ],
          correct: 1,
          explanation: "介词（at, of, in, about, before 等）后面的动词要用动名词（-ing 形式）。good at drawing ✓，不能说 good at to draw。",
          subSkill: "preposition_plus_ing"
        }
      ],
      grammarTip: "语法小贴士：enjoy/finish/hate/love + 动词-ing；want/decide/hope/plan + to + 动词原形；介词后面用 -ing；动名词可以当主语（Swimming is fun）。"
    },

    practice: {
      1: [
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "I enjoy ___ video games.",
          options: ["play", "to play", "playing", "plays"],
          correct: 2,
          explanation: "enjoy 后面要接动名词（-ing 形式）→ enjoy playing ✓。",
          subSkill: "verb_plus_ing"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "She wants ___ a doctor when she grows up.",
          options: ["become", "to become", "becoming", "becomes"],
          correct: 1,
          explanation: "want 后面要接不定式（to + 动词原形）→ want to become ✓。",
          subSkill: "verb_plus_to"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "My brother finished ___ his homework an hour ago.",
          options: ["do", "to do", "doing", "does"],
          correct: 2,
          explanation: "finish 后面要接动名词（-ing 形式）→ finished doing ✓。",
          subSkill: "verb_plus_ing"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "We decided ___ to the beach on Sunday.",
          options: ["go", "to go", "going", "goes"],
          correct: 1,
          explanation: "decide 后面要接不定式（to + 动词原形）→ decided to go ✓。",
          subSkill: "verb_plus_to"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "___ is good for your health and a lot of fun.",
          options: ["Swim", "To swimming", "Swimming", "Swims"],
          correct: 2,
          explanation: "动名词可以当句子的主语 → Swimming is good... ✓。",
          subSkill: "as_subject"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "My friend is very good at ___ pictures of animals.",
          options: ["draw", "to draw", "drawing", "draws"],
          correct: 2,
          explanation: "介词 at 后面要用动名词（-ing 形式）→ good at drawing ✓。",
          subSkill: "preposition_plus_ing"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "They hope ___ the football match this weekend.",
          options: ["win", "to win", "winning", "wins"],
          correct: 1,
          explanation: "hope 后面要接不定式（to + 动词原形）→ hope to win ✓。",
          subSkill: "verb_plus_to"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "My cat loves ___ in the sun all afternoon.",
          options: ["sleep", "to sleeping", "sleeping", "sleeps"],
          correct: 2,
          explanation: "love 后面可以接动名词（-ing 形式）→ loves sleeping ✓。",
          subSkill: "verb_plus_ing"
        }
      ],

      2: [
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "I'm thinking about ___ a new bike for my birthday.",
          options: ["buy", "to buy", "buying", "buys"],
          correct: 2,
          explanation: "介词 about 后面要用动名词（-ing 形式）→ thinking about buying ✓。",
          subSkill: "preposition_plus_ing"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "She started ___ the piano when she was six. (both forms are correct here)",
          options: ["play", "to play", "plays", "played"],
          correct: 1,
          explanation: "start 后面既可以接 to + 动词原形，也可以接 -ing。这里 to play 是正确选项之一（started to play / started playing 都可以）。",
          subSkill: "both_forms"
        },
        {
          type: "match",
          instruction: "把左右两边正确配对",
          left: [
            "I enjoy",
            "I want",
            "I decided",
            "I finished"
          ],
          right: [
            "to leave early.",
            "swimming in summer.",
            "reading my book.",
            "to help my mum."
          ],
          correctPairs: [[0, 1], [1, 0], [2, 3], [3, 2]],
          explanation: "enjoy + -ing（swimming）；want + to（to leave）；decide + to（to help）；finish + -ing（reading）。",
          subSkill: "verb_plus_to"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "Are you interested in ___ to the science club?",
          options: ["join", "to join", "joining", "joins"],
          correct: 2,
          explanation: "介词 in 后面要用动名词（-ing 形式）→ interested in joining ✓。",
          subSkill: "preposition_plus_ing"
        },
        {
          type: "match",
          instruction: "把动词和它后面正确的形式配对",
          left: ["enjoy", "hope", "be good at", "plan"],
          right: ["dancing", "to win", "singing", "to travel"],
          correctPairs: [[0, 0], [1, 1], [2, 2], [3, 3]],
          explanation: "enjoy + -ing；hope + to；be good at + -ing（介词后用动名词）；plan + to。",
          subSkill: "verb_plus_ing"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "___ comic books is my favourite hobby.",
          options: ["Read", "To reading", "Reading", "Reads"],
          correct: 2,
          explanation: "动名词当主语 → Reading comic books is my favourite hobby. ✓",
          subSkill: "as_subject"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "My dad hates ___ in long traffic queues.",
          options: ["wait", "to waiting", "waiting", "waits"],
          correct: 2,
          explanation: "hate 后面接动名词（-ing 形式）→ hates waiting ✓。",
          subSkill: "verb_plus_ing"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "We need ___ before the shops close.",
          options: ["leave", "to leave", "leaving", "leaves"],
          correct: 1,
          explanation: "need 后面接不定式（to + 动词原形）→ need to leave ✓。",
          subSkill: "verb_plus_to"
        }
      ],

      3: [
        {
          type: "fill",
          instruction: "用括号中单词的正确形式填空",
          sentence: "She is good at (draw) ___ pictures.",
          answer: "drawing",
          acceptableAnswers: ["drawing"],
          explanation: "介词 at 后面用动名词（-ing 形式）→ good at drawing ✓。",
          subSkill: "preposition_plus_ing"
        },
        {
          type: "fill",
          instruction: "用括号中单词的正确形式填空",
          sentence: "We decided (visit) ___ our grandparents this weekend.",
          answer: "to visit",
          acceptableAnswers: ["to visit"],
          explanation: "decide 后面接不定式（to + 动词原形）→ decided to visit ✓。",
          subSkill: "verb_plus_to"
        },
        {
          type: "reorder",
          instruction: "把单词排列成正确的句子",
          words: ["she", "wants", "to", "become", "a", "doctor"],
          correct: "She wants to become a doctor.",
          explanation: "want + to + 动词原形。She wants to become a doctor. ✓",
          subSkill: "verb_plus_to"
        },
        {
          type: "fill",
          instruction: "用括号中单词的正确形式填空",
          sentence: "(Play) ___ football with my friends is so much fun.",
          answer: "Playing",
          acceptableAnswers: ["Playing", "playing"],
          explanation: "动名词当主语 → Playing football is fun. ✓",
          subSkill: "as_subject"
        },
        {
          type: "reorder",
          instruction: "把单词排列成正确的句子",
          words: ["I", "enjoy", "listening", "to", "pop", "music"],
          correct: "I enjoy listening to pop music.",
          explanation: "enjoy + -ing。I enjoy listening to pop music. ✓",
          subSkill: "verb_plus_ing"
        },
        {
          type: "fill",
          instruction: "用括号中单词的正确形式填空",
          sentence: "He finished (eat) ___ his lunch and went outside.",
          answer: "eating",
          acceptableAnswers: ["eating"],
          explanation: "finish 后面接动名词（-ing 形式）→ finished eating ✓。",
          subSkill: "verb_plus_ing"
        },
        {
          type: "reorder",
          instruction: "把单词排列成正确的句子",
          words: ["swimming", "is", "my", "favourite", "sport"],
          correct: "Swimming is my favourite sport.",
          explanation: "动名词当主语 → Swimming is my favourite sport. ✓",
          subSkill: "as_subject"
        },
        {
          type: "fill",
          instruction: "用括号中单词的正确形式填空",
          sentence: "I hope (see) ___ you at the party on Saturday.",
          answer: "to see",
          acceptableAnswers: ["to see"],
          explanation: "hope 后面接不定式（to + 动词原形）→ hope to see ✓。",
          subSkill: "verb_plus_to"
        }
      ],

      4: [
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["I", "want", "playing", "football", "now"],
          errorIndex: 2,
          correction: "to play",
          explanation: "want 后面要接不定式（to + 动词原形），不是 -ing → I want to play football. ✓",
          subSkill: "verb_plus_to"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["She", "enjoys", "to", "dance", "with", "her", "friends"],
          errorIndex: 2,
          correction: "dancing",
          explanation: "enjoy 后面要接动名词（-ing 形式），不能用 to → She enjoys dancing. ✓（删去 to，把 dance 改成 dancing）",
          subSkill: "verb_plus_ing"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["He", "is", "good", "at", "to", "swim"],
          errorIndex: 4,
          correction: "swimming",
          explanation: "介词 at 后面要用动名词（-ing 形式），不能用 to → good at swimming. ✓",
          subSkill: "preposition_plus_ing"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["To", "swim", "is", "very", "good", "exercise"],
          errorIndex: 0,
          correction: "Swimming",
          explanation: "用动名词当主语更自然 → Swimming is very good exercise. ✓",
          subSkill: "as_subject"
        },
        {
          type: "choice",
          instruction: "哪个句子是正确的？",
          sentence: "选出语法正确的句子：",
          options: [
            "I decided learning the guitar.",
            "I decided to learn the guitar.",
            "I decided to learning the guitar.",
            "I decided learn the guitar."
          ],
          correct: 1,
          explanation: "decide 后面接不定式（to + 动词原形）→ I decided to learn the guitar. ✓",
          subSkill: "verb_plus_to"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["They", "finished", "to", "paint", "the", "fence"],
          errorIndex: 2,
          correction: "painting",
          explanation: "finish 后面接动名词（-ing 形式），不用 to → They finished painting the fence. ✓",
          subSkill: "verb_plus_ing"
        },
        {
          type: "choice",
          instruction: "哪个句子是正确的？",
          sentence: "选出语法正确的句子：",
          options: [
            "She is afraid of fly in planes.",
            "She is afraid of to fly in planes.",
            "She is afraid of flying in planes.",
            "She is afraid of flies in planes."
          ],
          correct: 2,
          explanation: "介词 of 后面用动名词（-ing 形式）→ afraid of flying ✓。",
          subSkill: "preposition_plus_ing"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["We", "hope", "winning", "the", "quiz", "competition"],
          errorIndex: 2,
          correction: "to win",
          explanation: "hope 后面接不定式（to + 动词原形）→ We hope to win the quiz competition. ✓",
          subSkill: "verb_plus_to"
        }
      ],

      5: [
        {
          type: "scenario",
          instruction: "选择最合适的回答",
          context: "A new friend asks about your hobbies.",
          dialogue: [
            { speaker: "Friend", text: "What do you like doing in your free time?" }
          ],
          options: [
            "I like to playing guitar.",
            "I enjoy playing the guitar and reading comics.",
            "I enjoy to play guitar."
          ],
          correct: 1,
          explanation: "enjoy 后面接动名词（-ing 形式）→ I enjoy playing the guitar... ✓",
          subSkill: "verb_plus_ing"
        },
        {
          type: "scenario",
          instruction: "选择最合适的回答",
          context: "Your teacher asks about your dream for the future.",
          dialogue: [
            { speaker: "Teacher", text: "What do you want to do when you grow up?" }
          ],
          options: [
            "I want becoming a scientist.",
            "I want to become a scientist and study space.",
            "I want become a scientist."
          ],
          correct: 1,
          explanation: "want 后面接不定式（to + 动词原形）→ I want to become a scientist. ✓",
          subSkill: "verb_plus_to"
        },
        {
          type: "scenario",
          instruction: "选择最合适的回答",
          context: "Your friend invites you to join the school art club.",
          dialogue: [
            { speaker: "Friend", text: "You should join the art club! Are you good at art?" }
          ],
          options: [
            "Yes, I'm good at draw and paint.",
            "Yes, I'm good at drawing and painting!",
            "Yes, I'm good at to draw and paint."
          ],
          correct: 1,
          explanation: "介词 at 后面用动名词（-ing 形式）→ good at drawing and painting ✓。",
          subSkill: "preposition_plus_ing"
        },
        {
          type: "choice",
          instruction: "选择正确的答案（PET 风格阅读）",
          sentence: "Read the message: 'Hi Sam! I've finished ___ my project. Now I plan ___ a film tonight. Want to come?'",
          options: [
            "doing / to watch",
            "to do / watching",
            "do / watch",
            "to do / to watching"
          ],
          correct: 0,
          explanation: "finish + -ing（finished doing）；plan + to（plan to watch）。两个搭配都要对。",
          subSkill: "both_forms"
        },
        {
          type: "scenario",
          instruction: "选择最合适的回答",
          context: "Your mum asks what you have planned for the holiday.",
          dialogue: [
            { speaker: "Mum", text: "What are you planning to do this holiday?" }
          ],
          options: [
            "We decided to go camping in the mountains.",
            "We decided going camping in the mountains.",
            "We decided go camping in the mountains."
          ],
          correct: 0,
          explanation: "decide 后面接不定式（to + 动词原形）→ decided to go ✓。",
          subSkill: "verb_plus_to"
        },
        {
          type: "choice",
          instruction: "选择正确的答案（PET 风格）",
          sentence: "Which sentence is correct for a PET email about your hobbies?",
          options: [
            "Reading is my favourite hobby and I love to collecting books.",
            "Reading is my favourite hobby and I love collecting books.",
            "To read is my favourite hobby and I love collect books.",
            "Reading is my favourite hobby and I love to collecting books."
          ],
          correct: 1,
          explanation: "动名词当主语（Reading is...）；love + -ing（love collecting）。",
          subSkill: "as_subject"
        },
        {
          type: "scenario",
          instruction: "选择最合适的回答",
          context: "A classmate asks why you go to bed late.",
          dialogue: [
            { speaker: "Classmate", text: "Why do you sleep so late?" }
          ],
          options: [
            "Because I enjoy to read before bed.",
            "Because I enjoy reading before bed.",
            "Because I enjoy read before bed."
          ],
          correct: 1,
          explanation: "enjoy 后面接动名词（-ing 形式）→ enjoy reading ✓。",
          subSkill: "verb_plus_ing"
        },
        {
          type: "choice",
          instruction: "选择正确的答案（PET 风格）",
          sentence: "Complete the sentence for your story: 'My sister hopes ___ a famous singer, and she practises ___ every day.'",
          options: [
            "becoming / to sing",
            "to become / singing",
            "to become / to sing",
            "becoming / singing"
          ],
          correct: 1,
          explanation: "hope + to（to become）；practise + -ing（practises singing）。",
          subSkill: "verb_plus_to"
        }
      ]
    },

    mission: {
      title: "About Me",
      taskDescription: "做一个属于你自己的'兴趣档案'！用动名词和不定式介绍你喜欢做的事、想做的事和擅长的事。",
      icon: "🎨",
      scaffolds: [
        {
          prefix: "In my free time, I enjoy ",
          suffix: ".",
          hint: "写一件你喜欢做的事 (enjoy 后用动词-ing)",
          grammarCheck: "gerund_infinitive",
          example: "playing badminton with my friends"
        },
        {
          prefix: "When I grow up, I want ",
          suffix: ".",
          hint: "写你长大后想做什么 (want 后用 to + 动词原形)",
          grammarCheck: "gerund_infinitive",
          example: "to travel around the world"
        },
        {
          prefix: "I am really good at ",
          suffix: ".",
          hint: "写一件你擅长的事 (介词 at 后用动词-ing)",
          grammarCheck: "gerund_infinitive",
          example: "drawing cartoon characters"
        },
        {
          prefix: "",
          suffix: " is my favourite activity.",
          hint: "用一个动名词当主语，写出你最爱的活动 (-ing 当主语)",
          grammarCheck: "gerund_infinitive",
          example: "Swimming"
        },
        {
          prefix: "Next month, I hope ",
          suffix: ".",
          hint: "写一件你希望做的事 (hope 后用 to + 动词原形)",
          grammarCheck: "gerund_infinitive",
          example: "to learn how to skateboard"
        }
      ],
      completionMessage: "太棒了！你完成了自己的'兴趣档案'，动名词和不定式用得真好！"
    },

    badge: {
      name: "兴趣达人",
      icon: "🎯",
      description: "掌握了动名词和不定式的用法"
    }
  },

  // ==================== UNIT 11 ====================
  {
    id: 11,
    title: "Reported Speech",
    description: "间接引语（转述）",
    icon: "💬",

    discover: {
      storyTitle: "The Big Secret",
      story: "Yesterday at school, my friend Ben told me something exciting. He said that he was moving to a new house near the park. He told me that his new room was huge. I asked him when he was moving, and he said they were leaving that weekend. Then Mia said she was happy for him, but she asked if he would still come to our school. Ben told us not to worry. He said he would visit every day. Later, our teacher told us that Ben had won a school prize too. What a day!",
      highlightWords: ["told me", "He said that", "was moving", "told me that", "asked him when", "they were leaving", "that weekend", "she was happy", "asked if", "he would visit", "told us that"],
      questions: [
        {
          question: "Ben's exact words were 'I am moving to a new house.' The story reports it as 'He said that he was moving to a new house.' What changed?",
          options: [
            "Nothing changed at all",
            "'am moving' (present) changed to 'was moving' (past) when we report it",
            "'moving' changed to 'moved' to make it shorter"
          ],
          correct: 1,
          explanation: "转述别人说过的话时，动词时态通常要'退后一格'：一般现在时→一般过去时，现在进行时→过去进行时。am moving → was moving。这叫做时态后移。",
          subSkill: "tense_shift"
        },
        {
          question: "The story uses 'He said that...' and 'He told me that...'. What is the difference between 'say' and 'tell'?",
          options: [
            "They are exactly the same and can be swapped anytime",
            "'tell' needs a person after it (tell me); 'say' does not (say that...)",
            "'say' is only for questions and 'tell' is only for answers"
          ],
          correct: 1,
          explanation: "tell 后面要直接跟一个人（tell me, tell us, tell him）；say 后面不直接跟人（say that...）。说错例子：say me ✗；正确：tell me ✓ / say that ✓。",
          subSkill: "say_tell"
        },
        {
          question: "I asked Ben 'When are you moving?' became 'I asked him when he was moving.' What happened to the word order in the reported question?",
          options: [
            "The question keeps the same order as a normal question (are you)",
            "The reported question uses statement word order (he was), with no question mark",
            "We must add 'do' to every reported question"
          ],
          correct: 1,
          explanation: "转述疑问句时，要用陈述句的语序（主语 + 动词），不再倒装，句末也不用问号。'When are you moving?' → asked when he was moving.",
          subSkill: "reported_questions"
        }
      ],
      grammarTip: "语法小贴士：转述时时态后移（is→was, will→would）；tell 后跟人，say 后不跟人；转述疑问句用陈述句语序，是非问句用 if/whether；now→then, here→there, today→that day。"
    },

    practice: {
      1: [
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "He said that he ___ tired. (His words: 'I am tired.')",
          options: ["is", "was", "are", "be"],
          correct: 1,
          explanation: "转述时时态后移：am（一般现在时）→ was（一般过去时）。He said that he was tired. ✓",
          subSkill: "tense_shift"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "She ___ me that she liked the film.",
          options: ["said", "told", "say", "says"],
          correct: 1,
          explanation: "后面直接跟人（me）要用 tell → She told me that... ✓（不能说 said me）。",
          subSkill: "say_tell"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "Tom ___ that he was hungry.",
          options: ["told", "said", "tell", "say"],
          correct: 1,
          explanation: "后面不直接跟人，跟 that 从句，要用 say → Tom said that... ✓。",
          subSkill: "say_tell"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "They said they ___ play football the next day. (Their words: 'We will play football.')",
          options: ["will", "would", "are", "can"],
          correct: 1,
          explanation: "转述时 will → would。They said they would play football. ✓",
          subSkill: "tense_shift"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "She asked me where I ___. (Her words: 'Where do you live?')",
          options: ["live", "lived", "do live", "living"],
          correct: 1,
          explanation: "转述疑问句用陈述句语序，时态后移：do you live → I lived。She asked me where I lived. ✓",
          subSkill: "reported_questions"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "He asked ___ I could swim. (His words: 'Can you swim?')",
          options: ["that", "if", "what", "do"],
          correct: 1,
          explanation: "转述是非问句（yes/no 问题）用 if 或 whether 引导。He asked if I could swim. ✓",
          subSkill: "reported_questions"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "Mum said she was busy ___. (Her words: 'I am busy now.')",
          options: ["now", "then", "today", "here"],
          correct: 1,
          explanation: "转述时间状语会变化：now → then。Mum said she was busy then. ✓",
          subSkill: "time_place_change"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "The teacher ___ us to be quiet.",
          options: ["said", "told", "say", "says"],
          correct: 1,
          explanation: "tell + 人 + to do（命令转述）→ told us to be quiet. ✓",
          subSkill: "reporting_verbs"
        }
      ],

      2: [
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "She said that she ___ doing her homework. (Her words: 'I am doing my homework.')",
          options: ["is", "was", "are", "be"],
          correct: 1,
          explanation: "现在进行时 → 过去进行时：am doing → was doing。She said she was doing her homework. ✓",
          subSkill: "tense_shift"
        },
        {
          type: "match",
          instruction: "把直接引语和正确的转述配对",
          left: [
            "'I am happy.'",
            "'I will help you.'",
            "'I can dance.'",
            "'I like pizza.'"
          ],
          right: [
            "He said he could dance.",
            "He said he was happy.",
            "He said he liked pizza.",
            "He said he would help me."
          ],
          correctPairs: [[0, 1], [1, 3], [2, 0], [3, 2]],
          explanation: "转述时时态后移：am→was, will→would, can→could, like→liked。",
          subSkill: "tense_shift"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "He ___ me a funny story at lunch.",
          options: ["said", "told", "say", "talked"],
          correct: 1,
          explanation: "tell + 人（told me）；也可以 tell sb a story。He told me a funny story. ✓",
          subSkill: "say_tell"
        },
        {
          type: "match",
          instruction: "把时间/地点词的直接和转述形式配对",
          left: ["now", "today", "here", "tomorrow"],
          right: ["there", "the next day", "then", "that day"],
          correctPairs: [[0, 2], [1, 3], [2, 0], [3, 1]],
          explanation: "now→then；today→that day；here→there；tomorrow→the next day。",
          subSkill: "time_place_change"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "She asked me ___ I had finished my lunch. (Her words: 'Have you finished your lunch?')",
          options: ["that", "what", "if", "do"],
          correct: 2,
          explanation: "是非问句转述用 if/whether。She asked me if I had finished my lunch. ✓",
          subSkill: "reported_questions"
        },
        {
          type: "match",
          instruction: "把 say 和 tell 的正确用法配对",
          left: ["He told", "She said", "They told", "I said"],
          right: ["that it was late.", "us a secret.", "me the answer.", "that I was sorry."],
          correctPairs: [[0, 2], [1, 0], [2, 1], [3, 3]],
          explanation: "tell 后面跟人（told me, told us）；say 后面不跟人（said that）。",
          subSkill: "say_tell"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "Dad said he would fix my bike ___. (His words: 'I will fix it tomorrow.')",
          options: ["tomorrow", "yesterday", "the next day", "now"],
          correct: 2,
          explanation: "转述时 tomorrow → the next day（或 the following day）。",
          subSkill: "time_place_change"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "The coach ___ the players to run faster.",
          options: ["said", "told", "say", "spoke"],
          correct: 1,
          explanation: "转述命令用 tell + 人 + to do → told the players to run. ✓",
          subSkill: "reporting_verbs"
        }
      ],

      3: [
        {
          type: "fill",
          instruction: "把直接引语改成间接引语，填入正确的词",
          sentence: "Direct: 'I am cold.' Reported: She said that she ___ cold.",
          answer: "was",
          acceptableAnswers: ["was"],
          explanation: "am → was（时态后移）。She said that she was cold. ✓",
          subSkill: "tense_shift"
        },
        {
          type: "fill",
          instruction: "用 say 或 tell 的正确形式填空",
          sentence: "He ___ me that the test was easy.",
          answer: "told",
          acceptableAnswers: ["told"],
          explanation: "后面直接跟人（me）用 tell 的过去式 told。He told me that... ✓",
          subSkill: "say_tell"
        },
        {
          type: "reorder",
          instruction: "把单词排列成正确的句子",
          words: ["she", "said", "that", "she", "was", "tired"],
          correct: "She said that she was tired.",
          explanation: "say + that + 陈述句（时态后移 is→was）。She said that she was tired. ✓",
          subSkill: "tense_shift"
        },
        {
          type: "fill",
          instruction: "用 if 把疑问句转述，填入正确的词",
          sentence: "Direct: 'Do you like ice cream?' Reported: He asked me ___ I liked ice cream.",
          answer: "if",
          acceptableAnswers: ["if", "whether"],
          explanation: "是非问句转述用 if 或 whether。He asked me if I liked ice cream. ✓",
          subSkill: "reported_questions"
        },
        {
          type: "reorder",
          instruction: "把单词排列成正确的句子",
          words: ["he", "told", "me", "that", "he", "was", "leaving"],
          correct: "He told me that he was leaving.",
          explanation: "tell + 人 + that + 陈述句。He told me that he was leaving. ✓",
          subSkill: "say_tell"
        },
        {
          type: "fill",
          instruction: "把时间词改成转述形式填空",
          sentence: "Direct: 'I will call you tomorrow.' Reported: She said she would call me ___ next day.",
          answer: "the",
          acceptableAnswers: ["the"],
          explanation: "tomorrow → the next day（the following day）。",
          subSkill: "time_place_change"
        },
        {
          type: "reorder",
          instruction: "把单词排列成正确的句子（转述疑问句）",
          words: ["she", "asked", "where", "I", "lived"],
          correct: "She asked where I lived.",
          explanation: "转述疑问句用陈述句语序（I lived），没有问号。She asked where I lived. ✓",
          subSkill: "reported_questions"
        },
        {
          type: "fill",
          instruction: "用括号中动词的正确转述形式填空",
          sentence: "Direct: 'I can ride a horse.' Reported: He said he (can) ___ ride a horse.",
          answer: "could",
          acceptableAnswers: ["could"],
          explanation: "转述时 can → could。He said he could ride a horse. ✓",
          subSkill: "tense_shift"
        }
      ],

      4: [
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["He", "said", "me", "that", "he", "was", "busy"],
          errorIndex: 2,
          correction: "told",
          explanation: "say 后面不能直接跟人。要么用 told me，要么用 said that。这里应该是 He told me that... ✓",
          subSkill: "say_tell"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["She", "said", "that", "she", "is", "happy"],
          errorIndex: 4,
          correction: "was",
          explanation: "转述时时态要后移：is → was。She said that she was happy. ✓",
          subSkill: "tense_shift"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["He", "asked", "me", "where", "did", "I", "live"],
          errorIndex: 4,
          correction: "(delete) I lived",
          explanation: "转述疑问句用陈述句语序，不用 did。应该是 He asked me where I lived. ✓",
          subSkill: "reported_questions"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["They", "told", "that", "they", "were", "ready"],
          errorIndex: 2,
          correction: "us / said",
          explanation: "tell 后面要跟人。应该是 They told us that... 或 They said that... ✓",
          subSkill: "say_tell"
        },
        {
          type: "choice",
          instruction: "哪个句子是正确的转述？",
          sentence: "Direct: 'Are you hungry?' 选出正确的转述：",
          options: [
            "She asked me if I was hungry.",
            "She asked me was I hungry.",
            "She asked me if was I hungry.",
            "She asked me am I hungry."
          ],
          correct: 0,
          explanation: "是非问句用 if，并且用陈述句语序、时态后移（are→was）。She asked me if I was hungry. ✓",
          subSkill: "reported_questions"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["Mum", "said", "she", "would", "cook", "dinner", "now"],
          errorIndex: 6,
          correction: "then",
          explanation: "转述时 now → then。Mum said she would cook dinner then. ✓",
          subSkill: "time_place_change"
        },
        {
          type: "choice",
          instruction: "哪个句子是正确的？",
          sentence: "Direct: 'I will help you.' 选出正确的转述：",
          options: [
            "He said he will help me.",
            "He said he would help me.",
            "He told he would help me.",
            "He said he would help you."
          ],
          correct: 1,
          explanation: "转述时 will → would；'you'（说话对象是我）→ me。He said he would help me. ✓",
          subSkill: "tense_shift"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["The", "teacher", "told", "to", "open", "our", "books"],
          errorIndex: 3,
          correction: "us to",
          explanation: "tell 后面要跟人再加 to do。应该是 The teacher told us to open our books. ✓",
          subSkill: "reporting_verbs"
        }
      ],

      5: [
        {
          type: "scenario",
          instruction: "选择最合适的转述",
          context: "Your brother said to you: 'I am playing computer games.' Your mum asks what he is doing.",
          dialogue: [
            { speaker: "Mum", text: "What did your brother say?" }
          ],
          options: [
            "He said he is playing computer games.",
            "He said he was playing computer games.",
            "He said me he was playing computer games."
          ],
          correct: 1,
          explanation: "转述时 am playing → was playing；say 后面不跟人。He said he was playing computer games. ✓",
          subSkill: "tense_shift"
        },
        {
          type: "scenario",
          instruction: "选择最合适的转述",
          context: "Your friend Lily asked you: 'Can you come to my party?' Later you tell another friend.",
          dialogue: [
            { speaker: "Friend", text: "What did Lily ask you?" }
          ],
          options: [
            "She asked me if I could come to her party.",
            "She asked me can I come to her party.",
            "She told me if I could come to her party."
          ],
          correct: 0,
          explanation: "是非问句转述用 if，陈述句语序，can→could。She asked me if I could come to her party. ✓",
          subSkill: "reported_questions"
        },
        {
          type: "scenario",
          instruction: "选择最合适的转述",
          context: "Your teacher said: 'Don't forget your homework tomorrow.' You report it the next day.",
          dialogue: [
            { speaker: "Classmate", text: "What did the teacher tell us?" }
          ],
          options: [
            "She told us not to forget our homework the next day.",
            "She said us not to forget our homework tomorrow.",
            "She told not to forget our homework tomorrow."
          ],
          correct: 0,
          explanation: "tell + 人 + (not) to do；tomorrow → the next day。She told us not to forget our homework the next day. ✓",
          subSkill: "reporting_verbs"
        },
        {
          type: "choice",
          instruction: "选择正确的答案（PET 风格阅读）",
          sentence: "Read the note: Sam wrote 'I love this book. I will lend it to you tomorrow.' Reported: Sam said he ___ that book and he ___ lend it to me the next day.",
          options: [
            "loves / will",
            "loved / would",
            "love / would",
            "loved / will"
          ],
          correct: 1,
          explanation: "love → loved；will → would。Sam said he loved that book and he would lend it to me the next day. ✓",
          subSkill: "tense_shift"
        },
        {
          type: "scenario",
          instruction: "选择最合适的转述",
          context: "Your dad said to you: 'I am tired now.' You report this to your mum.",
          dialogue: [
            { speaker: "Mum", text: "What did Dad say?" }
          ],
          options: [
            "He told me he was tired then.",
            "He said me he was tired now.",
            "He told he was tired then."
          ],
          correct: 0,
          explanation: "tell + 人（me）；am→was；now→then。He told me he was tired then. ✓",
          subSkill: "time_place_change"
        },
        {
          type: "choice",
          instruction: "选择正确的答案（PET 风格）",
          sentence: "Which sentence correctly reports the question 'Where do you live?'",
          options: [
            "He asked me where do I live.",
            "He asked me where I lived.",
            "He asked me where did I live.",
            "He told me where I lived."
          ],
          correct: 1,
          explanation: "转述疑问句用陈述句语序，时态后移（do you live → I lived），用 ask 不用 tell。He asked me where I lived. ✓",
          subSkill: "reported_questions"
        },
        {
          type: "scenario",
          instruction: "选择最合适的转述",
          context: "Your friend Max said: 'I have got a new puppy!' You tell your sister.",
          dialogue: [
            { speaker: "Sister", text: "What did Max say?" }
          ],
          options: [
            "He said he has got a new puppy.",
            "He said he had got a new puppy.",
            "He told he had got a new puppy."
          ],
          correct: 1,
          explanation: "转述时现在完成时 have got → had got（时态后移）；say 后面不跟人。He said he had got a new puppy. ✓",
          subSkill: "tense_shift"
        },
        {
          type: "choice",
          instruction: "选择正确的答案（PET 风格）",
          sentence: "Complete the report: My friend asked me ___ I wanted to join the chess club, and I said I ___ love to.",
          options: [
            "that / will",
            "if / would",
            "what / would",
            "if / will"
          ],
          correct: 1,
          explanation: "是非问句转述用 if；will → would（时态后移）。asked me if I wanted... I would love to. ✓",
          subSkill: "reported_questions"
        }
      ]
    },

    mission: {
      title: "Interview Report",
      taskDescription: "假装你采访了一个人（朋友、家人或名人），然后用间接引语写一篇'采访报道'，转述他们说过的话。",
      icon: "📰",
      scaffolds: [
        {
          prefix: "I interviewed my friend. He told me that ",
          suffix: ".",
          hint: "转述朋友说的话 (tell 后跟人，时态后移)",
          grammarCheck: "reported_speech",
          example: "he loved playing basketball"
        },
        {
          prefix: "She said that ",
          suffix: ".",
          hint: "转述对方说的另一句话 (say 后不跟人，is→was)",
          grammarCheck: "reported_speech",
          example: "she was learning the guitar"
        },
        {
          prefix: "I asked him if ",
          suffix: ".",
          hint: "转述一个是非问句 (用 if，陈述句语序)",
          grammarCheck: "reported_speech",
          example: "he had any pets"
        },
        {
          prefix: "He said he would ",
          suffix: ".",
          hint: "转述对方将来要做的事 (will→would)",
          grammarCheck: "reported_speech",
          example: "visit Japan next year"
        },
        {
          prefix: "At the end, she told me that ",
          suffix: ".",
          hint: "转述采访结尾的一句话 (tell + 人 + that)",
          grammarCheck: "reported_speech",
          example: "she was very happy to talk to me"
        }
      ],
      completionMessage: "太棒了！你完成了一篇'采访报道'，间接引语转述得真出色！"
    },

    badge: {
      name: "转述大师",
      icon: "💬",
      description: "掌握了间接引语（转述）的用法"
    }
  },

  // ==================== UNIT 12 ====================
  {
    id: 12,
    title: "Articles & Quantifiers",
    description: "冠词 & 数量词",
    icon: "🛒",

    discover: {
      storyTitle: "Cooking with Grandma",
      story: "On Saturday, I helped my grandma make a cake. First, we went to the shop to buy some eggs and a bag of flour. There weren't many eggs left, so we only got a few. Grandma said we needed some sugar too, but we had a little at home already. We didn't buy any milk because there was a lot of milk in the fridge. The cake was easy to make. There aren't many cakes as tasty as my grandma's! It was the best cake I have ever eaten.",
      highlightWords: ["a cake", "the shop", "some eggs", "a bag of flour", "many eggs", "a few", "some sugar", "a little", "any milk", "a lot of milk", "the fridge", "many cakes", "the best cake"],
      questions: [
        {
          question: "The story says 'buy some eggs' but 'We didn't buy any milk'. Why does it use 'some' in one place and 'any' in another?",
          options: [
            "'some' and 'any' are exactly the same",
            "'some' is usually for positive sentences; 'any' is usually for negatives and questions",
            "'some' is for animals and 'any' is for food"
          ],
          correct: 1,
          explanation: "some 通常用于肯定句（buy some eggs）；any 通常用于否定句和疑问句（didn't buy any milk / Do you have any milk?）。",
          subSkill: "some_any"
        },
        {
          question: "The story says 'many eggs' but 'a lot of milk' (not 'many milk'). Why?",
          options: [
            "Because eggs are bigger than milk",
            "'many' is for countable nouns (eggs); 'much/a lot of' is for uncountable nouns (milk)",
            "'many' and 'much' can be used with any noun"
          ],
          correct: 1,
          explanation: "many 用于可数名词（many eggs）；much / a lot of 用于不可数名词（much milk / a lot of milk）。milk 不可数，所以不能说 many milk。",
          subSkill: "much_many"
        },
        {
          question: "Look at 'we make a cake' and 'It was the best cake'. Why does it use 'a' first and 'the' later?",
          options: [
            "'a' is for the first time we mention something; 'the' is when we already know which one",
            "'a' and 'the' mean the same thing",
            "'a' is for big things and 'the' is for small things"
          ],
          correct: 0,
          explanation: "第一次提到某事物用 a/an（a cake）；再次提到、或大家都知道是哪一个时用 the（the cake / the best cake，最高级前一定用 the）。",
          subSkill: "a_an_the"
        }
      ],
      grammarTip: "语法小贴士：a/an 第一次提到用，the 再次提到或特指用；some 用于肯定句，any 用于否定/疑问句；many/few 数可数名词，much/little 数不可数名词；a lot of 两种都行。"
    },

    practice: {
      1: [
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "I would like ___ apple, please.",
          options: ["a", "an", "the", "some"],
          correct: 1,
          explanation: "apple 以元音音开头 → 用 an。an apple ✓。",
          subSkill: "a_an_the"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "There are some apples on the table. Can you pass me ___ apple?",
          options: ["a", "an", "the", "some"],
          correct: 2,
          explanation: "前面已经提到这些苹果，特指其中的（你看得到的）那个 → 用 the。",
          subSkill: "a_an_the"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "We have ___ bread for breakfast.",
          options: ["a", "an", "some", "many"],
          correct: 2,
          explanation: "bread 不可数，肯定句中用 some。some bread ✓。",
          subSkill: "some_any"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "I don't have ___ money with me.",
          options: ["some", "any", "many", "a"],
          correct: 1,
          explanation: "否定句中用 any。I don't have any money. ✓",
          subSkill: "some_any"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "How ___ students are there in your class?",
          options: ["much", "many", "a", "little"],
          correct: 1,
          explanation: "students 可数复数 → 用 many。How many students...? ✓",
          subSkill: "much_many"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "There isn't ___ water in the bottle.",
          options: ["many", "much", "few", "a"],
          correct: 1,
          explanation: "water 不可数 → 用 much。There isn't much water. ✓",
          subSkill: "much_many"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "I have ___ friends at my new school. I'm not lonely.",
          options: ["a few", "few", "much", "a little"],
          correct: 0,
          explanation: "a few = 一些（积极的语气，可数名词）。I have a few friends. ✓ 表示有一些朋友。",
          subSkill: "few_little"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "Tom plays ___ guitar very well.",
          options: ["a", "an", "the", "some"],
          correct: 2,
          explanation: "play + the + 乐器 → play the guitar. ✓",
          subSkill: "a_an_the"
        }
      ],

      2: [
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "Would you like ___ tea?",
          options: ["any", "some", "many", "a"],
          correct: 1,
          explanation: "表示邀请/请求的疑问句中用 some。Would you like some tea? ✓",
          subSkill: "some_any"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "There is ___ milk left, so we don't need to buy more.",
          options: ["a little", "a few", "few", "many"],
          correct: 0,
          explanation: "milk 不可数；a little = 有一点（积极语气）。There is a little milk left. ✓",
          subSkill: "few_little"
        },
        {
          type: "match",
          instruction: "把名词和正确的数量词配对",
          left: ["apples", "water", "books", "sugar"],
          right: ["much", "many", "much", "many"],
          correctPairs: [[0, 1], [1, 0], [2, 3], [3, 2]],
          explanation: "可数名词（apples, books）用 many；不可数名词（water, sugar）用 much。",
          subSkill: "much_many"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "She is ___ honest girl who always tells the truth.",
          options: ["a", "an", "the", "some"],
          correct: 1,
          explanation: "honest 的 h 不发音，以元音音开头 → 用 an。an honest girl ✓。",
          subSkill: "a_an_the"
        },
        {
          type: "match",
          instruction: "把句子开头和正确的数量词配对",
          left: [
            "Do you have any...",
            "I have some...",
            "There aren't many...",
            "There isn't much..."
          ],
          right: [
            "money for the trip.",
            "questions? (negative/question)",
            "rain this summer.",
            "people at the party."
          ],
          correctPairs: [[0, 1], [1, 0], [2, 3], [3, 2]],
          explanation: "any 用于疑问句；some 用于肯定句；many 用于可数（people）；much 用于不可数（rain）。",
          subSkill: "some_any"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "We go to ___ school by bus every day.",
          options: ["a", "an", "the", "(no article)"],
          correct: 3,
          explanation: "go to school（表示上学这件事）不加冠词 → 零冠词。go to school ✓。",
          subSkill: "zero_article"
        },
        {
          type: "match",
          instruction: "把句子和正确的冠词配对",
          left: [
            "I saw ___ elephant.",
            "___ sun is very hot today.",
            "She is ___ teacher.",
            "I had ___ egg for breakfast."
          ],
          right: ["an (egg)", "an (elephant)", "a (teacher)", "The (sun)"],
          correctPairs: [[0, 1], [1, 3], [2, 2], [3, 0]],
          explanation: "元音音开头用 an（an elephant, an egg）；独一无二的事物用 the（the sun）；普通职业用 a（a teacher）。",
          subSkill: "a_an_the"
        },
        {
          type: "choice",
          instruction: "选择正确的答案",
          sentence: "I love ___ music. It makes me happy.",
          options: ["a", "an", "the", "(no article)"],
          correct: 3,
          explanation: "泛指音乐（不可数、抽象概念）→ 零冠词。I love music. ✓",
          subSkill: "zero_article"
        }
      ],

      3: [
        {
          type: "fill",
          instruction: "用 a 或 an 填空",
          sentence: "I saw ___ owl sitting in the tree last night.",
          answer: "an",
          acceptableAnswers: ["an"],
          explanation: "owl 以元音音开头 → 用 an。an owl ✓。",
          subSkill: "a_an_the"
        },
        {
          type: "fill",
          instruction: "用 some 或 any 填空",
          sentence: "There aren't ___ biscuits in the box. They're all gone!",
          answer: "any",
          acceptableAnswers: ["any"],
          explanation: "否定句中用 any。There aren't any biscuits. ✓",
          subSkill: "some_any"
        },
        {
          type: "reorder",
          instruction: "把单词排列成正确的句子",
          words: ["there", "is", "a", "lot", "of", "snow"],
          correct: "There is a lot of snow.",
          explanation: "a lot of 可用于不可数名词（snow）。There is a lot of snow. ✓",
          subSkill: "much_many"
        },
        {
          type: "fill",
          instruction: "用 much 或 many 填空",
          sentence: "How ___ sugar do you want in your tea?",
          answer: "much",
          acceptableAnswers: ["much"],
          explanation: "sugar 不可数 → 用 much。How much sugar...? ✓",
          subSkill: "much_many"
        },
        {
          type: "reorder",
          instruction: "把单词排列成正确的句子",
          words: ["I", "have", "a", "few", "good", "friends"],
          correct: "I have a few good friends.",
          explanation: "a few + 可数名词复数，表示'有一些'。I have a few good friends. ✓",
          subSkill: "few_little"
        },
        {
          type: "fill",
          instruction: "用 the 或 (no article) 填空（不填就写 x）",
          sentence: "We play ___ football in the park after school.",
          answer: "x",
          acceptableAnswers: ["x", "no article", "none", "-"],
          explanation: "play + 球类运动不加冠词 → play football（零冠词）。",
          subSkill: "zero_article"
        },
        {
          type: "reorder",
          instruction: "把单词排列成正确的句子",
          words: ["there", "is", "a", "little", "water", "left"],
          correct: "There is a little water left.",
          explanation: "a little + 不可数名词，表示'有一点'。There is a little water left. ✓",
          subSkill: "few_little"
        },
        {
          type: "fill",
          instruction: "用 a, an 或 the 填空",
          sentence: "The Earth goes around ___ Sun.",
          answer: "the",
          acceptableAnswers: ["the"],
          explanation: "太阳是独一无二的事物 → 用 the。the Sun ✓。",
          subSkill: "a_an_the"
        }
      ],

      4: [
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["I", "have", "a", "umbrella", "in", "my", "bag"],
          errorIndex: 2,
          correction: "an",
          explanation: "umbrella 以元音音开头 → 用 an，不是 a。an umbrella ✓。",
          subSkill: "a_an_the"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["There", "are", "much", "people", "in", "the", "park"],
          errorIndex: 2,
          correction: "many",
          explanation: "people 可数（复数）→ 用 many，不用 much。There are many people. ✓",
          subSkill: "much_many"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["I", "don't", "have", "some", "homework", "today"],
          errorIndex: 3,
          correction: "any",
          explanation: "否定句中用 any，不用 some。I don't have any homework. ✓",
          subSkill: "some_any"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["She", "drinks", "the", "milk", "every", "morning"],
          errorIndex: 2,
          correction: "(no article)",
          explanation: "泛指牛奶（不可数）不加 the → She drinks milk every morning. ✓（删去 the）",
          subSkill: "zero_article"
        },
        {
          type: "choice",
          instruction: "哪个句子是正确的？",
          sentence: "选出语法正确的句子：",
          options: [
            "I have a few money.",
            "I have a little money.",
            "I have few money.",
            "I have many money."
          ],
          correct: 1,
          explanation: "money 不可数，表示'有一点'用 a little。I have a little money. ✓",
          subSkill: "few_little"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["How", "much", "books", "do", "you", "have"],
          errorIndex: 1,
          correction: "many",
          explanation: "books 可数 → 用 many。How many books do you have? ✓",
          subSkill: "much_many"
        },
        {
          type: "choice",
          instruction: "哪个句子是正确的？",
          sentence: "选出语法正确的句子：",
          options: [
            "Would you like any cake?",
            "Would you like some cake?",
            "Would you like many cake?",
            "Would you like a much cake?"
          ],
          correct: 1,
          explanation: "提供/邀请时（疑问句）用 some。Would you like some cake? ✓",
          subSkill: "some_any"
        },
        {
          type: "error",
          instruction: "点击句子中的错误单词",
          sentence: ["My", "mum", "is", "a", "best", "cook", "in", "town"],
          errorIndex: 3,
          correction: "the",
          explanation: "最高级前用 the，不用 a。My mum is the best cook in town. ✓",
          subSkill: "a_an_the"
        }
      ],

      5: [
        {
          type: "scenario",
          instruction: "选择最合适的回答",
          context: "Your friend offers you a drink at their house.",
          dialogue: [
            { speaker: "Friend", text: "Would you like a drink?" }
          ],
          options: [
            "Yes, please. Can I have any orange juice?",
            "Yes, please. Can I have some orange juice?",
            "Yes, please. Can I have much orange juice?"
          ],
          correct: 1,
          explanation: "请求时用 some（即使是疑问句，表示请求/邀请用 some）。Can I have some orange juice? ✓",
          subSkill: "some_any"
        },
        {
          type: "scenario",
          instruction: "选择最合适的回答",
          context: "You are checking the fridge before going shopping.",
          dialogue: [
            { speaker: "Mum", text: "How much milk do we have?" }
          ],
          options: [
            "We have only a little milk, so we should buy more.",
            "We have only a few milk, so we should buy more.",
            "We have only many milk, so we should buy more."
          ],
          correct: 0,
          explanation: "milk 不可数 → 用 a little。We have only a little milk. ✓",
          subSkill: "few_little"
        },
        {
          type: "scenario",
          instruction: "选择最合适的回答",
          context: "Your friend asks about your weekend trip to the farm.",
          dialogue: [
            { speaker: "Friend", text: "Were there many animals at the farm?" }
          ],
          options: [
            "Yes, there were a lot of cows and sheep!",
            "Yes, there were much cows and sheep!",
            "Yes, there were a little cows and sheep!"
          ],
          correct: 0,
          explanation: "cows/sheep 可数 → 用 a lot of（或 many）。There were a lot of cows and sheep. ✓",
          subSkill: "much_many"
        },
        {
          type: "choice",
          instruction: "选择正确的答案（PET 风格阅读）",
          sentence: "Read the recipe: 'You need ___ flour, two eggs and ___ butter. Mix them in ___ bowl.'",
          options: [
            "some / a little / a",
            "many / a few / an",
            "a / much / the",
            "any / few / a"
          ],
          correct: 0,
          explanation: "flour 不可数用 some；butter 不可数用 a little；bowl 第一次提到、可数单数用 a。some flour / a little butter / a bowl ✓。",
          subSkill: "some_any"
        },
        {
          type: "scenario",
          instruction: "选择最合适的回答",
          context: "Your teacher asks about your reading habits.",
          dialogue: [
            { speaker: "Teacher", text: "How many books do you read each month?" }
          ],
          options: [
            "I read a few books, usually two or three.",
            "I read a little books, usually two or three.",
            "I read much books, usually two or three."
          ],
          correct: 0,
          explanation: "books 可数 → 用 a few（表示'几本'）。I read a few books. ✓",
          subSkill: "few_little"
        },
        {
          type: "choice",
          instruction: "选择正确的答案（PET 风格）",
          sentence: "Which sentence is correct for a shopping list note?",
          options: [
            "We need an bananas and the bottle of water.",
            "We need some bananas and a bottle of water.",
            "We need much bananas and an bottle of water.",
            "We need any bananas and a bottle of water."
          ],
          correct: 1,
          explanation: "bananas 复数肯定句用 some；bottle 第一次提到、可数单数用 a。some bananas / a bottle of water ✓。",
          subSkill: "a_an_the"
        },
        {
          type: "scenario",
          instruction: "选择最合适的回答",
          context: "You are talking about your school day.",
          dialogue: [
            { speaker: "Friend", text: "Do you walk to school?" }
          ],
          options: [
            "Yes, I go to the school on foot every day.",
            "Yes, I go to school on foot every day.",
            "Yes, I go to a school on foot every day."
          ],
          correct: 1,
          explanation: "go to school（表示上学）用零冠词，不加 the 或 a。I go to school. ✓",
          subSkill: "zero_article"
        },
        {
          type: "choice",
          instruction: "选择正确的答案（PET 风格）",
          sentence: "Complete the email: 'There is ___ fruit in the fridge but there aren't ___ vegetables. Can you buy ___ tomatoes?'",
          options: [
            "many / much / some",
            "some / many / some",
            "much / any / a",
            "a / some / many"
          ],
          correct: 1,
          explanation: "fruit 不可数肯定句用 some；vegetables 可数否定句用 many（aren't many）；tomatoes 复数请求用 some。",
          subSkill: "some_any"
        }
      ]
    },

    mission: {
      title: "My Fridge & Shopping List",
      taskDescription: "描述你冰箱里有什么，然后写一张购物清单！正确使用冠词（a/an/the）和数量词（some/any/much/many/a few/a little）。",
      icon: "🛒",
      scaffolds: [
        {
          prefix: "In my fridge, there is ",
          suffix: ".",
          hint: "写一样不可数的食物 (用 some + 不可数名词)",
          grammarCheck: "articles",
          example: "some milk and some cheese"
        },
        {
          prefix: "There are ",
          suffix: " in the fridge too.",
          hint: "写一些可数的食物 (用 a few / a lot of + 复数)",
          grammarCheck: "articles",
          example: "a few eggs and a lot of apples"
        },
        {
          prefix: "There isn't much ",
          suffix: " left.",
          hint: "写一样快用完的不可数食物 (much + 不可数)",
          grammarCheck: "articles",
          example: "butter"
        },
        {
          prefix: "For my shopping list, I need to buy ",
          suffix: ".",
          hint: "写购物清单上的东西 (用 some / a / an)",
          grammarCheck: "articles",
          example: "some bread, an orange and a bottle of juice"
        },
        {
          prefix: "We don't have any ",
          suffix: ", so I must buy more.",
          hint: "写一样冰箱里没有的东西 (否定句用 any)",
          grammarCheck: "articles",
          example: "tomatoes"
        }
      ],
      completionMessage: "太棒了！你完成了'冰箱和购物清单'，冠词和数量词用得真准确！"
    },

    badge: {
      name: "量词专家",
      icon: "🛒",
      description: "掌握了冠词和数量词的用法"
    }
  }
];
