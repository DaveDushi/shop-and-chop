// Simple icon generator for PWA
const fs = require('fs');
const path = require('path');

// Create a simple colored square as a placeholder icon
function createSimpleIcon(size, outputPath) {
  // Create a simple SVG icon
  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" fill="#10b981"/>
    <circle cx="${size/2}" cy="${size*0.4}" r="${size*0.15}" fill="white"/>
    <rect x="${size*0.35}" y="${size*0.55}" width="${size*0.3}" height="${size*0.25}" rx="${size*0.04}" fill="white"/>
    <text x="${size/2}" y="${size*0.9}" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="${size*0.06}" font-weight="bold">S&amp;C</text>
  </svg>`;
  
  fs.writeFileSync(outputPath, svg);
  console.log(`Created ${outputPath}`);
}

// Icon sizes needed for PWA
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, 'client', 'public', 'icons');

// Create icons directory if it doesn't exist
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate all required icon sizes as SVG (browsers can handle SVG icons)
sizes.forEach(size => {
  const filename = `icon-${size}x${size}.svg`;
  const outputPath = path.join(iconsDir, filename);
  createSimpleIcon(size, outputPath);
});

// Also create shortcut icons
createSimpleIcon(96, path.join(iconsDir, 'shopping-list-96x96.svg'));
createSimpleIcon(96, path.join(iconsDir, 'meal-planner-96x96.svg'));

console.log('All PWA icons generated successfully!');