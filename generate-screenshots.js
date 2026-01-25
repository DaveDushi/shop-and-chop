// Simple screenshot generator for PWA
const fs = require('fs');
const path = require('path');

function createScreenshot(width, height, filename, title) {
  const svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${width}" height="${height}" fill="#f8fafc"/>
    
    <!-- Header -->
    <rect x="0" y="0" width="${width}" height="60" fill="#10b981"/>
    <text x="${width/2}" y="35" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="18" font-weight="bold">Shop &amp; Chop</text>
    
    <!-- Content area -->
    <rect x="20" y="80" width="${width-40}" height="40" rx="8" fill="#e5e7eb"/>
    <text x="30" y="105" fill="#374151" font-family="Arial, sans-serif" font-size="16" font-weight="bold">${title}</text>
    
    <!-- Mock content -->
    <rect x="20" y="140" width="${width-40}" height="30" rx="4" fill="#f3f4f6"/>
    <rect x="20" y="180" width="${width-40}" height="30" rx="4" fill="#f3f4f6"/>
    <rect x="20" y="220" width="${width-40}" height="30" rx="4" fill="#f3f4f6"/>
    
    <!-- Footer -->
    <rect x="0" y="${height-60}" width="${width}" height="60" fill="#f9fafb"/>
    <text x="${width/2}" y="${height-35}" text-anchor="middle" fill="#6b7280" font-family="Arial, sans-serif" font-size="12">PWA Offline Ready</text>
  </svg>`;
  
  const screenshotsDir = path.join(__dirname, 'client', 'public', 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }
  
  const outputPath = path.join(screenshotsDir, filename);
  fs.writeFileSync(outputPath, svg);
  console.log(`Created ${outputPath}`);
}

// Create required screenshots
createScreenshot(390, 844, 'shopping-list-mobile.svg', 'Shopping List');
createScreenshot(1280, 720, 'meal-planner-desktop.svg', 'Meal Planner');

console.log('PWA screenshots generated successfully!');