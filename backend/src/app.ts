import { UrlLoaderService } from './services/url-loader.service.js'
import { Command } from 'commander'
import { debug } from 'console'
import { Queue } from 'queue-typescript'

interface AppParameters {
  depth: number
  url: string
  word: string
}

export const DEFAULT_URL = 'https://www.kayako.com/'
export const DEFAULT_DEPTH = '2'
export const DEFAULT_WORD = 'kayako'

export class App {
  /* istanbul ignore next */
  constructor (
    private readonly urlLoader: UrlLoaderService,
    private readonly command = new Command()
  ) {}

  async run (): Promise<void> {
    const appParameters = this.parseCli()

    await this.process(appParameters)
  }

  async collectURLs (appParameters: AppParameters): Promise<Set<string>> {
    const queue = new Queue<string>(appParameters.url)
    let currentDepth = appParameters.depth
    let linksSet = new Set<string>()
    linksSet.add(appParameters.url)

    while (queue.length > 0) {
      if (currentDepth === 0) break
      let n = queue.length
      while (n > 0) {
        const currentUrl = queue.dequeue()
        n--
        // prevent duplicate search for fragments found
        if (currentUrl.search(/#/i) !== -1) {
          continue
        }
        const setOfLinks = await this.urlLoader.loadOnlyLinks(currentUrl)
        linksSet = new Set([...linksSet, ...setOfLinks])

        debug(`URLs collection in progress. Collected: ${linksSet.size}`)
        for (const link of setOfLinks) {
          queue.enqueue(link)
        }
      }
      currentDepth--
    }
    return linksSet
  }

  async process (appParameters: AppParameters): Promise<void> {
    debug('Collecting URLs')
    appParameters.url = appParameters.url.replace('www.', '')
    const linksSet = await this.collectURLs(appParameters)
    debug(`URL collection complete. Total URLs collected: ${linksSet.size}`)
    debug('Searching for text')
    let count = 0
    for (const link of linksSet) {
      // ignore all fragments found
      if (link.search(/#/i) !== -1) {
        continue
      }
      debug(`Processing link: ${link}`)
      const extractedTextInner = await this.urlLoader.loadOnlyText(link)
      const regx = new RegExp(appParameters.word, 'gi')
      count += (extractedTextInner.toLocaleLowerCase().match(regx) ?? []).length
    }
    console.log(`Found ${count} instances of '${appParameters.word}' in the body of the pages`)
  }

  parseCli (argv: readonly string[] = process.argv): AppParameters {
    this.command
      .requiredOption('-u, --url <url>', 'URL to load', DEFAULT_URL)
      .requiredOption('-d, --depth <depth>', 'Depth to search', DEFAULT_DEPTH)
      .requiredOption('-w, --word <word>', 'Word to search', DEFAULT_WORD)

    this.command.parse(argv)
    const options = this.command.opts()

    return { url: options.url, depth: Number(options.depth), word: options.word }
  }
}
