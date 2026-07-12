// EvidenceHub Media Factory (EMF) — Viral Hook Library
//
// A reusable bank of short-form video OPENING HOOKS, distilled from the
// first-line patterns of high-performing health videos on TikTok / YouTube
// Shorts / Xiaohongshu.
//
// Design principle (validated by growth review 2026-07-09):
//   Platforms promote  Emotion + Curiosity + Evidence  — in that ORDER.
//   Evidence must come LAST, never in the first second.
//   The old pipeline opened with a knowledge-type claim ("Can walnuts fix
//   your sleep?"). That reads like a paper abstract, not a video. These hooks
//   lead with feeling, surprise, or a personal stake so retention holds.
//
// Usage in the pipeline:
//   const hook = pickViralHook(item, { pillar });
//   script.hook = hook;   // overrides the LLM's knowledge-type hook
//
// Templates may contain `{item}` (filled with the topic, e.g. "kiwi",
// "magnesium", "a morning walk"). Hooks without `{item}` are generic and
// safe for any topic (use them for abstract pillars like sleep-myths).

export type HookCategory =
  | "curiosity"
  | "personal_experiment"
  | "contrarian"
  | "emotional"
  | "story"
  | "authority"
  | "list";

export interface HookTemplate {
  id: string;
  category: HookCategory;
  /** Hook text. May contain `{item}`. */
  template: string;
  /** True if the template needs an item name to read naturally. */
  needsItem: boolean;
}

export const VIRAL_HOOKS: HookTemplate[] = [
  // ---------------------------------------------------------------- curiosity
  { id: "cur-1", category: "curiosity", template: "Nobody told me this about {item}.", needsItem: true },
  { id: "cur-2", category: "curiosity", template: "The reason you're not sleeping might surprise you.", needsItem: false },
  { id: "cur-3", category: "curiosity", template: "You've been sleeping wrong this whole time.", needsItem: false },
  { id: "cur-4", category: "curiosity", template: "This one habit changed how fast I fall asleep.", needsItem: false },
  { id: "cur-5", category: "curiosity", template: "3 things that help you sleep faster — the last one is {item}.", needsItem: true },
  { id: "cur-6", category: "curiosity", template: "Why does {item} make people sleep like a rock?", needsItem: true },
  { id: "cur-7", category: "curiosity", template: "Stop scrolling — this is the sleep tip nobody shares.", needsItem: false },
  { id: "cur-8", category: "curiosity", template: "I went down a rabbit hole about {item} and sleep. Here's the truth.", needsItem: true },
  { id: "cur-9", category: "curiosity", template: "The sleep hack that's hiding in your kitchen: {item}.", needsItem: true },
  { id: "cur-10", category: "curiosity", template: "This tiny change fixed my sleep in days.", needsItem: false },

  // ------------------------------------------------------- personal_experiment
  { id: "exp-1", category: "personal_experiment", template: "I tried {item} for 7 nights. Here's what happened.", needsItem: true },
  { id: "exp-2", category: "personal_experiment", template: "I ate {item} every night for a week. My sleep tracker told the story.", needsItem: true },
  { id: "exp-3", category: "personal_experiment", template: "I tested {item} for sleep so you don't have to.", needsItem: true },
  { id: "exp-4", category: "personal_experiment", template: "I did this every morning for a month. My sleep score exploded.", needsItem: false },
  { id: "exp-5", category: "personal_experiment", template: "My sleep app said I was broken. Then I tried {item}.", needsItem: true },
  { id: "exp-6", category: "personal_experiment", template: "I stopped taking sleep supplements and did this instead.", needsItem: false },
  { id: "exp-7", category: "personal_experiment", template: "30 days of {item} — my insomnia didn't stand a chance.", needsItem: true },
  { id: "exp-8", category: "personal_experiment", template: "I filmed my sleep for a week after adding {item}.", needsItem: true },

  // ------------------------------------------------------------- contrarian
  { id: "con-1", category: "contrarian", template: "You've been told you need 8 hours. That's not the whole story.", needsItem: false },
  { id: "con-2", category: "contrarian", template: "Everyone says {item} is overrated. The studies say otherwise.", needsItem: true },
  { id: "con-3", category: "contrarian", template: "Your sleep tracker is lying to you about this.", needsItem: false },
  { id: "con-4", category: "contrarian", template: "The '8 hours' rule is a myth. Here's what actually matters.", needsItem: false },
  { id: "con-5", category: "contrarian", template: "We've been told {item} helps sleep. The real answer is messier.", needsItem: true },
  { id: "con-6", category: "contrarian", template: "Forget melatonin. This works differently.", needsItem: false },
  { id: "con-7", category: "contrarian", template: "Doctors won't tell you this about falling asleep faster.", needsItem: false },
  { id: "con-8", category: "contrarian", template: "The supplement industry got {item} all wrong.", needsItem: true },

  // --------------------------------------------------------------- emotional
  { id: "emo-1", category: "emotional", template: "I wish I knew this about sleep years ago.", needsItem: false },
  { id: "emo-2", category: "emotional", template: "If you lie awake at 3am, watch this.", needsItem: false },
  { id: "emo-3", category: "emotional", template: "To anyone who can't turn their brain off at night.", needsItem: false },
  { id: "emo-4", category: "emotional", template: "This broke my heart — and fixed my sleep.", needsItem: false },
  { id: "emo-5", category: "emotional", template: "My mom's insomnia vanished after this one change.", needsItem: false },
  { id: "emo-6", category: "emotional", template: "I almost gave up on sleeping well. Then {item}.", needsItem: true },
  { id: "emo-7", category: "emotional", template: "The nights I couldn't sleep ended when I tried this.", needsItem: false },
  { id: "emo-8", category: "emotional", template: "Please show this to the person who can't sleep.", needsItem: false },

  // ------------------------------------------------------------------- story
  { id: "sto-1", category: "story", template: "I thought this was fake — until I read the studies.", needsItem: false },
  { id: "sto-2", category: "story", template: "A researcher stumbled on this by accident.", needsItem: false },
  { id: "sto-3", category: "story", template: "My grandma was right about {item} all along.", needsItem: true },
  { id: "sto-4", category: "story", template: "This started as a Reddit thread. Then scientists looked into it.", needsItem: false },
  { id: "sto-5", category: "story", template: "The weird trick an old sleep lab used on patients.", needsItem: false },
  { id: "sto-6", category: "story", template: "I laughed at {item} for sleep — then the data changed my mind.", needsItem: true },
  { id: "sto-7", category: "story", template: "The night my sleep finally made sense.", needsItem: false },

  // ---------------------------------------------------------------- authority
  { id: "aut-1", category: "authority", template: "Scientists didn't expect this from {item}.", needsItem: true },
  { id: "aut-2", category: "authority", template: "This surprised sleep researchers.", needsItem: false },
  { id: "aut-3", category: "authority", template: "A 2024 study found something wild about morning light.", needsItem: false },
  { id: "aut-4", category: "authority", template: "Researchers wanted to know why {item} works. They found this.", needsItem: true },
  { id: "aut-5", category: "authority", template: "Doctors finally explained why this fixes sleep.", needsItem: false },
  { id: "aut-6", category: "authority", template: "The study on {item} and sleep is bigger than people think.", needsItem: true },
  { id: "aut-7", category: "authority", template: "A sleep scientist told me the truth about falling asleep fast.", needsItem: false },

  // --------------------------------------------------------------------- list
  { id: "lis-1", category: "list", template: "3 foods that help you sleep faster (number 2 is {item}).", needsItem: true },
  { id: "lis-2", category: "list", template: "5 sleep mistakes you're making tonight.", needsItem: false },
  { id: "lis-3", category: "list", template: "4 things that beat melatonin for sleep.", needsItem: false },
  { id: "lis-4", category: "list", template: "2 minutes a day — that's all {item} took to work.", needsItem: true },
  { id: "lis-5", category: "list", template: "The 3-step routine that finally gave me deep sleep.", needsItem: false },
  { id: "lis-6", category: "list", template: "Stop doing these 3 things before bed.", needsItem: false },
];

/** Map a content pillar to the hook categories that fit it best. */
const PILLAR_PREFERENCE: Record<string, HookCategory[]> = {
  "sleep-myths": ["contrarian", "emotional", "curiosity", "story"],
  foods: ["personal_experiment", "curiosity", "story", "list"],
  supplements: ["personal_experiment", "curiosity", "authority", "contrarian"],
  exercise: ["personal_experiment", "story", "curiosity", "authority"],
  habits: ["personal_experiment", "emotional", "contrarian", "curiosity"],
  bedroom: ["curiosity", "personal_experiment", "story"],
  devices: ["curiosity", "contrarian", "story"],
  "sleep-science": ["authority", "curiosity", "story"],
};

export function fillHook(template: string, item: string): string {
  return template.replace(/\{item\}/g, item);
}

/**
 * Pick a viral-style hook for a topic.
 *
 * @param item    Topic name, e.g. "kiwi", "magnesium", "morning walk".
 * @param opts.pillar  Content pillar used to bias category selection.
 * @param opts.rng     Injectable RNG for deterministic tests (default Math.random).
 */
export function pickViralHook(
  item: string,
  opts: { pillar?: string; rng?: () => number } = {}
): string {
  const rng = opts.rng ?? Math.random;
  const itemLabel = item.trim();

  const prefs = (opts.pillar && PILLAR_PREFERENCE[opts.pillar]) || [
    "curiosity",
    "personal_experiment",
    "emotional",
    "story",
    "authority",
    "contrarian",
    "list",
  ];

  // Build a category-ordered candidate pool. Prefer item-filled hooks when an
  // item is available; fall back to generic hooks so abstract topics still work.
  const hasItem = itemLabel.length > 0;
  const pool: HookTemplate[] = [];
  for (const cat of prefs) {
    const matches = VIRAL_HOOKS.filter((h) => h.category === cat);
    if (hasItem) {
      pool.push(...matches.filter((h) => h.needsItem));
      pool.push(...matches.filter((h) => !h.needsItem));
    } else {
      pool.push(...matches.filter((h) => !h.needsItem));
    }
  }
  // Safety net: if pool is empty (no matches), use everything.
  const finalPool = pool.length ? pool : VIRAL_HOOKS;

  const chosen = finalPool[Math.floor(rng() * finalPool.length)];
  return fillHook(chosen.template, itemLabel);
}
