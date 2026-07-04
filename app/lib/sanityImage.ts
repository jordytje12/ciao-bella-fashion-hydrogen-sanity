import imageUrlBuilder from '@sanity/image-url'
import type {SanityImageSource} from '@sanity/image-url'

const builder = imageUrlBuilder({
  projectId: 'tvgnj6zz',
  dataset: 'production',
})

export function urlFor(source: SanityImageSource) {
  return builder.image(source)
}
