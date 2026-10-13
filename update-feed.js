const fs = require('fs');
const path = require('path');

async function buildFeed() {
  const rssUrl = 'https://fetchrss.com/feed/1xEZ2V3kH5kB1xEZ1JGKt8x9.rss';
  
  try {
    console.log('Buscando feed RSS...');
    
    // Simula uma requisição idêntica a um navegador real
    const response = await fetch(rssUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`Servidor do FetchRSS respondeu com status HTTP ${response.status}`);
    }
    
    const xmlText = await response.text();
    console.log(`Sucesso ao obter RSS. Tamanho retornado: ${xmlText.length} caracteres.`);

    const itemRegex = /<item\b[^>]*>([\s\S]*?)<\/item\b[^>]*>/gi;
    const items = [];
    let match;

    while ((match = itemRegex.exec(xmlText)) !== null) {
      const itemContent = match[1];

      const getTagContent = (tagName) => {
        const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
        const m = itemContent.match(regex);
        if (!m) return '';
        return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '\$1').trim();
      };

      const description = getTagContent('description') || getTagContent('content:encoded') || '';
      const linkUrl = getTagContent('link');
      const pubDate = getTagContent('pubDate') || getTagContent('dc:date');

      let title = 'Notícia da AMPAR-DF';
      let summaryText = '';

      if (description) {
        const cleanHtml = description
          .replace(/When this happens, it's usually because the owner only shared it with a small group of people[^<]*/gi, '')
          .replace(/\(Feed generated with FetchRSS\)[^<]*/gi, '')
          .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
          .trim();

        const parts = cleanHtml.split(/<br\s*\/?>/i);
        const rawTitlePart = (parts[0] || '').replace(/<\/?[^>]+(>|\$)/g, '').trim();

        if (rawTitlePart && rawTitlePart.length > 2) {
          title = rawTitlePart;
          parts.shift();
        }

        const remainingHtml = parts.join(' ');
        summaryText = remainingHtml.replace(/<\/?[^>]+(>|\$)/g, ' ').replace(/\s+/g, ' ').trim();

        if (!summaryText && title) {
          summaryText = title;
        }
      }

      const mediaMatch = itemContent.match(/<media:content[^>]+url="([^">]+)"/i);
      const enclosureMatch = itemContent.match(/<enclosure[^>]+url="([^">]+)"/i);
      const imgMatch = description.match(/<img[^>]+src="([^">]+)"/i);

      let imageUrl = '';
      if (mediaMatch) imageUrl = mediaMatch[1];
      else if (enclosureMatch) imageUrl = enclosureMatch[1];
      else if (imgMatch) imageUrl = imgMatch[1];

      items.push({
        title: title,
        summary: summaryText || title,
        url: linkUrl || 'https://www.facebook.com/ampardf',
        date: pubDate,
        image: imageUrl
      });
    }

    console.log(`Total de posts extraídos: ${items.length}`);

    const targetPath = path.join(process.cwd(), 'feed.json');
    
    // Só atualiza o arquivo se houver posts válidos para evitar sobrescrever o feed com array vazio
    if (items.length > 0) {
      fs.writeFileSync(targetPath, JSON.stringify(items, null, 2), 'utf-8');
      console.log('Arquivo feed.json atualizado com sucesso!');
    } else {
      console.log('Nenhum item extraído do XML. O arquivo feed.json não foi alterado.');
    }

  } catch (err) {
    console.error('Falha na requisição ao FetchRSS:', err.message);
    // Encerra com código 0 para não quebrar o workflow e manter a versão funcional do feed.json
    process.exit(0);
  }
}

buildFeed();
