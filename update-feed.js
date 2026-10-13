const fs = require('fs');
const path = require('path');

async function buildFeed() {
  const rssUrl = 'https://fetchrss.com/feed/1xEZ2V3kH5kB1xEZ1JGKt8x9.rss';
  const targetPath = path.join(process.cwd(), 'feed.json');

  try {
    console.log('Buscando feed RSS...');

    const response = await fetch(rssUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache'
      }
    });

    console.log('Status HTTP:', response.status);
    console.log('Content-Type:', response.headers.get('content-type'));

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const xmlText = await response.text();
    console.log('Primeiros 300 caracteres:');
    console.log(xmlText.substring(0, 300));

    if (!xmlText.includes('<item')) {
      console.warn('AVISO: O XML não contém <item>. Pode ser uma página de erro.');
    }

    // ... resto da sua lógica de parse ...

  } catch (err) {
    console.error('Falha:', err.message);

    // NÃO sobrescreve se já existe um feed válido
    if (!fs.existsSync(targetPath)) {
      fs.writeFileSync(targetPath, JSON.stringify([], null, 2), 'utf-8');
      console.log('feed.json criado vazio (fallback).');
    } else {
      console.log('feed.json existente mantido.');
    }
    process.exit(0);
  }
}

buildFeed();
