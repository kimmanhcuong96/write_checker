export type PracticeCategory = "GENERAL" | "IELTS";
export type PracticeTopic = { id: string; category: PracticeCategory; title: string; prompt: string; active: boolean };

const generalSubjects = [
  "the value of daily reading", "remote work", "public transport", "learning from failure", "healthy routines", "online privacy", "volunteering", "teamwork", "a memorable journey", "city parks",
  "part-time jobs", "digital minimalism", "saving money", "creative hobbies", "school uniforms", "living abroad", "social media", "community events", "time management", "cooking at home",
  "advertising", "sleep and productivity", "local businesses", "the value of patience", "learning a language", "neighbourhood safety", "pets", "music and concentration", "recycling", "good leadership",
  "travel planning", "public libraries", "sports at school", "friendship", "news sources", "art in public spaces", "healthy food", "career changes", "weather and mood", "helping neighbours",
  "the four-day work week", "childhood memories", "inventions", "personal goals", "consumer choices", "examinations", "work-life balance", "traditional festivals", "being punctual", "photography",
  "mobile phones", "mountain trips", "learning outdoors", "rules in society", "free time", "small acts of kindness", "fashion", "handwritten notes", "workplace communication", "environmental education",
  "community gardens", "famous people", "libraries and technology", "confidence", "healthy cities", "learning through games", "a useful app", "the future of shopping", "family traditions", "a difficult decision"
] as const;

export const GENERAL_TOPICS: readonly PracticeTopic[] = generalSubjects.map((subject, index) => ({
  id: `general-${String(index + 1).padStart(2, "0")}`,
  category: "GENERAL",
  title: `Writing about ${subject}`,
  prompt: `Write an English response about ${subject}. Explain your ideas clearly and support them with reasons or examples.`,
  active: true
}));

const ieltsPrompts = [
  "Some people think university education should be free for everyone. To what extent do you agree or disagree?",
  "Many people work from home today. Discuss the advantages and disadvantages.",
  "Some believe technology makes life more complicated. Discuss both views and give your opinion.",
  "Traffic congestion is a serious problem in many cities. What causes it and what solutions are possible?",
  "Children should learn how to manage money at school. Do you agree or disagree?",
  "People spend less time with their families than in the past. Why is this and is it positive or negative?",
  "The best way to reduce crime is to give longer prison sentences. To what extent do you agree?",
  "Some people prefer to live in a house, while others prefer an apartment. Discuss both views.",
  "International tourism creates tension rather than understanding. Do the advantages outweigh the disadvantages?",
  "Advertising encourages us to buy things we do not need. Do you agree or disagree?",
  "Schools should teach practical skills such as cooking and personal finance. Discuss your view.",
  "A growing number of people use online courses instead of attending college. Is this a positive development?",
  "Governments should invest more in public transport than in roads. Discuss both views and give your opinion.",
  "Some people think museums should be entertaining, while others think their purpose is education. Discuss both views.",
  "People now change jobs more frequently than before. What are the reasons and effects?",
  "The best way to learn a foreign language is to live in the country where it is spoken. Do you agree?",
  "Some people believe that news media influence how people think. Is this a positive or negative influence?",
  "Many traditional customs are disappearing. Why is this happening and should they be preserved?",
  "It is better to prevent illness through healthy lifestyles than to rely on medicine. Discuss.",
  "Some people think success is measured by wealth, while others value different achievements. Discuss both views.",
  "More people are choosing to live alone. What are the reasons and is this a positive or negative trend?",
  "Schools should focus on academic success rather than practical skills. To what extent do you agree?",
  "Climate change can only be solved by international cooperation. Do you agree or disagree?",
  "Some people prefer to watch live performances, while others prefer recorded entertainment. Discuss both views.",
  "The advantages of being famous outweigh the disadvantages. To what extent do you agree?",
  "Governments should make public transport free. What are the advantages and disadvantages?",
  "Many young people move to cities for work. What problems can this cause and how can they be solved?",
  "People should choose a job they enjoy rather than one with a high salary. Discuss both views.",
  "Some believe history has little to teach us. To what extent is this true?",
  "The best way to improve health is to exercise regularly. Discuss other measures and give your opinion."
] as const;

export const IELTS_TOPICS: readonly PracticeTopic[] = ieltsPrompts.map((prompt, index) => ({ id: `ielts-${String(index + 1).padStart(2, "0")}`, category: "IELTS", title: `IELTS topic ${index + 1}`, prompt, active: true }));
export const PRACTICE_TOPICS = [...GENERAL_TOPICS, ...IELTS_TOPICS] as const;

export const topicsForCategory = (category: PracticeCategory) => PRACTICE_TOPICS.filter((topic) => topic.category === category && topic.active);
export const randomTopic = (category: PracticeCategory, random = Math.random) => {
  const topics = topicsForCategory(category);
  return topics[Math.floor(random() * topics.length)] ?? null;
};

export type ExamTask = {
  id: string;
  questionNumber: number;
  taskType: string;
  prompt: string;
  wordMinimum?: number;
  recommendedSeconds?: number;
  visualDescription?: string;
  visualAsset?: string;
  providedWords?: readonly [string, string];
};

const academicTask1Pool: readonly ExamTask[] = [
  {
    id: "ielts-academic-task1-energy",
    questionNumber: 1,
    taskType: "IELTS_ACADEMIC_TASK_1",
    prompt: "Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    visualDescription: "Grouped bar chart data — households using each energy source: electricity 2000: 72%, 2020: 91%; natural gas 2000: 48%, 2020: 57%; solar 2000: 4%, 2020: 26%; coal 2000: 31%, 2020: 12%; oil 2000: 22%, 2020: 9%.",
    wordMinimum: 150,
    recommendedSeconds: 1200
  },
  {
    id: "ielts-academic-task1-commute",
    questionNumber: 1,
    taskType: "IELTS_ACADEMIC_TASK_1",
    prompt: "Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    visualDescription: "Table data — average daily commute in minutes: Northville 2005: 28, 2015: 34, 2025: 39; Easton 2005: 41, 2015: 38, 2025: 35; Lakeside 2005: 22, 2015: 25, 2025: 27.",
    wordMinimum: 150,
    recommendedSeconds: 1200
  }
];

const generalTask1Pool: readonly ExamTask[] = [
  {
    id: "ielts-general-task1-library",
    questionNumber: 1,
    taskType: "IELTS_GENERAL_TASK_1",
    prompt: "You recently used a local library and were disappointed with some of its facilities. Write a letter to the library manager. In your letter: describe the problems you experienced; explain how they affected your visit; suggest two improvements.",
    wordMinimum: 150,
    recommendedSeconds: 1200
  },
  {
    id: "ielts-general-task1-neighbour",
    questionNumber: 1,
    taskType: "IELTS_GENERAL_TASK_1",
    prompt: "You will be away from home for two weeks and a neighbour has agreed to help. Write a letter to your neighbour. In your letter: thank them; explain how to care for your home and plants; give details about how to contact you.",
    wordMinimum: 150,
    recommendedSeconds: 1200
  }
];

const taskFromPool = <T>(pool: readonly T[], random: () => number): T => pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))]!;

export const createIeltsTasks = (variant: "IELTS_ACADEMIC" | "IELTS_GENERAL", random = Math.random): readonly ExamTask[] => {
  const task1 = taskFromPool(variant === "IELTS_ACADEMIC" ? academicTask1Pool : generalTask1Pool, random);
  const topic = taskFromPool(IELTS_TOPICS, random);
  return [task1, { id: `${variant.toLowerCase()}-${topic.id}`, questionNumber: 2, taskType: "IELTS_TASK_2", prompt: topic.prompt, wordMinimum: 250, recommendedSeconds: 2400 }];
};

export const IELTS_TASKS = {
  ACADEMIC: createIeltsTasks("IELTS_ACADEMIC", () => 0),
  GENERAL: createIeltsTasks("IELTS_GENERAL", () => 0)
} as const;
export const TOEIC_TASKS: readonly ExamTask[] = [
  { id: "toeic-1", questionNumber: 1, taskType: "TOEIC_PICTURE_SENTENCE", prompt: "Write one sentence about the picture using both words.", visualDescription: "A librarian places books on a tall shelf while a visitor reads nearby.", visualAsset: "/exam-assets/toeic-library.svg", providedWords: ["arranging", "shelf"] },
  { id: "toeic-2", questionNumber: 2, taskType: "TOEIC_PICTURE_SENTENCE", prompt: "Write one sentence about the picture using both words.", visualDescription: "Two workers wearing safety helmets look at a large blueprint.", visualAsset: "/exam-assets/toeic-construction.svg", providedWords: ["plans", "beside"] },
  { id: "toeic-3", questionNumber: 3, taskType: "TOEIC_PICTURE_SENTENCE", prompt: "Write one sentence about the picture using both words.", visualDescription: "Several customers queue while a vendor prepares food.", visualAsset: "/exam-assets/toeic-food-stall.svg", providedWords: ["waiting", "while"] },
  { id: "toeic-4", questionNumber: 4, taskType: "TOEIC_PICTURE_SENTENCE", prompt: "Write one sentence about the picture using both words.", visualDescription: "A cyclist rides across a bridge with the city skyline behind him.", visualAsset: "/exam-assets/toeic-cyclist.svg", providedWords: ["across", "morning"] },
  { id: "toeic-5", questionNumber: 5, taskType: "TOEIC_PICTURE_SENTENCE", prompt: "Write one sentence about the picture using both words.", visualDescription: "Four colleagues discuss a document in a conference room.", visualAsset: "/exam-assets/toeic-meeting.svg", providedWords: ["meeting", "document"] },
  { id: "toeic-6", questionNumber: 6, taskType: "TOEIC_WRITTEN_REQUEST", prompt: "From: Events Manager. Subject: Workshop registration. We received your registration, but your preferred workshop is full. Please reply with two alternative workshop choices and ask one question about the event schedule.", recommendedSeconds: 600 },
  { id: "toeic-7", questionNumber: 7, taskType: "TOEIC_WRITTEN_REQUEST", prompt: "From: Customer Support. Subject: Delayed office chair delivery. We apologize that your order will arrive five days late. Please tell us whether you want to keep or cancel the order and suggest one way we can resolve the inconvenience.", recommendedSeconds: 600 },
  { id: "toeic-8", questionNumber: 8, taskType: "TOEIC_OPINION_ESSAY", prompt: "Do you agree or disagree that companies should allow employees to choose their own working hours? Support your opinion with specific reasons and examples.", wordMinimum: 300 }
];
