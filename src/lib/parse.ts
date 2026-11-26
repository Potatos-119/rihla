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

const NUM: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, a: 1, single: 1 }
const n = (w: string) => NUM[w] ?? Number(w)
const COUNT = String.raw`(\d+|one|two|three|four|five|six|seven|eight)`

export function parseRequest(text: string, base: Prefs): { prefs: Prefs; understood: Understood[] } {
  const prefs: Prefs = { ...base }
  const understood: Understood[] = []
  const t = text.toLowerCase()

  const days = t.match(/\b(\d|one|two|three|a|single)[\s-]*(?:(?:relaxed|full|busy|lazy|short|long|easy)\s+)?(day|days|night|nights)\b/)
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
        label: interest === 'family' ? 'Family-friendly places' : `Interested in ${interest === 'sea' ? 'the sea' : interest}`,
        evidence: m[0],
      })
    }
  }
  if (found.length) prefs.interests = found.filter((i) => i !== 'family')
  if (!prefs.interests.length) prefs.interests = base.interests

  // who is going
  const family = t.match(new RegExp(`family of ${COUNT}`))
  const adults = t.match(new RegExp(String.raw`\b${COUNT}\s+(adults?|people|persons|of us|friends|grown-?ups)\b`))
  const kids = t.match(new RegExp(String.raw`\b${COUNT}\s+(kids?|children|child|sons?|daughters?)\b`))
  if (family) {
    const total = Math.min(12, n(family[1]))
    prefs.adults = Math.min(2, total)
    prefs.children = Math.max(0, total - 2)
    understood.push({ label: `${prefs.adults} adults, ${prefs.children} children`, evidence: family[0] })
  } else {
    if (adults) {
      prefs.adults = Math.max(1, Math.min(12, n(adults[1])))
      understood.push({ label: `${prefs.adults} ${prefs.adults === 1 ? 'adult' : 'adults'}`, evidence: adults[0] })
    } else if (/\b(alone|solo|by myself|just me)\b/.test(t)) {
      prefs.adults = 1
      understood.push({ label: '1 adult', evidence: t.match(/\b(alone|solo|by myself|just me)\b/)![0] })
    } else if (/\b(my wife|my husband|couple|my partner|the two of us)\b/.test(t)) {
      prefs.adults = 2
      understood.push({ label: '2 adults', evidence: t.match(/\b(my wife|my husband|couple|my partner|the two of us)\b/)![0] })
    }
    if (kids) {
      prefs.children = Math.min(10, n(kids[1]))
      understood.push({ label: `${prefs.children} ${prefs.children === 1 ? 'child' : 'children'}`, evidence: kids[0] })
    } else if (found.includes('family') && prefs.children === 0) {
      prefs.children = 1
      understood.push({ label: '1 child (change the number below)', evidence: t.match(INTEREST_WORDS[5][1])![0] })
    }
  }
  prefs.kids = prefs.children > 0

  // spending limit
  const money = t.match(/(\d+(?:\.\d+)?)\s*(bd|bhd|dinars?)\b/) ?? t.match(/\b(?:bd|bhd)\s*(\d+(?:\.\d+)?)/)
  if (money) {
    prefs.limit = Number(money[1])
    understood.push({ label: `Spending limit BD ${prefs.limit}`, evidence: money[0] })
  }

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
  'One relaxed day, 2 adults and 3 kids, beaches and animals, under 60 BD',
  'Weekend of souqs, crafts and art with my wife, early start',
]
