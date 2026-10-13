const fs = require('fs');

async function buildFeed() {
  const rssUrl = 'https://fetchrss.com/feed/1xEZ2V3kH5kB1xEZ1JGKt8x9.rss';
  
  try {
    console.log('Buscando feed RSS...');
    const response = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8'
      }
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const xmlText = await response.text();
    console.log(`Tamanho do texto XML baixado: ${xmlText.length} caracteres.`);

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

    console.log(`Total de posts encontrados com sucesso: ${items.length}`);

    fs.writeFileSync('feed.json', JSON.stringify(items, null, 2), 'utf-8');
    console.log('Arquivo feed.json salvo com sucesso!');
  } catch (err) {
    console.error('Erro ao processar o feed:', err);
    process.exit(1);
  }
}

buildFeed();
