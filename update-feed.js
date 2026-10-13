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

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const xmlText = await response.text();
    console.log(`RSS recebido: ${xmlText.length} caracteres.`);

    const itemRegex = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
    const items = [];
    let match;

    while ((match = itemRegex.exec(xmlText)) !== null) {
      const itemContent = match[1];

      const getTagContent = (tagName) => {
        const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
        const m = itemContent.match(regex);
        if (!m) return '';
        return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1').trim();
      };

      const description = getTagContent('description');
      const linkUrl = getTagContent('link');
      const pubDate = getTagContent('pubDate') || getTagContent('dc:date');

      // Remove os avisos do Facebook e do FetchRSS
      let cleanHtml = description
        .replace(/When this happens, it's usually because the owner only shared it with a small group of people[^<]*/gi, '')
        .replace(/\(Feed generated with[^)]*\)/gi, '')
        .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
        .replace(/<span[^>]*>.*?<\/span>/gi, '')
        .trim();

      // Divide por <br> para pegar a primeira linha como título
      const parts = cleanHtml
        .split(/<br\s*\/?>/i)
        .map(p => p.replace(/<\/?[^>]+>/g, '').replace(/\s+/g, ' ').trim())
        .filter(p => p.length > 0);

      let title = 'Notícia da AMPAR-DF';
      let summaryText = '';

      if (parts.length > 0) {
        // Usa a primeira linha como título (mesmo que curta)
        title = parts[0];
        summaryText = parts.slice(1).join(' ').trim();
      }

      if (!summaryText) {
        summaryText = title;
      }

      // Busca imagem
      const mediaMatch = itemContent.match(/<media:content[^>]+url="([^">]+)"/i);
      const enclosureMatch = itemContent.match(/<enclosure[^>]+url="([^">]+)"/i);
      const imgMatch = description.match(/<img[^>]+src="([^">]+)"/i);

      let imageUrl = '';
      if (mediaMatch) imageUrl = mediaMatch[1];
      else if (enclosureMatch) imageUrl = enclosureMatch[1];
      else if (imgMatch) imageUrl = imgMatch[1];

      items.push({
        title,
        summary: summaryText,
        url: linkUrl || 'https://www.facebook.com/ampardf',
        date: pubDate,
        image: imageUrl
      });
    }

    console.log(`Total de posts extraídos: ${items.length}`);

    if (items.length > 0) {
      fs.writeFileSync(targetPath, JSON.stringify(items, null, 2), 'utf-8');
      console.log('feed.json atualizado com sucesso!');
    } else {
      console.log('Nenhum item extraído. feed.json não foi alterado.');
    }

  } catch (err) {
    console.error('Falha:', err.message);
    process.exit(0);
  }
}

buildFeed();
