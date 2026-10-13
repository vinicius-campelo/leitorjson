const fs = require('fs');

async function buildFeed() {
  const rssUrl = 'https://fetchrss.com/feed/1xEZ2V3kH5kB1xEZ1JGKt8x9.rss';
  
  try {
    console.log('Buscando feed RSS...');
    const response = await fetch(rssUrl);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const xmlText = await response.text();
    
    // Extrai cada bloco <item>...</item> do XML usando regex pura
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    const items = [];
    let match;

    while ((match = itemRegex.exec(xmlText)) !== null) {
      const itemContent = match[1];

      // Função auxiliar para extrair o conteúdo de uma tag XML
      const getTagContent = (tag) => {
        const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
        const m = itemContent.match(regex);
        if (!m) return '';
        // Remove CDATA se houver
        return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '\$1').trim();
      };

      const description = getTagContent('description') || getTagContent('content:encoded') || '';
      const linkUrl = getTagContent('link');
      const pubDate = getTagContent('pubDate') || getTagContent('dc:date');

      let title = 'Notícia da AMPAR-DF';
      let summaryText = '';

      if (description) {
        // Remove avisos indesejados do Facebook e do FetchRSS
        const cleanHtml = description
          .replace(/When this happens, it's usually because the owner only shared it with a small group of people[^<]*/gi, '')
          .replace(/\(Feed generated with FetchRSS\)[^<]*/gi, '')
          .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
          .trim();

        // Quebra o texto por quebras de linha HTML para tentar isolar o título na primeira linha
        const parts = cleanHtml.split(/<br\s*\/?>/i);
        const rawTitlePart = (parts[0] || '').replace(/<\/?[^>]+(>|\$)/g, '').trim();

        if (rawTitlePart && rawTitlePart.length > 2) {
          title = rawTitlePart;
          parts.shift(); // Remove o título do corpo do texto
        }

        // Limpa tags HTML restantes para formar o resumo legível
        const remainingHtml = parts.join(' ');
        summaryText = remainingHtml.replace(/<\/?[^>]+(>|\$)/g, ' ').replace(/\s+/g, ' ').trim();

        if (!summaryText && title) {
          summaryText = title;
        }
      }

      // Extrai imagem de tags de mídia, enclosure ou tags <img> no texto
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

    console.log(`Total de posts processados com sucesso: ${items.length}`);

    // Salva o arquivo feed.json na raiz
    fs.writeFileSync('feed.json', JSON.stringify(items, null, 2), 'utf-8');
    console.log('Arquivo feed.json gerado e salvo com sucesso!');
  } catch (err) {
    console.error('Erro fatal ao gerar feed:', err);
    process.exit(1);
  }
}

buildFeed();
