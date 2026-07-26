export type Phase = {
  id: number;
  title: string;
  subtitle: string;
  monthStart: number;
  monthEnd: number;
  goals: string[];
  topics: string[];
  checkpointItems: { label: string; done: boolean }[];
  color: string;
};

export type DsaTopic = {
  id: string;
  name: string;
  phaseId: number;
  targetCount: number;
  sheetRef?: string;
};

export type Habit = {
  id: number;
  name: string;
  icon: string;
};

export type Milestone = {
  monthNumber: number;
  phaseId: number;
  description: string;
};

export const PHASES: Phase[] = [
  {
    id: 1,
    title: "Ship things, don't just watch tutorials",
    subtitle: "Web fundamentals + DSA foundations",
    monthStart: 1,
    monthEnd: 3,
    goals: [
      "Build and deploy at least 2 JS projects",
      "Git workflow becomes natural",
      "100–150 DSA problems across core topics",
      "Daily rhythm established",
    ],
    topics: ["Arrays & Hashing", "Strings", "Two Pointer / Sliding Window", "Recursion basics", "Sorting & Searching"],
    checkpointItems: [
      { label: "Portfolio v1 live on the internet", done: false },
      { label: "Git workflow: branch, PR, merge feels natural", done: false },
      { label: "30+ DSA problems logged across core topics", done: false },
      { label: "2 JS projects shipped (not just started)", done: false },
      { label: "Daily habit log shows 3+ weeks consistent", done: false },
    ],
    color: "#3FA793",
  },
  {
    id: 2,
    title: "React ecosystem, backend basics, intermediate DSA",
    subtitle: "Full-stack foundations",
    monthStart: 4,
    monthEnd: 6,
    goals: [
      "First full-stack app deployed with auth",
      "First hackathon completed",
      "250–300 DSA problems cumulative",
      "First merged OSS PRs",
    ],
    topics: ["Recursion & Backtracking (adv.)", "Binary Search patterns", "Linked List", "Stack & Queue"],
    checkpointItems: [
      { label: "Full-stack app with auth deployed", done: false },
      { label: "First hackathon completed", done: false },
      { label: "250–300 DSA cumulative", done: false },
      { label: "First merged open-source PR", done: false },
      { label: "React components feel idiomatic", done: false },
    ],
    color: "#D6A24C",
  },
  {
    id: 3,
    title: "Full-stack depth + AI foundations begin",
    subtitle: "Docker, cloud, first ML model",
    monthStart: 7,
    monthEnd: 9,
    goals: [
      "Docker + cloud deploy done",
      "NumPy / Pandas comfortable",
      "First ML model trained and evaluated",
      "400–450 DSA problems cumulative",
    ],
    topics: ["Trees & BST", "Heap", "Trie", "Graphs BFS/DFS", "Greedy", "DP 1D / Knapsack"],
    checkpointItems: [
      { label: "Docker + cloud deploy working", done: false },
      { label: "NumPy / Pandas comfortable", done: false },
      { label: "First ML model trained and evaluated", done: false },
      { label: "Second hackathon done", done: false },
      { label: "400–450 DSA cumulative", done: false },
    ],
    color: "#6E7EBB",
  },
  {
    id: 4,
    title: "The internship push",
    subtitle: "Resume polish, mock interviews, active applications",
    monthStart: 10,
    monthEnd: 12,
    goals: [
      "Resume/portfolio/GitHub polished",
      "Mock interviews underway",
      "600+ DSA cumulative",
      "Actively interviewing",
    ],
    topics: ["DP 2D / Strings", "Graphs Advanced", "Segment Tree", "Disjoint Set", "Backtracking Advanced"],
    checkpointItems: [
      { label: "Resume + portfolio + GitHub all polished", done: false },
      { label: "Mock interviews running regularly", done: false },
      { label: "600+ DSA cumulative", done: false },
      { label: "Actively applying to internships", done: false },
    ],
    color: "#C4675A",
  },
  {
    id: 5,
    title: "AI/GenAI depth + game dev intensive",
    subtitle: "Daily trailer production begins",
    monthStart: 13,
    monthEnd: 18,
    goals: [
      "PyTorch fundamentals solid",
      "Transformers understood conceptually",
      "First RAG/agent project shipped",
      "Playable game core loop",
    ],
    topics: ["Transformers", "RAG systems", "LLM fine-tuning", "Game dev (Unity/Blender)", "Agent architectures"],
    checkpointItems: [
      { label: "RAG / agent project shipped", done: false },
      { label: "Playable game core loop exists", done: false },
      { label: "Hackathon results noticeably improving", done: false },
      { label: "PyTorch fundamentals solid", done: false },
    ],
    color: "#9B72CF",
  },
  {
    id: 6,
    title: "Systems depth + capstone + final placement readiness",
    subtitle: "Trailer due end of month 24",
    monthStart: 19,
    monthEnd: 24,
    goals: [
      "Capstone substantially complete",
      "Distributed systems fundamentals done",
      "Final resume/portfolio refresh",
      "Trailer finished and shippable",
    ],
    topics: ["Distributed systems", "System design", "Capstone project", "Trailer post-production"],
    checkpointItems: [
      { label: "Capstone substantially complete", done: false },
      { label: "Distributed systems fundamentals done", done: false },
      { label: "Mock design interviews running", done: false },
      { label: "Trailer finished and shippable", done: false },
      { label: "Placement-season ready", done: false },
    ],
    color: "#D6A24C",
  },
];

export const DSA_TOPICS: DsaTopic[] = [
  { id: "arrays-hashing", name: "Arrays & Hashing", phaseId: 1, targetCount: 45 },
  { id: "strings", name: "Strings", phaseId: 1, targetCount: 22 },
  { id: "two-pointer", name: "Two Pointer / Sliding Window", phaseId: 1, targetCount: 22 },
  { id: "recursion-basics", name: "Recursion Basics", phaseId: 1, targetCount: 18 },
  { id: "sorting-searching", name: "Sorting & Searching", phaseId: 1, targetCount: 18 },
  { id: "recursion-backtracking", name: "Recursion & Backtracking (adv.)", phaseId: 2, targetCount: 18 },
  { id: "binary-search", name: "Binary Search Patterns", phaseId: 2, targetCount: 18 },
  { id: "linked-list", name: "Linked List", phaseId: 2, targetCount: 22 },
  { id: "stack-queue", name: "Stack & Queue", phaseId: 2, targetCount: 18 },
  { id: "trees-bst", name: "Trees & BST", phaseId: 3, targetCount: 32 },
  { id: "heap", name: "Heap", phaseId: 3, targetCount: 14 },
  { id: "trie", name: "Trie", phaseId: 3, targetCount: 9 },
  { id: "graphs-bfs-dfs", name: "Graphs BFS/DFS", phaseId: 3, targetCount: 22 },
  { id: "greedy", name: "Greedy", phaseId: 3, targetCount: 14 },
  { id: "dp-1d", name: "DP 1D / Knapsack", phaseId: 3, targetCount: 22 },
  { id: "dp-2d", name: "DP 2D / Strings", phaseId: 4, targetCount: 22 },
  { id: "graphs-advanced", name: "Graphs Advanced", phaseId: 4, targetCount: 18 },
  { id: "segment-tree", name: "Segment Tree", phaseId: 4, targetCount: 9 },
  { id: "disjoint-set", name: "Disjoint Set", phaseId: 4, targetCount: 9 },
  { id: "backtracking-adv", name: "Backtracking Advanced", phaseId: 4, targetCount: 11 },
];

export const HABITS: Habit[] = [
  { id: 1, name: "Morning run", icon: "🏃" },
  { id: 2, name: "DSA block", icon: "💻" },
  { id: 3, name: "Build block", icon: "🔨" },
  { id: 4, name: "Badminton", icon: "🏸" },
  { id: 5, name: "Sleep by 11", icon: "🌙" },
];

export const MILESTONES: Milestone[] = [
  { monthNumber: 1, phaseId: 1, description: "Portfolio v1 live, git workflow natural, 30+ DSA" },
  { monthNumber: 2, phaseId: 1, description: "2 JS projects shipped, 70+ DSA cumulative" },
  { monthNumber: 3, phaseId: 1, description: "Phase 1 checkpoint cleared, 100–150 DSA, daily rhythm automatic" },
  { monthNumber: 4, phaseId: 2, description: "First React components, first backend API locally" },
  { monthNumber: 5, phaseId: 2, description: "Full-stack app deployed with auth, first hackathon done" },
  { monthNumber: 6, phaseId: 2, description: "Phase 2 checkpoint cleared, ~250–300 DSA, first merged OSS PRs" },
  { monthNumber: 7, phaseId: 3, description: "Docker + cloud deploy done, NumPy/Pandas comfortable" },
  { monthNumber: 8, phaseId: 3, description: "First ML model trained and evaluated, second hackathon done" },
  { monthNumber: 9, phaseId: 3, description: "Phase 3 checkpoint cleared, ~400–450 DSA" },
  { monthNumber: 10, phaseId: 4, description: "Resume/portfolio/GitHub polished, applications open" },
  { monthNumber: 11, phaseId: 4, description: "Mock interviews underway, DSA revision pass in progress" },
  { monthNumber: 12, phaseId: 4, description: "Phase 4 checkpoint cleared, ~600+ DSA, actively interviewing" },
  { monthNumber: 13, phaseId: 5, description: "Internship outcome known, PyTorch fundamentals started" },
  { monthNumber: 14, phaseId: 5, description: "Transformers understood conceptually, not just used" },
  { monthNumber: 15, phaseId: 5, description: "First RAG/agent project scoped and started" },
  { monthNumber: 16, phaseId: 5, description: "Game dev engine chosen, team roles set, core mechanic prototyped" },
  { monthNumber: 17, phaseId: 5, description: "RAG/agent project shipped, playable core loop for the game" },
  { monthNumber: 18, phaseId: 5, description: "Phase 5 checkpoint cleared, hackathon results improving" },
  { monthNumber: 19, phaseId: 6, description: "Game polish underway or startup MVP scoping begins" },
  { monthNumber: 20, phaseId: 6, description: "Capstone direction locked, trailer rough cut done" },
  { monthNumber: 21, phaseId: 6, description: "Distributed systems fundamentals, mock design interviews" },
  { monthNumber: 22, phaseId: 6, description: "Capstone substantially complete" },
  { monthNumber: 23, phaseId: 6, description: "Final resume/portfolio refresh, DSA + system design revision" },
  { monthNumber: 24, phaseId: 6, description: "Placement-season ready, trailer finished and shippable" },
];

export const TRAILER_STAGES = [
  { id: "pre-prod", label: "PRE-PROD", active: true },
  { id: "weekend", label: "WEEKEND", active: true },
  { id: "paused", label: "PAUSED", active: false },
  { id: "daily-prod", label: "DAILY PROD", active: true },
  { id: "rough-cut", label: "ROUGH CUT", active: false },
  { id: "finished", label: "FINISHED", active: false },
];

export const SAMPLE_QUOTES = [
  "The unfinished game is still a promise. Ship the next scene.",
  "A problem logged is a problem half-owned.",
  "The route doesn't care about your mood. Keep walking.",
  "Craft is the accumulation of ordinary days.",
  "Arjuna did not hesitate at the bowstring. Neither should you.",
  "Build the thing that scares you a little.",
  "Consistency over intensity. Always.",
  "The map is not the territory — ship and see.",
  "Every checkpoint cleared is ground you cannot lose.",
  "The trailer exists in the future only if you work in the present.",
];
