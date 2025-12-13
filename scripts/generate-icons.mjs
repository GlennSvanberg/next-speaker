import sharp from 'sharp'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync, mkdirSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')
const publicDir = join(rootDir, 'public')
const sourceIcon = join(publicDir, 'icon.png')

// Ensure public directory exists
if (!existsSync(publicDir)) {
  mkdirSync(publicDir, { recursive: true })
}

// Check if source icon exists
if (!existsSync(sourceIcon)) {
  console.error(`❌ Source icon not found: ${sourceIcon}`)
  console.error('Please ensure public/icon.png exists')
  process.exit(1)
}

console.log('🎨 Generating icons from', sourceIcon)

/**
 * Create a rounded rectangle mask (squircle shape)
 * This creates smooth rounded corners like iOS app icons
 */
async function createSquircleMask(size, cornerRadius) {
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${cornerRadius}" ry="${cornerRadius}" fill="white"/>
    </svg>
  `
  return sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toBuffer()
}

/**
 * Generate app icon with dark background and white hand
 * Creates a squircle-shaped icon suitable for app stores
 */
async function generateAppIcon(size, outputPath) {
  console.log(`  📱 Generating app icon: ${size}x${size} -> ${outputPath}`)
  
  // Corner radius is typically 20-25% of size for app icons
  const cornerRadius = Math.round(size * 0.22)
  const padding = Math.round(size * 0.1) // 10% padding
  
  // Create dark background (#1a1a1a - dark gray, almost black)
  const darkBackground = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 26, g: 26, b: 26, alpha: 1 } // #1a1a1a
    }
  })
  
  // Load and process the icon
  const iconBuffer = await sharp(sourceIcon)
    .resize(size - (padding * 2), size - (padding * 2), {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .ensureAlpha()
    .toBuffer()
  
  // Get icon dimensions
  const iconMetadata = await sharp(iconBuffer).metadata()
  const iconSize = iconMetadata.width
  
  // Extract alpha channel to get the shape mask
  const alphaMask = await sharp(iconBuffer)
    .extractChannel('alpha')
    .greyscale()
    .toBuffer()
  
  // Create white icon: white RGB image
  const whiteRGB = await sharp({
    create: {
      width: iconSize,
      height: iconSize,
      channels: 3,
      background: { r: 255, g: 255, b: 255 } // White RGB
    }
  })
    .png()
    .toBuffer()
  
  // Combine white RGB with original alpha using joinChannel
  const whiteIconWithAlpha = await sharp(whiteRGB)
    .joinChannel(alphaMask)
    .png()
    .toBuffer()
  
  // Composite white icon onto dark background
  const composite = await darkBackground
    .composite([{
      input: whiteIconWithAlpha,
      top: padding,
      left: padding,
      blend: 'over'
    }])
    .png()
    .toBuffer()
  
  // Apply squircle mask
  const mask = await createSquircleMask(size, cornerRadius)
  const final = await sharp(composite)
    .composite([{
      input: mask,
      blend: 'dest-in'
    }])
    .png()
    .toFile(outputPath)
  
  console.log(`  ✅ Created: ${outputPath}`)
}

/**
 * Generate favicon (simpler, smaller icon)
 * Can use dark bg + white hand or keep original style
 */
async function generateFavicon(size, outputPath, useDarkBg = false) {
  console.log(`  🔖 Generating favicon: ${size}x${size} -> ${outputPath}`)
  
  if (useDarkBg) {
    // Use same style as app icons but smaller
    const padding = Math.round(size * 0.15)
    const darkBackground = sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 26, g: 26, b: 26, alpha: 1 }
      }
    })
    
    const iconBuffer = await sharp(sourceIcon)
      .resize(size - (padding * 2), size - (padding * 2), {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .ensureAlpha()
      .toBuffer()
    
    const iconMetadata = await sharp(iconBuffer).metadata()
    const iconSize = iconMetadata.width
    
    // Extract alpha channel to get the shape mask
    const alphaMask = await sharp(iconBuffer)
      .extractChannel('alpha')
      .greyscale()
      .toBuffer()
    
    // Create white icon: white RGB image
    const whiteRGB = await sharp({
      create: {
        width: iconSize,
        height: iconSize,
        channels: 3,
        background: { r: 255, g: 255, b: 255 }
      }
    })
      .png()
      .toBuffer()
    
    // Combine white RGB with original alpha using joinChannel
    const icon = await sharp(whiteRGB)
      .joinChannel(alphaMask)
      .png()
      .toBuffer()
    
    await darkBackground
      .composite([{
        input: icon,
        top: padding,
        left: padding,
        blend: 'over'
      }])
      .png()
      .toFile(outputPath)
  } else {
    // Simple resize, keep original style
    await sharp(sourceIcon)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(outputPath)
  }
  
  console.log(`  ✅ Created: ${outputPath}`)
}

/**
 * Generate ICO file (multi-resolution favicon)
 */
async function generateIco(outputPath) {
  console.log(`  🔖 Generating ICO: ${outputPath}`)
  
  // Use same dark bg + white icon style as other favicons
  const size = 32
  const padding = Math.round(size * 0.15)
  const darkBackground = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 26, g: 26, b: 26, alpha: 1 }
    }
  })
  
  const iconBuffer = await sharp(sourceIcon)
    .resize(size - (padding * 2), size - (padding * 2), {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .ensureAlpha()
    .toBuffer()
  
    const iconMetadata = await sharp(iconBuffer).metadata()
    const iconSize = iconMetadata.width
    
    // Extract alpha channel to get the shape mask
    const alphaMask = await sharp(iconBuffer)
      .extractChannel('alpha')
      .greyscale()
      .toBuffer()
    
    // Create white icon: white RGB image
    const whiteRGB = await sharp({
      create: {
        width: iconSize,
        height: iconSize,
        channels: 3,
        background: { r: 255, g: 255, b: 255 }
      }
    })
      .png()
      .toBuffer()
    
    // Combine white RGB with original alpha using joinChannel
    const icon = await sharp(whiteRGB)
      .joinChannel(alphaMask)
      .png()
      .toBuffer()
  
  // ICO files can contain multiple sizes
  // Sharp doesn't directly support ICO format, so we'll create a PNG
  // Browsers will accept PNG files named .ico
  await darkBackground
    .composite([{
      input: icon,
      top: padding,
      left: padding,
      blend: 'over'
    }])
    .png()
    .toFile(outputPath)
  
  console.log(`  ✅ Created: ${outputPath} (as PNG, browsers will accept it)`)
}

/**
 * Generate generic icon.png for general use
 */
async function generateGenericIcon(size, outputPath) {
  console.log(`  🎯 Generating generic icon: ${size}x${size} -> ${outputPath}`)
  
  await sharp(sourceIcon)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toFile(outputPath)
  
  console.log(`  ✅ Created: ${outputPath}`)
}

// Main execution
async function main() {
  try {
    console.log('\n🚀 Starting icon generation...\n')
    
    // App icons (dark background, white hand, rounded edges)
    await generateAppIcon(192, join(publicDir, 'android-chrome-192x192.png'))
    await generateAppIcon(512, join(publicDir, 'android-chrome-512x512.png'))
    await generateAppIcon(180, join(publicDir, 'apple-touch-icon.png'))
    
    // Favicons (smaller, can use dark bg or keep simple)
    await generateFavicon(16, join(publicDir, 'favicon-16x16.png'), true)
    await generateFavicon(32, join(publicDir, 'favicon-32x32.png'), true)
    await generateIco(join(publicDir, 'favicon.ico'))
    
    // Generic favicon.png (used in various places)
    await generateFavicon(32, join(publicDir, 'favicon.png'), true)
    
    console.log('\n✨ Icon generation complete!\n')
    console.log('Generated files:')
    console.log('  📱 App Icons:')
    console.log('    - android-chrome-192x192.png')
    console.log('    - android-chrome-512x512.png')
    console.log('    - apple-touch-icon.png')
    console.log('  🔖 Favicons:')
    console.log('    - favicon-16x16.png')
    console.log('    - favicon-32x32.png')
    console.log('    - favicon.ico')
    console.log('    - favicon.png')
    console.log('\n💡 Tip: Run "npm run generate-icons" anytime you update icon.png\n')
    
  } catch (error) {
    console.error('\n❌ Error generating icons:', error)
    process.exit(1)
  }
}

main()
