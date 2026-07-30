import imageUrlBuilder from '@sanity/image-url'
import type {SanityImageSource} from '@sanity/image-url'

export type SanityImageConfig = {
  projectId: string
  dataset: string
}

/** Widths used to build a responsive `srcSet` when the caller doesn't specify its own. */
const DEFAULT_WIDTHS = [480, 768, 1024, 1440, 2000]

// One builder per project/dataset pair — cheap to keep around for the life of
// the worker isolate, avoids re-creating it on every image.
const builders = new Map<string, ReturnType<typeof imageUrlBuilder>>()

function getBuilder(config: SanityImageConfig) {
  const key = `${config.projectId}:${config.dataset}`
  let builder = builders.get(key)
  if (!builder) {
    builder = imageUrlBuilder(config)
    builders.set(key, builder)
  }
  return builder
}

/**
 * Bouwt de Sanity image-URL-builder met project/dataset uit env, in plaats van
 * hardcoded waarden. `config` komt uit `sanityImageConfig(env)`.
 */
export function urlFor(source: SanityImageSource, config: SanityImageConfig) {
  return getBuilder(config).image(source)
}

/** Haalt de Sanity image-config uit de Hydrogen env — enige plek die de env-namen kent. */
export function sanityImageConfig(
  env: Pick<Env, 'SANITY_PROJECT_ID' | 'SANITY_DATASET'>,
): SanityImageConfig {
  return {
    projectId: env.SANITY_PROJECT_ID,
    dataset: env.SANITY_DATASET || 'production',
  }
}

type SanityImagePropsOptions = {
  width: number
  height?: number
  widths?: number[]
}

/**
 * Bouwt `src` + `srcSet` voor een Sanity-afbeelding, zodat de `sizes`-attributen
 * die al op onze `<img>`-elementen staan ook daadwerkelijk effect hebben — zonder
 * `srcSet` downloadt elk scherm dezelfde (volledige) resolutie.
 */
export function sanityImageProps(
  source: SanityImageSource,
  config: SanityImageConfig,
  {width, height, widths = DEFAULT_WIDTHS}: SanityImagePropsOptions,
): {src: string; srcSet: string; width: number; height?: number} {
  const aspectRatio = height ? height / width : null
  const candidateWidths = Array.from(
    new Set([...widths.filter((candidate) => candidate <= width), width]),
  ).sort((a, b) => a - b)

  const buildUrl = (targetWidth: number) => {
    let image = urlFor(source, config).width(targetWidth).auto('format').fit('crop')
    if (aspectRatio) {
      image = image.height(Math.round(targetWidth * aspectRatio))
    }
    return image.url() ?? ''
  }

  return {
    src: buildUrl(width),
    srcSet: candidateWidths.map((candidate) => `${buildUrl(candidate)} ${candidate}w`).join(', '),
    width,
    height,
  }
}
