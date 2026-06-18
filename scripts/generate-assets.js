const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const CARBON = '#2E333A'
const GOLD = '#F0C000'

const outDir = path.join(__dirname, '..', 'assets')
fs.mkdirSync(outDir, { recursive: true })

function iconSvg(size) {
  const fontSize = Math.round(size * 0.40)
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${CARBON}"/>
  <text x="50%" y="56%" text-anchor="middle" dominant-baseline="middle"
        font-family="Arial, Helvetica, sans-serif" font-weight="700"
        font-size="${fontSize}" fill="${GOLD}">2C</text>
</svg>`
}

function splashSvg(size) {
  const cardSize = Math.round(size * 0.34)
  const cardX = (size - cardSize) / 2
  const cardY = (size - cardSize) / 2 - size * 0.03
  const fontSize = Math.round(cardSize * 0.42)
  const subSize = Math.round(size * 0.026)
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${CARBON}"/>
  <rect x="${cardX}" y="${cardY}" width="${cardSize}" height="${cardSize}" rx="${cardSize * 0.16}" fill="${CARBON}" stroke="${GOLD}" stroke-width="${cardSize * 0.025}"/>
  <text x="50%" y="${(cardY + cardSize / 2) / size * 100}%" text-anchor="middle" dominant-baseline="middle"
        font-family="Arial, Helvetica, sans-serif" font-weight="700"
        font-size="${fontSize}" fill="${GOLD}">2C</text>
  <text x="50%" y="${(cardY + cardSize + size * 0.06) / size * 100}%" text-anchor="middle" dominant-baseline="middle"
        font-family="Arial, Helvetica, sans-serif" font-weight="600" letter-spacing="${subSize * 0.3}"
        font-size="${subSize}" fill="#9AA1AB">2C MONTAJES Y PROYECTOS ELECTRICOS</text>
</svg>`
}

async function main() {
  await sharp(Buffer.from(iconSvg(1024))).png().toFile(path.join(outDir, 'icon.png'))
  await sharp(Buffer.from(splashSvg(2732))).png().toFile(path.join(outDir, 'splash.png'))
  await sharp(Buffer.from(splashSvg(2732))).png().toFile(path.join(outDir, 'splash-dark.png'))
  console.log('Assets generados en', outDir)
}

main().catch(err => { console.error(err); process.exit(1) })
