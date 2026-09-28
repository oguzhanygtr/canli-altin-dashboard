import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('https://finans.truncgil.com/v3/today.json', { 
        next: { revalidate: 30 } // Cache for 30 seconds
    });
    const data = await res.json();
    
    // Parse strings like "6.543,57" to floats
    const parsePrice = (str: string) => {
        if (!str) return 0;
        // Handle "$4.155,74" -> "4155.74"
        const cleanStr = str.replace('$', '').replace('%', '').trim();
        return parseFloat(cleanStr.replace(/\./g, '').replace(',', '.'));
    };

    const prices = {
        gram_altin: parsePrice(data['gram-altin']?.Selling),
        ceyrek_altin: parsePrice(data['ceyrek-altin']?.Selling),
        ons_altin: parsePrice(data['ons']?.Selling),
        cumhuriyet: parsePrice(data['cumhuriyet-altini']?.Selling),
        usd_try: parsePrice(data['USD']?.Selling),
        eur_try: parsePrice(data['EUR']?.Selling),
        eur_usd: parsePrice(data['EUR']?.Selling) / parsePrice(data['USD']?.Selling),
        
        // Changes
        gram_altin_change: parsePrice(data['gram-altin']?.Change),
        ceyrek_altin_change: parsePrice(data['ceyrek-altin']?.Change),
        ons_altin_change: parsePrice(data['ons']?.Change),
        cumhuriyet_change: parsePrice(data['cumhuriyet-altini']?.Change),
        
        // Buying (Alış)
        gram_altin_alis: parsePrice(data['gram-altin']?.Buying),
        ceyrek_altin_alis: parsePrice(data['ceyrek-altin']?.Buying),
        cumhuriyet_alis: parsePrice(data['cumhuriyet-altini']?.Buying),
    };

    return NextResponse.json(prices);
  } catch (error) {
    return NextResponse.json({ error: 'Fiyatlar alınamadı' }, { status: 500 });
  }
}
