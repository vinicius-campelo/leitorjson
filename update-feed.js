
const fs = require('fs');

async function buildFeed() {
  const rssUrl = 'https://fetchrss.com/feed/1xEZ2V3kH5kB1xEZ1JGKt8x9.rss';
  
  try {
    console.log('Buscando feed RSS...');
    const response = await fetch(rssUrl);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const xmlText = await response.text();
    
    // Expressões regulares para extrair os itens sem depender de bibliotecas externas
    const itemRegex = /<item>([\s+S]*?)<\/item>/gi;
    const items = [];
    let match;

    while ((match = itemRegex.exec(xmlText)) !== null) {
      const itemContent = match[1];

      const getTagContent = (tag) => {
        const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
        const m = itemContent.match(regex);
        return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '\$1').trim() : '';
      };

      const description = getTagContent('description') || getTagContent('content:encoded');
      let title = 'Notícia da AMPAR-DF';
      let summaryText = '';

      if (description) {
        // Limpa avisos do Facebook e FetchRSS
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

        const remainingText = parts.join(' ').replace(/<\/?[^>]+(>|\$)/g, '').replace(/\s+/g, ' ').trim();
        summaryText = remainingText || title;
      }

      // Extrai imagem do media:content, enclosure ou tag <img>
      const mediaMatch = itemContent.match(/<media:content[^>]+url="([^">]+)"/i);
      const enclosureMatch = itemContent.match(/<enclosure[^>]+url="([^">]+)"/i);
      const imgMatch = description.match(/<img[^>]+src="([^">]+)"/i);

      const imageUrl = mediaMatch ? mediaMatch[1] : (enclosureMatch ? enclosureMatch[1] : (imgMatch ? imgMatch[1] : ''));

      items.push({
        title,
        summary: summaryText,
        url: getTagContent('link') || 'https://www.facebook.com/ampardf',
        date: getTagContent('pubDate') || getTagContent('dc:date'),
        image: imageUrl
      });
    }

    fs.writeFileSync('feed.json', JSON.stringify(items, null, 2));
    console.log(`Feed atualizado com sucesso! Total de ${items.length} postagens.`);
  } catch (err) {
    console.error('Erro ao atualizar feed:', err);
    process.exit(1);
  }
}

buildFeed();
