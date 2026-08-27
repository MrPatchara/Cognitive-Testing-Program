/* ============================================================
 * build.js — Build script to inject environment variables
 * Usage: node build.js
 * Requires: WEBHOOK_URL in environment or .env file
 * ============================================================ */

const fs = require('fs');
const path = require('path');

// Load .env if exists
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const [key, ...valParts] = line.split('=');
      if (key && valParts.length) {
        process.env[key.trim()] = valParts.join('=').trim();
      }
    });
  }
}

function build() {
  loadEnv();
  
  const webhookUrl = process.env.WEBHOOK_URL;
  const corsOrigin = process.env.CORS_ORIGIN || '*';
  const appVersion = process.env.APP_VERSION || '1.0.0';
  
  if (!webhookUrl) {
    console.error('❌ WEBHOOK_URL not set in environment or .env file');
    console.log('   Create .env file with: WEBHOOK_URL=https://script.google.com/macros/s/XXX/exec');
    process.exit(1);
  }
  
  // Read index.html
  const indexPath = path.join(__dirname, 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');
  
  // Inject config script before </head>
  const configScript = `
  <script>
    window.CTB_CONFIG = {
      webhookUrl: "${webhookUrl.replace(/"/g, '\\"')}",
      corsOrigin: "${corsOrigin.replace(/"/g, '\\"')}",
      appVersion: "${appVersion.replace(/"/g, '\\"')}"
    };
  </script>
  `;
  
  html = html.replace('</head>', configScript + '\n</head>');
  
  // Write to dist/index.html
  const distDir = path.join(__dirname, 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }
  
  const distIndexPath = path.join(distDir, 'index.html');
  fs.writeFileSync(distIndexPath, html);
  
  // Copy other static files to dist
  const staticFiles = ['manifest.webmanifest', 'sw.js'];
  const staticDirs = ['css', 'js', 'assets', 'icons'];
  
  staticFiles.forEach(file => {
    const src = path.join(__dirname, file);
    const dest = path.join(distDir, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
    }
  });
  
  staticDirs.forEach(dir => {
    const src = path.join(__dirname, dir);
    const dest = path.join(distDir, dir);
    if (fs.existsSync(src)) {
      copyDirSync(src, dest);
    }
  });
  
  console.log('✅ Build complete!');
  console.log(`   Webhook URL: ${webhookUrl}`);
  console.log(`   Output: ${distDir}/`);
  console.log(`   Deploy the 'dist' folder to your static hosting`);
}

function copyDirSync(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

build();