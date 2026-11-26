// Resolves one freely licensed photo per place from Wikipedia / Wikimedia Commons
// and writes src/data/images.json with the URL, author, licence and source page.
// Runs at build-preparation time only: the app never calls an API, and no key is needed.
//
//   node scripts/fetch-images.mjs
//
// Places mapped to null (or whose lead image is not freely licensed) fall back to
// the app's illustrated tiles.

import { writeFileSync } from 'node:fs'

const UA = 'RihlaImageScript/1.0 (student project; https://github.com/Potatos-119/rihla)'

/** place id → English Wikipedia article (its lead image is used) or a hand-picked Commons file */
const SOURCES = {
  qalat: "Qal'at al-Bahrain",
  museum: 'Bahrain National Museum',
  bab: 'Bab Al Bahrain',
  souq: { file: 'Manama Bab al-Bahrain Souq 2.jpg' },
  haji: null,
  fateh: { file: 'Al Fateh outside.jpg' },
  quran: 'Beit Al Quran',
  siyadi: 'Pearling, Testimony of an Island Economy',
  'isa-house': { file: 'Muharraq Bayt Shaikh Isa bin Ali 3.jpg' },
  'muharraq-souq': null,
  saffron: null,
  bumaher: 'Bu Maher Fort',
  arad: 'Arad Fort',
  tree: 'Tree of Life (Bahrain)',
  areen: 'Al Areen Wildlife Park',
  circuit: { file: 'Bahrain Grandstands 2010.jpg' },
  wtc: { file: 'Manama Bahrain World Trade Centre & Bahrain Financial Harbour 1.jpg' },
  bay: 'Bahrain Bay',
  avenues: 'The Avenues Bahrain',
  citycentre: null,
  block338: null,
  aali: "A'ali",
  mounds: 'Dilmun Burial Mounds',
  barbar: 'Barbar Temple',
  jasra: { file: 'Al-Jasra House.jpg' },
  riffa: { file: 'Riffa Riffa Fort Exterior 01.jpg' },
  marassi: null,
  amwaj: { file: 'Amwaj Air.jpg' },
  polytechnic: null,
  theatre: null,
}

const FREE = /^(cc[ -]?by|cc[ -]?by-sa|cc0|public domain|pd|gfdl|attribution|fal)/i

async function api(host, params) {
  const url = `https://${host}/w/api.php?` + new URLSearchParams({ format: 'json', formatversion: '2', origin: '*', ...params })
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`${res.status} for ${url}`)
  return res.json()
}

const strip = (html = '') =>
  html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/\s+/g, ' ')
    .trim()

async function lead(title) {
  const r = await api('en.wikipedia.org', { action: 'query', prop: 'pageimages', piprop: 'name', titles: title, redirects: '1' })
  const page = r.query?.pages?.[0]
  if (!page || page.missing || !page.pageimage) return null
  return { file: page.pageimage, article: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}` }
}

async function info(file) {
  const r = await api('commons.wikimedia.org', {
    action: 'query',
    prop: 'imageinfo',
    titles: `File:${file}`,
    iiprop: 'url|extmetadata|size',
    iiurlwidth: '960',
  })
  const ii = r.query?.pages?.[0]?.imageinfo?.[0]
  if (!ii) return null // not on Commons, i.e. a local (often non-free) Wikipedia file
  const m = ii.extmetadata ?? {}
  const licence = strip(m.LicenseShortName?.value)
  if (!FREE.test(licence)) return { rejected: licence || 'unknown licence' }
  return {
    src: ii.thumburl.split('?')[0],
    thumb: ii.thumburl.split('?')[0].replace('/960px-', '/330px-'),
    width: ii.thumbwidth,
    height: ii.thumbheight,
    author: strip(m.Artist?.value).slice(0, 80) || 'Unknown',
    licence,
    licenceUrl: m.LicenseUrl?.value ?? null,
    page: ii.descriptionurl,
  }
}

const out = {}
for (const [id, title] of Object.entries(SOURCES)) {
  if (!title) {
    console.log(`- ${id}: no source, using illustration`)
    continue
  }
  try {
    await new Promise((r) => setTimeout(r, 400)) // be polite to the API
    const l =
      typeof title === 'object'
        ? { file: title.file.replace(/ /g, '_'), article: null }
        : await lead(title)
    if (!l) {
      console.log(`- ${id}: no lead image on "${title}"`)
      continue
    }
    const i = await info(l.file)
    if (!i) console.log(`- ${id}: ${l.file} is not on Commons, skipped`)
    else if ('rejected' in i) console.log(`- ${id}: ${l.file} rejected (${i.rejected})`)
    else {
      out[id] = { ...i, file: l.file, article: l.article }
      console.log(`✓ ${id}: ${l.file} (${i.licence}, ${i.author})`)
    }
  } catch (e) {
    console.log(`! ${id}: ${e.message}`)
  }
}

writeFileSync(new URL('../src/data/images.json', import.meta.url), JSON.stringify(out, null, 2) + '\n')
console.log(`\n${Object.keys(out).length} of ${Object.keys(SOURCES).length} places have a photo.`)
