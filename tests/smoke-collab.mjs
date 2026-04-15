import { chromium } from 'playwright'

const browser = await chromium.launch()
const ctx1 = await browser.newContext()
const ctx2 = await browser.newContext()

const page1 = await ctx1.newPage()
const page2 = await ctx2.newPage()

await page1.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' })
await page2.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' })

// Sanity check: page content renders
await page1.waitForSelector('text=CROSS-MODEL')

// Drag a model card to canvas in page1
const card = page1.locator('text=Gemini 3 Flash').first()
const canvas = page1.locator('.react-flow').first()
const cardBox = await card.boundingBox()
const canvasBox = await canvas.boundingBox()
if (!cardBox || !canvasBox) throw new Error('missing boxes')

await page1.mouse.move(cardBox.x + cardBox.width / 2, cardBox.y + cardBox.height / 2)
await page1.mouse.down()
await page1.mouse.move(canvasBox.x + 200, canvasBox.y + 200)
await page1.mouse.up()

// Give sync a moment
await page2.waitForTimeout(1000)

// Page2 should now show the dropped node label
await page2.waitForSelector('text=Gemini 3 Flash')

await browser.close()
console.log('ok')

