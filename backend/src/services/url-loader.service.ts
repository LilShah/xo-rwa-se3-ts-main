import puppeteer, { Browser } from 'puppeteer'

import { domExtractHyperlinks, domExtractText, pageEval } from './page-eval.service.js'

export interface TextAndLinks{
  text: string
  links: Set<string>
}

export class UrlLoaderService {
  private static instance: UrlLoaderService

  static async getInstance (): Promise<UrlLoaderService> {
    if (UrlLoaderService.instance === undefined) {
      const browser = await puppeteer.launch()
      UrlLoaderService.instance = new UrlLoaderService(browser)
    }
    return UrlLoaderService.instance
  }

  private constructor (private readonly browser: Browser) {
  }

  async loadUrlTextAndLinks (url: string): Promise<TextAndLinks> {
    const page = await this.browser.newPage()
    await page.setDefaultNavigationTimeout(0)
    await page.goto(url)
    await page.waitForSelector('body')
    const [text, links] = await Promise.all([await pageEval(page, domExtractText), await pageEval(page, domExtractHyperlinks)])
    const set = new Set(links)
    return { text, links: set }
  }

  async loadOnlyText (url: string): Promise<string> {
    const page = await this.browser.newPage()
    await page.setDefaultNavigationTimeout(0)
    await page.goto(url)
    await page.waitForSelector('body')
    return await pageEval(page, domExtractText)
  }

  async loadOnlyLinks (url: string): Promise<Set<string>> {
    const page = await this.browser.newPage()
    await page.setDefaultNavigationTimeout(0)
    await page.goto(url)
    await page.waitForSelector('body')
    const links = await pageEval(page, domExtractHyperlinks)
    return new Set(links)
  }
}
