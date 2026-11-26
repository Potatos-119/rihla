import type { Interest } from '../data/places'
import type { Prefs } from './planner'

export interface Understood {
  /** what the app took from the sentence */
  label: string
  /** the words that triggered it */
  evidence: string
}

const INTEREST_WORDS: [Interest, RegExp][] = [
  ['heritage', /\b(histor\w*|heritage|culture|cultural|museums?|forts?|unesco|old|ancient|mosques?|pearl\w*|dilmun)\b/i],
  ['food', /\b(food\w*|eat\w*|restaurants?|breakfast|lunch|dinner|cafes?|café|seafood|halwa|machboos|hungry)\b/i],
  ['nature', /\b(nature|desert|wildlife|animals?|outdoors?|tree of life|hik\w*|dunes?)\b/i],
  ['sea', /\b(sea|beach\w*|swim\w*|coast\w*|water|lagoon|boat\w*|sunsets?)\b/i],
  ['modern', /\b(modern|architecture|skyline|towers?|f1|formula|circuit|racing|cars?)\b/i],
  ['family', /\b(kids?|children|family|families|son|daughter|toddlers?)\b/i],
  ['shopping', /\b(shop\w*|souqs?|souks?|malls?|markets?|gold|souvenirs?)\b/i],
  ['crafts', /\b(crafts?|pottery|art|arts|artisans?|handmade|galler\w*|weaving)\b/i],
]

const NUM: Record<string, number> = { one: 1, two: 2, three: 3, a: 1, single: 1 }

export function parseRequest(text: string, base: Prefs): { prefs: Prefs; understood: Understood[] } {
  const prefs: Prefs = { ...base }
  const understood: Understood[] = []
  const t = text.toLowerCase()

  const days = t.match(/\b(\d|one|two|three|a|single)[\s-]*(day|days|night|nights)\b/)
  if (days) {
    const n = Math.min(3, Math.max(1, NUM[days[1]] ?? Number(days[1])))
    prefs.days = n
    understood.push({ label: `${n} day${n > 1 ? 's' : ''}`, evidence: days[0] })
  } else if (/\bweekend\b/.test(t)) {
    prefs.days = 2
    prefs.weekday = 5
    understood.push({ label: '2 days, starting Friday', evidence: 'weekend' })
  } else if (/\b(today|afternoon|evening)\b/.test(t)) {
    prefs.days = 1
    understood.push({ label: '1 day', evidence: t.match(/\b(today|afternoon|evening)\b/)![0] })
  }

  const wd = t.match(/\b(sun|mon|tue|wed|thu|fri|sat)[a-z]*day\b/)
  if (wd) {
    prefs.weekday = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(wd[1])
    understood.push({ label: `Starting ${wd[0][0].toUpperCase()}${wd[0].slice(1)}`, evidence: wd[0] })
  }

  const found: Interest[] = []
  for (const [interest, re] of INTEREST_WORDS) {
    const m = t.match(re)
    if (m) {
      found.push(interest)
      understood.push({
        label: interest === 'family' ? 'Travelling with kids' : `Interested in ${interest === 'sea' ? 'the sea' : interest}`,
        evidence: m[0],
      })
    }
  }
  if (found.length) prefs.interests = found.filter((i) => i !== 'family')
  if (found.includes('family')) prefs.kids = true
  if (!prefs.interests.length) prefs.interests = base.interests

  if (/\b(free|no money|broke|zero budget)\b/.test(t)) {
    prefs.budget = 'free'
    understood.push({ label: 'Free places only', evidence: t.match(/\b(free|no money|broke|zero budget)\b/)![0] })
  } else if (/\b(cheap|budget|student|affordable|low cost|not expensive)\b/.test(t)) {
    prefs.budget = 'low'
    understood.push({ label: 'Low budget', evidence: t.match(/\b(cheap|budget|student|affordable|low cost|not expensive)\b/)![0] })
  } else if (/\b(luxury|splurge|money is no|treat)\b/.test(t)) {
    prefs.budget = 'any'
    understood.push({ label: 'Any budget', evidence: t.match(/\b(luxury|splurge|money is no|treat)\b/)![0] })
  }

  const relaxed = t.match(/\b(relax\w*|chill\w*|slow|easy|lazy|no rush)\b/)
  const packed = t.match(/\b(packed|busy|as much as|everything|fast|full day|see it all)\b/)
  if (relaxed) {
    prefs.pace = 'relaxed'
    understood.push({ label: 'Relaxed pace', evidence: relaxed[0] })
  } else if (packed) {
    prefs.pace = 'packed'
    understood.push({ label: 'Packed pace', evidence: packed[0] })
  }

  const early = t.match(/\b(early|sunrise|morning person)\b/)
  const late = t.match(/\b(late start|sleep in|not a morning)\b/)
  if (late) {
    prefs.start = '11:00'
    understood.push({ label: 'Start at 11 am', evidence: late[0] })
  } else if (early) {
    prefs.start = '07:30'
    understood.push({ label: 'Start at 7:30 am', evidence: early[0] })
  }

  return { prefs, understood }
}

export const EXAMPLES = [
  'Two days, I love history and seafood, student budget',
  'One relaxed day with my kids, beaches and animals',
  'Weekend of souqs, crafts and art, early start',
]
