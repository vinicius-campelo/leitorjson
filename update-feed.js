const fs = require('fs');
const { JSDOM } = require('jsdom'); // Nota: Node 20+ já lida com DOMParser via ambiente nativo ou DOM embutido

async function buildFeed() {
  const rssUrl = 'https://fetchrss.com/feed/1xEZ2V3kH5kB1xEZ1JGKt8x9.rss';
  
  try {
    console.log('Buscando feed RSS...');
    const response = await fetch(rssUrl);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const xmlText = await response.text();
    
    // Utiliza o DOMParser padrão do Node.js (disponível nas versões recentes)
    const dom = new JSDOM(xmlText, { contentType: "text/xml" });
    const xml = dom.window.document;
    
    const items = Array.from(xml.getElementsByTagName('item'));
    console.log(`Itens encontrados no RSS: ${items.length}`);

    const posts = items.map((item) => {
      const getText = (tag) => {
        const el = item.getElementsByTagName(tag)[0];
        return el ? el.textContent.trim() : '';
      };

      const description = getText('description') || getText('content:encoded') || '';

      let title = 'Notícia da AMPAR-DF';
      let summaryText = '';

      if (description) {
        // Limpa avisos do Facebook e do FetchRSS
        const cleanHtml = description
          .replace(/When this happens, it's usually because the owner only shared it with a small group of people[^<]*/gi, '')
          .replace(/\(Feed generated with FetchRSS\)[^<]*/gi, '')
          .trim();

        const domDesc = new JSDOM(cleanHtml);
        const descDoc = domDesc.window.document;
        
        const parts = cleanHtml.split(/<br\s*\/?>/i);
        const rawTitlePart = (parts[0] || '').replace(/<\/?[^>]+(>|\$)/g, '').trim();

        if (rawTitlePart && rawTitlePart.length > 2) {
          title = rawTitlePart;
          parts.shift();
        }

        const remainingHtml = parts.join(' ');
        const domRem = new JSDOM(remainingHtml);
        summaryText = domRem.window.document.body.textContent.replace(/\s+/g, ' ').trim();

        if (!summaryText && title) summaryText = title;
      }

      const linkUrl = getText('link');
      
      // Busca a imagem nas tags de mídia ou enclosure
      const enclosure = item.getElementsByTagName('enclosure')[0]?.getAttribute('url');
      const mediaContent = item.getElementsByTagNameNS('http://search.yahoo.com/mrss/', 'content')[0]?.getAttribute('url');

      let imageUrl = enclosure || mediaContent || '';
      if (!imageUrl && description) {
        const imgMatch = description.match(/<img[^>]+src="([^">]+)"/i);
        if (imgMatch) imageUrl = imgMatch[1];
      }

      return {
        title: title,
        summary: summaryText,
        url: linkUrl || 'https://www.facebook.com/ampardf',
        date: getText('pubDate') || getText('dc:date'),
        image: imageUrl
      };
    });

    const validPosts = posts.filter((post) => post.title || post.summary);

    fs.writeFileSync('feed.json', JSON.stringify(validPosts, null, 2));
    console.log(`Feed atualizado com sucesso! Total de ${validPosts.length} postagens salvas.`);
  } catch (err) {
    console.error('Erro ao atualizar feed:', err);
    process.exit(1);
  }
}

buildFeed();
