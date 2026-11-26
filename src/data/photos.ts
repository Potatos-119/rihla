import raw from './images.json'

export interface Photo {
  src: string
  thumb: string
  width: number
  height: number
  author: string
  licence: string
  licenceUrl: string | null
  page: string
  file: string
  article: string | null
}

/**
 * Freely licensed photos per place id, resolved ahead of time by
 * scripts/fetch-images.mjs from Wikipedia / Wikimedia Commons.
 */
export const PHOTOS = raw as Record<string, Photo>
