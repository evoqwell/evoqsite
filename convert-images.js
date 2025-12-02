import imagemin from 'imagemin';
import imageminWebp from 'imagemin-webp';
import fs from 'fs';
import path from 'path';

const convertImagesToWebP = async () => {
  const publicDir = './public';

  // List of PNG files to convert
  const pngFiles = [
    'Logo.PNG',
    'BAC water.png',
    'GHK-Cu.png',
    'Klow.png',
    'NAD+.png',
    'Retatrutide.png',
    'sermorelin.png',
    'Tirzepatide.png',
    'Vials.png',
    'Vials1.png',
    'Vials2.png',
    'Header.png',
    'Header_BG.png',
    'vials2_mobile.png'
  ];

  console.log('Starting WebP conversion...\n');

  for (const file of pngFiles) {
    const inputPath = path.join(publicDir, file);

    // Check if file exists
    if (!fs.existsSync(inputPath)) {
      console.log(`⚠️  File not found: ${file}`);
      continue;
    }

    try {
      // Convert to WebP
      const result = await imagemin([inputPath], {
        destination: publicDir,
        plugins: [
          imageminWebp({
            quality: 85, // Adjust quality (0-100)
            method: 6,   // Compression method (0=fast, 6=slowest/best)
            metadata: 'none' // Remove metadata
          })
        ]
      });

      if (result.length > 0) {
        // Get the output filename
        const baseName = path.basename(file, path.extname(file));
        const webpFile = `${baseName}.webp`;

        // Check if conversion was successful
        const webpPath = path.join(publicDir, webpFile);
        if (fs.existsSync(webpPath)) {
          const originalSize = fs.statSync(inputPath).size;
          const webpSize = fs.statSync(webpPath).size;
          const savings = Math.round((1 - webpSize / originalSize) * 100);

          console.log(`✅ Converted: ${file} → ${webpFile}`);
          console.log(`   Original: ${(originalSize / 1024).toFixed(2)} KB`);
          console.log(`   WebP: ${(webpSize / 1024).toFixed(2)} KB`);
          console.log(`   Savings: ${savings}%\n`);
        }
      }
    } catch (error) {
      console.error(`❌ Failed to convert ${file}: ${error.message}\n`);
    }
  }

  console.log('WebP conversion complete!');
  console.log('Note: Original PNG files have been preserved for fallback compatibility.');
  console.log('You can now update the product references in the admin panel to use the .webp versions.');
};

// Run the conversion
convertImagesToWebP().catch(console.error);