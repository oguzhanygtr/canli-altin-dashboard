'use client'

import {
	createContext,
	Fragment,
	useContext,
	useEffect,
	useState,
	type ReactNode,
} from 'react'
import DraggableWidgetGrid, { type WidgetItem } from '@/components/ui/draggable-widget-grid'

/* ------------------------------------------------------------------ *
 * Demo: A Gold Prices (Altın Fiyatları) Dashboard with draggable widgets.
 * ------------------------------------------------------------------ */

type Kind =
	| 'gram_altin'
	| 'ceyrek_altin'
	| 'ons_altin'
	| 'cumhuriyet'
	| 'fiyat_grafigi'
	| 'piyasa_ozeti'
	| 'haberler'
	| 'portfolio'

interface Widget extends WidgetItem {
	kind: Kind
}

const WIDGETS: Widget[] = [
	{ id: 'gram_altin', kind: 'gram_altin', size: 'sm', label: 'Gram Altın' },
	{ id: 'ceyrek_altin', kind: 'ceyrek_altin', size: 'sm', label: 'Çeyrek Altın' },
	{ id: 'ons_altin', kind: 'ons_altin', size: 'sm', label: 'Ons Altın' },
	{ id: 'cumhuriyet', kind: 'cumhuriyet', size: 'sm', label: 'Cumhuriyet Altını' },
	{ id: 'fiyat_grafigi', kind: 'fiyat_grafigi', size: 'wide', label: 'Altın Fiyat Grafiği' },
	{ id: 'piyasa_ozeti', kind: 'piyasa_ozeti', size: 'sm', label: 'Piyasa Özeti' },
	{ id: 'portfolio', kind: 'portfolio', size: 'sm', label: 'Portföyüm' },
	{ id: 'haberler', kind: 'haberler', size: 'wide', label: 'Piyasa Haberleri' },
]

/* ------------------------------------------------------------------ *
 * Global Real Data Setup
 * ------------------------------------------------------------------ */

interface GlobalPrices {
    gram_altin: number;
    ceyrek_altin: number;
    ons_altin: number;
    cumhuriyet: number;
    usd_try: number;
    eur_try: number;
    eur_usd: number;
    gram_altin_change: number;
    ceyrek_altin_change: number;
    ons_altin_change: number;
    cumhuriyet_change: number;
    gram_altin_alis: number;
    ceyrek_altin_alis: number;
    cumhuriyet_alis: number;
}

const PricesContext = createContext<GlobalPrices | null>(null);

function usePrices() {
    return useContext(PricesContext);
}

const PALETTE = [
	'[--background:#ffffff] [--color-background:#ffffff] [--foreground:#09090b] [--color-foreground:#09090b] [--card:#ffffff] [--color-card:#ffffff] [--card-foreground:#09090b] [--color-card-foreground:#09090b] [--muted-foreground:#71717a] [--color-muted-foreground:#71717a] [--border:#e4e4e7] [--color-border:#e4e4e7] [--ring:#18181b] [--color-ring:#18181b]',
	'dark:[--background:#0a0a0b] dark:[--color-background:#0a0a0b] dark:[--foreground:#fafafa] dark:[--color-foreground:#fafafa] dark:[--card:#141417] dark:[--color-card:#141417] dark:[--card-foreground:#fafafa] dark:[--color-card-foreground:#fafafa] dark:[--muted-foreground:#a1a1aa] dark:[--color-muted-foreground:#a1a1aa] dark:[--border:#27272a] dark:[--color-border:#27272a] dark:[--ring:#d4d4d8] dark:[--color-ring:#d4d4d8]',
].join(' ')

const FONT_URL = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap'
const FONT = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"

const fmt = (v: number) => (v || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

type Tone = 'ok' | 'warn' | 'err' | 'idle'

const DOT: Record<Tone, string> = {
	ok: 'bg-emerald-500',
	warn: 'bg-amber-500',
	err: 'bg-rose-500',
	idle: 'bg-muted-foreground/60',
}

const TEXT: Record<Tone, string> = {
	ok: 'text-emerald-600 dark:text-emerald-400',
	warn: 'text-amber-600 dark:text-amber-300',
	err: 'text-rose-600 dark:text-rose-400',
	idle: 'text-muted-foreground',
}

const ACCENT = 'bg-yellow-500 dark:bg-yellow-400'

/* ------------------------------------------------------------------ *
 * Building blocks
 * ------------------------------------------------------------------ */

function Shell({ title, meta, children }: { title: string; meta?: ReactNode; children: ReactNode }) {
	return (
		<section className="@container flex h-full flex-col gap-4 p-4 sm:p-[22px]">
			<header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-[14px] leading-none">
				<h3 className="truncate text-[12px] tracking-[0.1em] text-muted-foreground uppercase">
					{title}
				</h3>
				{meta && <span className="shrink-0 text-muted-foreground">{meta}</span>}
			</header>
			<div className="flex min-h-0 flex-1 flex-col">{children}</div>
		</section>
	)
}

function Big({ children, unit }: { children: ReactNode; unit?: string }) {
	return (
		<p className="text-[28px] leading-none font-normal tracking-tight text-foreground tabular-nums @[240px]:text-[30px]">
			{children}
			{unit && (
				<span className="text-[13px] tracking-normal text-muted-foreground">
					{'\u00a0'}{unit}
				</span>
			)}
		</p>
	)
}

function Delta({ value, against, suffix }: { value: number; against: string; suffix?: string }) {
	const up = value >= 0
	const tone: Tone = up ? 'ok' : 'err'
	return (
		<span className={`text-[14px] tabular-nums ${TEXT[tone]}`}>
			<span aria-hidden="true">{up ? '↑' : '↓'} </span>
			{Math.abs(value || 0)}%
			{suffix && <span aria-hidden="true" className="text-muted-foreground"> {suffix}</span>}
			<span className="sr-only"> {against}</span>
		</span>
	)
}

function Dot({ tone, pulse = false }: { tone: Tone; pulse?: boolean }) {
	return (
		<span aria-hidden="true" className="relative inline-flex size-2 shrink-0">
			{pulse && (
				<span className={`absolute inset-0 animate-ping rounded-full opacity-50 motion-reduce:hidden ${DOT[tone]}`} />
			)}
			<span className={`relative size-2 rounded-full ${DOT[tone]}`} />
		</span>
	)
}

function Row({ children, value, className = '' }: { children: ReactNode; value: ReactNode; className?: string }) {
	return (
		<div className={`flex items-center gap-2 text-[13px] ${className}`}>
			<dt className="flex min-w-0 items-center gap-2 truncate text-foreground">{children}</dt>
			<dd className="ml-auto text-muted-foreground tabular-nums">{value}</dd>
		</div>
	)
}

function LoadingWidget() {
    return (
        <div className="mt-4 flex flex-col gap-3 h-full animate-pulse">
            <div className="h-8 w-1/2 rounded bg-foreground/10" />
            <div className="mt-auto h-4 w-3/4 rounded bg-foreground/10" />
        </div>
    )
}

/* ------------------------------------------------------------------ *
 * Widgets
 * ------------------------------------------------------------------ */

function GramAltin() {
	const prices = usePrices();
	if (!prices) return <Shell title="Gram Altın"><LoadingWidget /></Shell>

	return (
		<Shell title="Gram Altın" meta={<Delta value={Number(prices.gram_altin_change?.toFixed(2))} against="düne göre" />}>
			<Big unit="₺">{fmt(prices.gram_altin)}</Big>
			<div className="mt-auto flex gap-4 text-[13px] text-muted-foreground">
				<div>Alış: {fmt(prices.gram_altin_alis)} ₺</div>
				<div>Satış: {fmt(prices.gram_altin)} ₺</div>
			</div>
		</Shell>
	)
}

function CeyrekAltin() {
	const prices = usePrices();
	if (!prices) return <Shell title="Çeyrek Altın"><LoadingWidget /></Shell>

	return (
		<Shell title="Çeyrek Altın" meta={<Delta value={Number(prices.ceyrek_altin_change?.toFixed(2))} against="düne göre" />}>
			<Big unit="₺">{fmt(prices.ceyrek_altin)}</Big>
			<div className="mt-auto flex gap-4 text-[13px] text-muted-foreground">
				<div>Alış: {fmt(prices.ceyrek_altin_alis)} ₺</div>
				<div>Satış: {fmt(prices.ceyrek_altin)} ₺</div>
			</div>
		</Shell>
	)
}

function OnsAltin() {
	const prices = usePrices();
	if (!prices) return <Shell title="Ons Altın"><LoadingWidget /></Shell>

	return (
		<Shell title="Ons Altın" meta={<Delta value={Number(prices.ons_altin_change?.toFixed(2))} against="düne göre" />}>
			<Big unit="$">{fmt(prices.ons_altin)}</Big>
			<div className="mt-auto text-[13px] text-muted-foreground">
				Küresel piyasalarda anlık işlem görüyor.
			</div>
		</Shell>
	)
}

function CumhuriyetAltin() {
	const prices = usePrices();
	if (!prices) return <Shell title="Cumhuriyet Altını"><LoadingWidget /></Shell>

	return (
		<Shell title="Cumhuriyet Altını" meta={<Delta value={Number(prices.cumhuriyet_change?.toFixed(2))} against="düne göre" />}>
			<Big unit="₺">{fmt(prices.cumhuriyet)}</Big>
			<div className="mt-auto flex gap-4 text-[13px] text-muted-foreground">
				<div>Alış: {fmt(prices.cumhuriyet_alis)} ₺</div>
				<div>Satış: {fmt(prices.cumhuriyet)} ₺</div>
			</div>
		</Shell>
	)
}

function FiyatGrafigi() {
    // We don't have historical data from the API easily for the chart, 
    // so we will simulate the intra-day fluctuation around the REAL current price.
	const prices = usePrices();
	const [points, setPoints] = useState<number[]>([]);

    useEffect(() => {
        if (!prices?.gram_altin) return;
        const currentPrice = prices.gram_altin;
        // Generate a static semi-random chart ending at current price
        const newPoints = Array.from({ length: 24 }, (_, i) => {
            const progress = i / 23;
            // A simple curve that ends up exactly at currentPrice
            return currentPrice - (prices.gram_altin_change > 0 ? (1-progress) * 50 : -(1-progress) * 50) + Math.sin(i)*10;
        });
        newPoints[23] = currentPrice; // Ensure exact match
        setPoints(newPoints);
    }, [prices?.gram_altin, prices?.gram_altin_change]);

	if (!prices) return <Shell title="Gram Altın (24 Saatlik)"><LoadingWidget /></Shell>

	const max = Math.max(...points, prices.gram_altin + 10);
	const min = Math.min(...points, prices.gram_altin - 10);
	const range = max - min || 1;

	return (
		<Shell title="Gram Altın (24 Saatlik)" meta="Son 24 Saat">
			<Big unit="₺">{fmt(prices.gram_altin)}</Big>
			<div role="img" aria-label={`Son 24 saat fiyat grafiği`} className="mt-auto flex h-16 items-end gap-[3px]">
				{points.map((p, i) => (
					<span
						key={i}
						className={`flex-1 rounded-t-[2px] transition-[height] duration-700 motion-reduce:transition-none ${i === points.length - 1 ? ACCENT : 'bg-foreground/15'}`}
						style={{ height: `${Math.max(10, ((p - min) / range) * 100)}%` }}
					/>
				))}
			</div>
		</Shell>
	)
}

function PiyasaOzeti() {
    const prices = usePrices();
	const isOpen = true; // Could be determined by time, assuming open for demo

	if (!prices) return <Shell title="Piyasa Durumu"><LoadingWidget /></Shell>

	return (
		<Shell title="Piyasa Durumu">
			<div className="flex flex-col gap-2">
				<p className={`flex items-center gap-2 text-[14px] ${isOpen ? TEXT.ok : TEXT.warn}`}>
					<Dot tone={isOpen ? 'ok' : 'warn'} pulse={isOpen} />
					<span>{isOpen ? 'Piyasalar Açık' : 'Piyasalar Kapalı'}</span>
				</p>
				<div className="mt-4 space-y-2">
					<Row value={fmt(prices.eur_usd)}>EUR/USD Paritesi</Row>
					<Row value={`${fmt(prices.usd_try)} ₺`}>Dolar/TL</Row>
					<Row value={`${fmt(prices.eur_try)} ₺`}>Euro/TL</Row>
				</div>
			</div>
		</Shell>
	)
}

function Portfolio() {
    const prices = usePrices();
	const [isEditing, setIsEditing] = useState(false)
	const [assets, setAssets] = useState({ gram: 7, ceyrek: 4, cumhuriyet: 1 })

	if (!prices) return <Shell title="Portföyüm"><LoadingWidget /></Shell>

	const total = (assets.gram * prices.gram_altin) + (assets.ceyrek * prices.ceyrek_altin) + (assets.cumhuriyet * prices.cumhuriyet)

	return (
		<Shell title="Portföyüm" meta={
			<button 
				onClick={() => setIsEditing(!isEditing)} 
				className="text-xs hover:underline cursor-pointer opacity-80 transition-opacity hover:opacity-100 text-blue-500"
			>
				{isEditing ? 'Kaydet' : 'Düzenle'}
			</button>
		}>
			<Big unit="₺">{fmt(total)}</Big>
			<div className="mt-auto space-y-2 text-[13px]">
				<div className="flex items-center justify-between">
					<span className="text-foreground">Gram Altın</span>
					{isEditing ? (
						<input type="number" className="w-16 rounded border border-border bg-transparent px-1 py-0.5 text-right text-muted-foreground outline-none focus:ring-1 focus:ring-ring" value={assets.gram} onChange={e => setAssets({...assets, gram: Number(e.target.value)})} />
					) : (
						<span className="text-muted-foreground tabular-nums">{assets.gram} Gram</span>
					)}
				</div>
				<div className="flex items-center justify-between">
					<span className="text-foreground">Çeyrek Altın</span>
					{isEditing ? (
						<input type="number" className="w-16 rounded border border-border bg-transparent px-1 py-0.5 text-right text-muted-foreground outline-none focus:ring-1 focus:ring-ring" value={assets.ceyrek} onChange={e => setAssets({...assets, ceyrek: Number(e.target.value)})} />
					) : (
						<span className="text-muted-foreground tabular-nums">{assets.ceyrek} Adet</span>
					)}
				</div>
				<div className="flex items-center justify-between">
					<span className="text-foreground">Cumhuriyet</span>
					{isEditing ? (
						<input type="number" className="w-16 rounded border border-border bg-transparent px-1 py-0.5 text-right text-muted-foreground outline-none focus:ring-1 focus:ring-ring" value={assets.cumhuriyet} onChange={e => setAssets({...assets, cumhuriyet: Number(e.target.value)})} />
					) : (
						<span className="text-muted-foreground tabular-nums">{assets.cumhuriyet} Adet</span>
					)}
				</div>
			</div>
		</Shell>
	)
}

function Haberler() {
	const [news, setNews] = useState<{id: number, title: string, source: string, time: string}[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchNews = async () => {
			try {
				const res = await fetch('/api/news');
				const data = await res.json();
				setNews(data);
			} catch (e) {
				console.error(e);
			} finally {
				setLoading(false);
			}
		};

		fetchNews();
		const interval = window.setInterval(fetchNews, 5 * 60 * 1000); // Check for updates every 5 minutes
		return () => window.clearInterval(interval);
	}, []);

	return (
		<Shell title="Piyasa Haberleri" meta={<span className="flex items-center gap-1.5"><Dot tone="ok" pulse />Canlı</span>}>
			{loading ? (
				<div className="mt-4 flex flex-col gap-3">
					<div className="h-4 w-3/4 animate-pulse rounded bg-foreground/10" />
					<div className="h-4 w-1/2 animate-pulse rounded bg-foreground/10" />
					<div className="h-4 w-5/6 animate-pulse rounded bg-foreground/10" />
				</div>
			) : (
				<ul className="mt-2 space-y-3 text-[13px]">
					{news.map((item) => (
						<li key={item.id} className="flex flex-col gap-1 border-b border-border/50 pb-2 last:border-0">
							<span className="text-foreground hover:underline cursor-pointer">{item.title}</span>
							<div className="flex justify-between text-[11px] text-muted-foreground">
								<span>{item.source}</span>
								<span>{item.time}</span>
							</div>
						</li>
					))}
				</ul>
			)}
		</Shell>
	)
}

/* ------------------------------------------------------------------ *
 * Board
 * ------------------------------------------------------------------ */

const VIEWS: Record<Kind, () => ReactNode> = {
	gram_altin: GramAltin,
	ceyrek_altin: CeyrekAltin,
	ons_altin: OnsAltin,
	cumhuriyet: CumhuriyetAltin,
	fiyat_grafigi: FiyatGrafigi,
	piyasa_ozeti: PiyasaOzeti,
	portfolio: Portfolio,
	haberler: Haberler,
}

const renderWidget = (item: Widget) => {
	const View = VIEWS[item.kind]
	return <View />
}

export default function Demo() {
    const [prices, setPrices] = useState<GlobalPrices | null>(null);
    const [isDarkMode, setIsDarkMode] = useState(false);

	useEffect(() => {
        // Automatically check system preference on load
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setIsDarkMode(true);
            document.documentElement.classList.add('dark');
        }

        const fetchPrices = async () => {
            try {
                const res = await fetch('/api/prices');
                const data = await res.json();
                setPrices(data);
            } catch (err) {
                console.error("Fiyatlar alınamadı", err);
            }
        };

        fetchPrices();
        // Fetch real prices every 15 seconds
        const interval = setInterval(fetchPrices, 15000);
        return () => clearInterval(interval);
	}, []);

    const toggleTheme = () => {
        setIsDarkMode(!isDarkMode);
        document.documentElement.classList.toggle('dark');
    };

	return (
		<main
			className={`flex min-h-screen w-full items-center justify-center bg-background px-4 py-12 text-foreground antialiased ${PALETTE}`}
			style={{ fontFamily: FONT }}>
			<link rel="stylesheet" href={FONT_URL} />
			<div className="w-full max-w-[1180px]">
				<header className="mb-8 flex justify-between items-end">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-3">
                            Canlı Altın Piyasası
                            <button 
                                onClick={toggleTheme} 
                                className="text-sm p-1.5 rounded bg-foreground/10 hover:bg-foreground/20 text-muted-foreground transition-colors cursor-pointer"
                                aria-label="Gece Modunu Değiştir"
                                title="Gece/Gündüz Modu"
                            >
                                {isDarkMode ? '☀️' : '🌙'}
                            </button>
                        </h1>
                        <p className="mt-1 text-[14px] text-muted-foreground">
                            <span className="[@media(pointer:coarse)]:hidden">
                                Widget'ları sürükleyip bırakarak düzeni kişiselleştirebilirsiniz.
                            </span>
                            <span className="hidden [@media(pointer:coarse)]:inline">
                                Widget'lara basılı tutup sürükleyerek düzeni kişiselleştirebilirsiniz.
                            </span>
                        </p>
                    </div>
                    {prices && (
                        <div className="text-xs text-emerald-500 flex items-center gap-1.5 animate-pulse">
                            <Dot tone="ok" pulse />
                            Canlı Veri
                        </div>
                    )}
				</header>
				<section aria-labelledby="altin-piyasasi-title">
					<h2 id="altin-piyasasi-title" className="sr-only">Altın Piyasası</h2>
					<PricesContext.Provider value={prices}>
						<DraggableWidgetGrid
							items={WIDGETS}
							renderItem={(item) => renderWidget(item as Widget)}
						/>
					</PricesContext.Provider>
				</section>
			</div>
		</main>
	)
}
