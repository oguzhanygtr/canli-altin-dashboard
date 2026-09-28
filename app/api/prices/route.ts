import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const SOURCE_URL = "https://finans.truncgil.com/v4/today.json";

const FETCH_TIMEOUT = 8000;

function parsePrice(value: unknown): number {
  if (value === null || value === undefined) {
    return 0;
  }

  let str = String(value).trim();

  if (!str) {
    return 0;
  }

  str = str
    .replace(/\$/g, "")
    .replace(/₺/g, "")
    .replace(/TL/gi, "")
    .replace(/%/g, "")
    .trim();

  if (str.includes(",") && str.includes(".")) {
    str = str.replace(/\./g, "").replace(",", ".");
  } else if (str.includes(",")) {
    str = str.replace(",", ".");
  }

  const numberValue = Number.parseFloat(str);

  return Number.isFinite(numberValue) ? numberValue : 0;
}

function isValidPrice(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

async function fetchWithTimeout(
  url: string,
  timeout: number
): Promise<Response> {
  const controller = new AbortController();

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);

  try {
    return await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache, no-store, max-age=0",
        Pragma: "no-cache",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154 Safari/537.36",
      },
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function GET() {
  const fetchedAt = new Date().toISOString();

  try {
    const upstreamUrl = `${SOURCE_URL}?_=${Date.now()}`;

    const response = await fetchWithTimeout(
      upstreamUrl,
      FETCH_TIMEOUT
    );

    if (!response.ok) {
      throw new Error(
        `Truncgil API HTTP ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    if (!data || typeof data !== "object") {
      throw new Error("Truncgil geçersiz JSON döndürdü.");
    }

    /*
     * CURRENT TRUNCGIL SCHEMA
     *
     * USD
     * EUR
     * GRA
     * CEYREKALTIN
     * ONS
     * CUMHURIYETALTINI
     */

    const usd = parsePrice(data?.USD?.Selling);
    const eur = parsePrice(data?.EUR?.Selling);

    const gramAltin = parsePrice(
      data?.GRA?.Selling
    );

    const ceyrekAltin = parsePrice(
      data?.CEYREKALTIN?.Selling
    );

    const onsAltin = parsePrice(
      data?.ONS?.Selling
    );

    const cumhuriyet = parsePrice(
      data?.CUMHURIYETALTINI?.Selling
    );

    /*
     * Gram altın bizim ana validation değerimiz.
     *
     * Eğer Truncgil cevap verdi ama gram altın
     * yoksa/geçersizse response'u başarılı kabul etmiyoruz.
     */

    if (!isValidPrice(gramAltin)) {
      throw new Error(
        "Truncgil geçerli gram altın fiyatı döndürmedi."
      );
    }

    const prices = {
      // GOLD

      gram_altin: gramAltin,

      ceyrek_altin: ceyrekAltin,

      ons_altin: onsAltin,

      cumhuriyet: cumhuriyet,

      // CURRENCY

      usd_try: usd,

      eur_try: eur,

      eur_usd:
        usd > 0 && eur > 0
          ? Number((eur / usd).toFixed(6))
          : 0,

      // CHANGE

      gram_altin_change: parsePrice(
        data?.GRA?.Change
      ),

      ceyrek_altin_change: parsePrice(
        data?.CEYREKALTIN?.Change
      ),

      ons_altin_change: parsePrice(
        data?.ONS?.Change
      ),

      cumhuriyet_change: parsePrice(
        data?.CUMHURIYETALTINI?.Change
      ),

      // BUYING

      gram_altin_alis: parsePrice(
        data?.GRA?.Buying
      ),

      ceyrek_altin_alis: parsePrice(
        data?.CEYREKALTIN?.Buying
      ),

      cumhuriyet_alis: parsePrice(
        data?.CUMHURIYETALTINI?.Buying
      ),

      // TIME

      fetched_at: fetchedAt,

      source_updated_at:
        data?.Update_Date ?? null,

      // DEBUG

      snapshot: {
        gram:
          data?.GRA?.Selling ?? null,

        ceyrek:
          data?.CEYREKALTIN?.Selling ?? null,

        ons:
          data?.ONS?.Selling ?? null,

        cumhuriyet:
          data?.CUMHURIYETALTINI?.Selling ?? null,

        usd:
          data?.USD?.Selling ?? null,

        eur:
          data?.EUR?.Selling ?? null,
      },
    };

    return NextResponse.json(prices, {
      status: 200,

      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",

        "CDN-Cache-Control": "no-store",

        "Vercel-CDN-Cache-Control": "no-store",

        "Surrogate-Control": "no-store",

        Pragma: "no-cache",

        Expires: "0",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.name === "AbortError"
          ? "Fiyat kaynağı zaman aşımına uğradı."
          : error.message
        : "Bilinmeyen hata";

    console.error("Fiyat API hatası:", message);

    return NextResponse.json(
      {
        error: "Fiyatlar geçici olarak alınamadı",

        message,

        fetched_at: fetchedAt,
      },
      {
        status: 503,

        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, max-age=0",

          "CDN-Cache-Control": "no-store",

          "Vercel-CDN-Cache-Control": "no-store",

          Pragma: "no-cache",

          Expires: "0",
        },
      }
    );
  }
}
