import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('https://www.bloomberght.com/rss', { 
        next: { revalidate: 300 } // Cache for 5 minutes
    });
    const xml = await res.text();
    
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    let count = 0;
    
    while ((match = itemRegex.exec(xml)) !== null && count < 5) {
      const itemXml = match[1];
      
      // Try CDATA first, then fallback to normal tag
      let title = '';
      const cdataMatch = /<title><!\[CDATA\[(.*?)\]\]><\/title>/.exec(itemXml);
      if (cdataMatch) {
          title = cdataMatch[1];
      } else {
          const normalMatch = /<title>(.*?)<\/title>/.exec(itemXml);
          if (normalMatch) title = normalMatch[1];
      }
      
      const pubDateMatch = /<pubDate>(.*?)<\/pubDate>/.exec(itemXml);
      let timeStr = '';
      if (pubDateMatch) {
          const d = new Date(pubDateMatch[1]);
          if (!isNaN(d.getTime())) {
              timeStr = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
          } else {
              // Extract time directly from string if parsing fails
              const matchTime = /\b(\d{2}:\d{2})\b/.exec(pubDateMatch[1]);
              timeStr = matchTime ? matchTime[1] : pubDateMatch[1];
          }
      }
      
      if (title) {
        items.push({
          id: count,
          title: title.trim(),
          source: 'Bloomberg HT',
          time: timeStr,
        });
        count++;
      }
    }
    
    return NextResponse.json(items.length > 0 ? items : [{ id: 1, title: 'Yeni haber bulunamadı', source: 'Sistem', time: '' }]);
  } catch (error) {
    return NextResponse.json([{ id: 1, title: 'Haberler alınırken hata oluştu.', source: 'Sistem', time: '' }]);
  }
}
