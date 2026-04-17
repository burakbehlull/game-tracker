#!/usr/bin/env node

/**
 * Build Security Checker
 * Bu script build sonrası .env dosyasının build'e dahil olup olmadığını kontrol eder
 */

const fs = require('fs');
const path = require('path');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

console.log('\n🔒 Build Güvenlik Kontrolü Başlatılıyor...\n');

let hasIssues = false;

// Check 1: release/win-unpacked/resources klasöründe .env var mı?
const resourcesPath = path.join(__dirname, '../release/win-unpacked/resources');
if (fs.existsSync(resourcesPath)) {
  const files = fs.readdirSync(resourcesPath);
  const envFiles = files.filter(f => f.startsWith('.env'));
  
  if (envFiles.length > 0) {
    console.log(`${RED}❌ HATA: Build'de .env dosyası bulundu!${RESET}`);
    console.log(`   Konum: ${resourcesPath}`);
    console.log(`   Dosyalar: ${envFiles.join(', ')}`);
    hasIssues = true;
  } else {
    console.log(`${GREEN}✓ resources/ klasöründe .env dosyası yok${RESET}`);
  }
} else {
  console.log(`${YELLOW}⚠ resources/ klasörü bulunamadı (build yapılmamış olabilir)${RESET}`);
}

// Check 2: release/win-unpacked klasöründe .env var mı?
const unpackedPath = path.join(__dirname, '../release/win-unpacked');
if (fs.existsSync(unpackedPath)) {
  const searchForEnv = (dir) => {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        searchForEnv(fullPath);
      } else if (file.startsWith('.env')) {
        console.log(`${RED}❌ HATA: Build'de .env dosyası bulundu!${RESET}`);
        console.log(`   Konum: ${fullPath}`);
        hasIssues = true;
      }
    }
  };
  
  searchForEnv(unpackedPath);
  
  if (!hasIssues) {
    console.log(`${GREEN}✓ win-unpacked/ klasöründe .env dosyası yok${RESET}`);
  }
}

// Check 3: package.json'da extraResources kontrolü
const packageJsonPath = path.join(__dirname, '../package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  if (packageJson.build && packageJson.build.extraResources) {
    const hasEnvInExtra = packageJson.build.extraResources.some(
      resource => resource.includes('.env')
    );
    
    if (hasEnvInExtra) {
      console.log(`${RED}❌ HATA: package.json'da extraResources içinde .env var!${RESET}`);
      console.log(`   Lütfen package.json'dan .env referansını kaldırın`);
      hasIssues = true;
    } else {
      console.log(`${GREEN}✓ package.json extraResources temiz${RESET}`);
    }
  } else {
    console.log(`${GREEN}✓ package.json'da extraResources yok${RESET}`);
  }
  
  // Check files array
  if (packageJson.build && packageJson.build.files) {
    const hasEnvExclude = packageJson.build.files.some(
      pattern => pattern.includes('!**/.env')
    );
    
    if (hasEnvExclude) {
      console.log(`${GREEN}✓ package.json files array'de .env exclude var${RESET}`);
    } else {
      console.log(`${YELLOW}⚠ package.json files array'de .env exclude yok (önerilir)${RESET}`);
    }
  }
}

// Check 4: .gitignore kontrolü
const gitignorePath = path.join(__dirname, '../.gitignore');
if (fs.existsSync(gitignorePath)) {
  const gitignore = fs.readFileSync(gitignorePath, 'utf8');
  
  if (gitignore.includes('.env')) {
    console.log(`${GREEN}✓ .gitignore'da .env var${RESET}`);
  } else {
    console.log(`${RED}❌ HATA: .gitignore'da .env yok!${RESET}`);
    hasIssues = true;
  }
}

// Check 5: .env.example var mı?
const envExamplePath = path.join(__dirname, '../.env.example');
if (fs.existsSync(envExamplePath)) {
  console.log(`${GREEN}✓ .env.example dosyası mevcut${RESET}`);
} else {
  console.log(`${YELLOW}⚠ .env.example dosyası yok (önerilir)${RESET}`);
}

// Final Report
console.log('\n' + '='.repeat(50));
if (hasIssues) {
  console.log(`${RED}❌ GÜVENLİK SORUNLARI BULUNDU!${RESET}`);
  console.log(`\nLütfen yukarıdaki sorunları düzeltin ve tekrar build yapın.`);
  console.log(`\nDokümantasyon: docs/production-deployment.md`);
  process.exit(1);
} else {
  console.log(`${GREEN}✅ TÜM GÜVENLİK KONTROLLERİ BAŞARILI!${RESET}`);
  console.log(`\nBuild güvenli şekilde dağıtılabilir.`);
  process.exit(0);
}
