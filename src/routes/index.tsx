import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Phone,
  MapPin,
  ShieldCheck,
  BadgeCheck,
  Wrench,
  DollarSign,
  MessageSquare,
  Gauge,
  Settings,
  Palette,
  Fuel,
  FileCheck,
  Star,
  ArrowRight,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import heroImg from "@/assets/hero-cars.jpg";
import dealerLogo from "@/assets/dealer-logo.png";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hummel Auto Sales LLC — Used Cars in Lemoyne, PA" },
      {
        name: "description",
        content:
          "Hummel Auto Sales LLC in Lemoyne, PA. Used sedans, trucks and SUVs with clear details, helpful service, and a straightforward buying experience.",
      },
      { property: "og:title", content: "Hummel Auto Sales LLC — Lemoyne, PA" },
      {
        property: "og:description",
        content:
          "Used vehicles in Lemoyne, PA with helpful service, clear communication, and a straightforward buying experience.",
      },
    ],
  }),
  component: Index,
});

const FILTERS = ["All", "Sedan", "SUV", "Truck", "Coupe", "Minivan"] as const;

const PUBLIC_INVENTORY_API =
  import.meta.env.VITE_PUBLIC_INVENTORY_API ?? "https://marketplace-system-lf78.onrender.com";
const DEALER_SLUG = import.meta.env.VITE_DEALER_SLUG ?? "hummel-auto-sales";
const FINANCING_URL = "#contact";
const DEFAULT_DEALER = {
  name: "Hummel Auto Sales LLC",
  phone: "7177613149",
  address: "1001 Hummel Ave, Lemoyne, PA 17043",
};

function configuredDealerSlug() {
  if (typeof window === "undefined") return DEALER_SLUG;
  const params = new URLSearchParams(window.location.search);
  return params.get("dealer") || DEALER_SLUG;
}

function phoneDigits(phone?: string) {
  return String(phone || "").replace(/\D/g, "");
}

function phoneDisplay(phone?: string) {
  const digits = phoneDigits(phone);
  if (digits.length === 10)
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  return phone || "";
}

function dealerLocation(address?: string) {
  if (!address) return "Lemoyne, PA";
  if (/lemoyne/i.test(address)) return "Lemoyne, PA";
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  return parts.length >= 2 ? parts.slice(-2).join(", ") : address;
}

function Index() {
  const dealerSlug = configuredDealerSlug();
  const { data: dealer } = useQuery({
    queryKey: ["dealer", dealerSlug],
    queryFn: async () => {
      const res = await fetch(`${PUBLIC_INVENTORY_API}/api/dealers/${dealerSlug}`);
      if (!res.ok) throw new Error("Failed to fetch dealer");
      return res.json();
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    initialData: DEFAULT_DEALER,
  });

  const { data: dbInventory = [], isLoading } = useQuery({
    queryKey: ["listings", dealerSlug],
    queryFn: async () => {
      const res = await fetch(
        `${PUBLIC_INVENTORY_API}/api/dealers/${dealerSlug}/listings`,
      );
      if (!res.ok) throw new Error("Failed to fetch listings");
      return res.json();
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [query, setQuery] = useState("");
  const dealerData = dealer || DEFAULT_DEALER;
  const dealerName = dealerData.name;
  const locationText = dealerLocation(dealerData.address);
  const dealerPhone = phoneDigits(dealerData.phone);
  const dealerPhoneText = phoneDisplay(dealerData.phone);
  const generalSmsHref = dealerPhone
    ? `sms:${dealerPhone}?&body=${encodeURIComponent(
        "Hi, I'm interested in a used car. What do you have available?",
      )}`
    : "#inventory";

  useEffect(() => {
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
  }, []);

  function inferBody(title: string): string {
    const t = title.toLowerCase();
    if (t.includes("sport utility") || t.includes("suv") || t.includes("crossover")) return "SUV";
    if (t.includes("pickup") || t.includes("truck")) return "Truck";
    if (t.includes("convertible") || t.includes("coupe")) return "Coupe";
    if (
      t.includes("minivan") ||
      t.includes("mini van") ||
      t.includes("cargo van") ||
      t.includes("passenger van")
    )
      return "Minivan";
    if (t.includes("sedan")) return "Sedan";
    if (t.includes("hatchback") || t.includes("wagon")) return "Sedan";
    if (
      /\b(silverado|sierra|f-?150|f-?250|f-?350|ram|tacoma|tundra|ranger|colorado|frontier|titan|dakota|canyon|s-?10)\b/.test(
        t,
      )
    )
      return "Truck";
    if (
      /\b(explorer|tahoe|suburban|traverse|pilot|highlander|cr-?v|rav-?4|escape|equinox|torrent|freestyle|interceptor|intercepter|4runner|edge|durango|cherokee|wrangler|blazer|bronco|expedition|rogue|murano|pathfinder|sorento|sportage|santa fe|tucson|outback|forester)\b/.test(
        t,
      )
    )
      return "SUV";
    if (t.includes("2d") || t.includes("2dr")) return "Coupe";
    if (t.includes("4d") || t.includes("4dr")) return "Sedan";
    return "Sedan";
  }

  const vehicles = useMemo(() => {
    if (!dbInventory) return [];
    return dbInventory
      .filter((v: any) => {
        if (v.is_sold) return false;
        const q = query.trim().toLowerCase();
        const matchesQuery = !q || v.title.toLowerCase().includes(q);
        const body = inferBody(v.title);
        const matchesFilter = filter === "All" || body === filter;
        return matchesQuery && matchesFilter;
      })
      .sort((a: any, b: any) => {
        const ao = Number(a.display_order || 0);
        const bo = Number(b.display_order || 0);
        if (ao || bo) return ao - bo;
        return Number(b.id || 0) - Number(a.id || 0);
      });
  }, [query, filter, dbInventory]);

  const availableCount = vehicles.length;

  return (
    <div className="min-h-screen bg-background pb-24 text-foreground md:pb-0">
      {/* ───── TOP INFO BAR ───── */}
      <div className="hidden bg-neutral-900 text-white/85 md:block">
        <div className="container-app flex items-center justify-between gap-6 py-2 text-[12px] font-medium">
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-accent" />
              {dealerData.address || locationText}
            </span>
            {dealerPhone && (
              <a href={`tel:${dealerPhone}`} className="flex items-center gap-1.5 hover:text-accent">
                <Phone className="h-3.5 w-3.5 text-accent" />
                {dealerPhoneText}
              </a>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-white/75">
            <Clock className="h-3.5 w-3.5 text-accent" />
            <span>Mon–Fri 9:30–4:30 · Sat 9:30–3</span>
          </div>
        </div>
      </div>

      {/* ───── NAV ───── */}
      <header className="sticky top-0 z-40 border-b border-black/80 bg-black text-white">
        <div className="container-app grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <a href="#" className="flex min-w-0 items-center gap-3">
            <DealerLogo />
            <div className="min-w-0 leading-tight">
              <div className="font-display truncate text-[clamp(1rem,2.8vw,1.25rem)] font-normal tracking-wide text-white">
                {dealerName}
              </div>
              <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
                <MapPin className="h-3 w-3" /> {locationText}
              </div>
            </div>
          </a>

          <nav className="hidden items-center justify-center gap-1 md:flex">
            {[
              { href: "#inventory", label: "Inventory" },
              { href: "#financing", label: "Financing" },
              { href: "#about", label: "About" },
              { href: "#reviews", label: "Reviews" },
              { href: "#contact", label: "Contact" },
            ].map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="font-condensed rounded-md px-3 py-2 text-[15px] font-semibold uppercase tracking-wider text-white/80 transition-colors hover:text-accent"
                style={{ fontFamily: "var(--font-condensed)" }}
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center justify-end gap-2">
            <Button asChild size="sm" variant="ghost" className="hidden text-white hover:bg-white/10 hover:text-white sm:inline-flex">
              <a href={generalSmsHref}>
                <MessageSquare className="mr-1.5 h-4 w-4" />
                Text
              </a>
            </Button>
            {dealerPhone && (
              <Button
                asChild
                size="sm"
                className="hidden bg-accent text-accent-foreground shadow-sm hover:bg-accent/90 sm:inline-flex"
              >
                <a href={`tel:${dealerPhone}`}>
                  <Phone className="mr-1.5 h-4 w-4" />
                  Call
                </a>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* ───── PROMO STRIP ───── */}
      <a
        href="#financing"
        className="block bg-accent text-accent-foreground transition-colors hover:bg-accent/90"
      >
        <div className="container-app flex flex-wrap items-center justify-center gap-3 py-2.5 text-center text-sm font-semibold">
          <BadgeCheck className="h-4 w-4" />
          <span className="uppercase tracking-wider">
            Get Pre-Approved with No Impact to Your Credit Score
          </span>
          <span className="hidden rounded bg-black px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-accent sm:inline-block">
            Learn More
          </span>
        </div>
      </a>


      {/* ───── HERO ───── */}
      <section className="relative isolate overflow-hidden bg-black text-white">
        <img
          src={heroImg}
          alt={`${dealerName} used car inventory`}
          width={1920}
          height={1088}
          className="absolute inset-0 h-full w-full object-cover opacity-55"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/55 to-black/85" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.65)_85%)]" />

        <div className="container-app relative flex flex-col items-center py-24 text-center md:py-36">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-accent backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_10px_currentColor]" />
            Now Open · {locationText}
          </span>

          <h1 className="text-balance mt-6 font-display text-[clamp(2.5rem,7vw,5.75rem)] font-normal leading-[0.95] tracking-wide text-white">
            Your trusted source for quality
            <br className="hidden sm:block" />{" "}
            <span className="text-accent">used cars</span> in {locationText}
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/75 md:text-lg">
            Explore a diverse range of pre-owned sedans, trucks and SUVs — hand-picked,
            honestly priced, and ready to drive home.
          </p>

          {/* Big search bar */}
          <div className="mt-10 w-full max-w-3xl">
            <div className="relative rounded-full bg-white p-1.5 shadow-2xl ring-1 ring-black/10">
              <Search className="pointer-events-none absolute left-6 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by make, model, or year…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-14 w-full border-0 bg-transparent pl-14 pr-36 text-base text-ink shadow-none placeholder:text-muted-foreground focus-visible:ring-0"
              />
              <Button
                asChild
                className="absolute right-1.5 top-1/2 hidden h-11 -translate-y-1/2 rounded-full bg-accent px-6 text-accent-foreground hover:bg-accent/90 sm:inline-flex"
              >
                <a href="#inventory">
                  Search <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>

            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all ${
                    filter === f
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-white/25 bg-white/5 text-white/85 backdrop-blur hover:border-accent hover:text-accent"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="h-12 bg-accent px-6 text-accent-foreground shadow-lg shadow-accent/30 hover:bg-accent/90"
            >
              <a href={generalSmsHref}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Text What You Need
              </a>
            </Button>
            {dealerPhone && (
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 border-white/30 bg-white/5 px-6 text-white hover:bg-white/15 hover:text-white"
              >
                <a href={`tel:${dealerPhone}`}>
                  <Phone className="mr-2 h-4 w-4" />
                  {dealerPhoneText}
                </a>
              </Button>
            )}
          </div>
        </div>

        {/* Stats strip */}
        <div className="relative border-t border-white/10 bg-black/60 backdrop-blur-sm">
          <dl className="container-app grid grid-cols-3 divide-x divide-white/10 text-center">
            {[
              { k: availableCount > 0 ? `${availableCount}+` : "Live", v: "Vehicles in stock" },
              { k: "Mon–Sat", v: "Open six days" },
              { k: "100%", v: "Local & family run" },
            ].map((s) => (
              <div key={s.v} className="px-4 py-5">
                <dt className="font-display text-2xl font-normal tracking-wide text-accent md:text-3xl">
                  {s.k}
                </dt>
                <dd className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
                  {s.v}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ───── BROWSE BY STYLE ───── */}
      <section className="border-b border-border bg-background">
        <div className="container-app py-10 md:py-14">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="section-rule font-display text-2xl font-normal tracking-wide text-ink md:text-3xl">
              Browse by Style
            </h2>
            <a href="#inventory" className="text-xs font-bold uppercase tracking-widest text-accent hover:underline">
              View all →
            </a>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
            {[
              { label: "All", filter: "All" as const },
              { label: "SUVs", filter: "SUV" as const },
              { label: "Sedans", filter: "Sedan" as const },
              { label: "Trucks", filter: "Truck" as const },
              { label: "Coupes", filter: "Coupe" as const },
              { label: "Minivans", filter: "Minivan" as const },
            ].map((c) => (
              <a
                key={c.label}
                href="#inventory"
                onClick={() => setFilter(c.filter)}
                className={`group flex flex-col items-center justify-center rounded-xl border bg-card px-3 py-6 text-center transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-lg ${
                  filter === c.filter ? "border-accent shadow-md" : "border-border"
                }`}
              >
                <span className="grid h-12 w-12 place-items-center rounded-full bg-black text-accent transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
                  <Gauge className="h-5 w-5" />
                </span>
                <span className="mt-3 font-display text-base font-normal tracking-wider text-ink">
                  {c.label}
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>



      {/* ───── TRUST STRIP ───── */}
      <section className="border-b border-border bg-surface">
        <div className="container-app grid grid-cols-2 gap-3 py-8 md:grid-cols-4 md:gap-4">
          {[
            { icon: DollarSign, label: "Affordable Vehicles", sub: "Fair, transparent prices" },
            { icon: MessageSquare, label: "Helpful Service", sub: "We answer texts fast" },
            { icon: ShieldCheck, label: "Honest Details", sub: "What you see is what you get" },
            { icon: Wrench, label: "Repair Support", sub: "We know the cars we sell" },
          ].map((f) => (
            <div
              key={f.label}
              className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/5 text-primary transition-colors group-hover:bg-accent/10 group-hover:text-accent">
                <f.icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold leading-tight text-ink">{f.label}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">{f.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ───── INVENTORY ───── */}
      <section id="inventory" className="container-app py-20 md:py-24">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-xl">
            <span className="eyebrow">Available now</span>
            <h2 className="mt-3 font-display text-4xl font-bold tracking-tight md:text-5xl">
              Current Inventory
            </h2>
            <p className="mt-3 text-muted-foreground">
              Updated regularly with cars, SUVs, and practical daily drivers. Tap any vehicle for
              photos and details.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                  filter === f
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-background text-ink-soft hover:border-primary/40 hover:text-ink"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="overflow-hidden rounded-xl border border-border bg-card"
                >
                  <div className="aspect-[4/3] animate-pulse bg-muted" />
                  <div className="space-y-3 p-4">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                    <div className="h-7 w-1/3 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))
            : vehicles.map((v: any) => (
                <VehicleCard
                  key={v.id}
                  vehicle={v}
                  dealerPhone={dealerPhone}
                  dealerPhoneDisplay={dealerPhoneText}
                  locationText={locationText}
                />
              ))}
        </div>

        {!isLoading && vehicles.length === 0 && (
          <div className="mt-12 rounded-2xl border border-dashed border-border bg-surface py-20 text-center">
            <Search className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-4 font-semibold text-ink">No vehicles match your search</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try a different filter, or text us what you're looking for.
            </p>
            <Button asChild className="mt-6 bg-accent text-accent-foreground hover:bg-accent/90">
              <a href={generalSmsHref}>
                <MessageSquare className="mr-2 h-4 w-4" /> Text Us
              </a>
            </Button>
          </div>
        )}
      </section>

      {/* ───── FINANCING ───── */}
      <section id="financing" className="border-y border-border bg-surface py-20 md:py-24">
        <div className="container-app grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <span className="eyebrow">Financing available</span>
            <h2 className="mt-3 font-display text-4xl font-bold tracking-tight md:text-5xl">
              Financing for your{" "}
              <span className="text-accent">next vehicle.</span>
            </h2>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              {dealerName} can walk you through available financing options and next steps through
              our third-party financing partners.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-12 bg-accent text-accent-foreground shadow-md shadow-accent/25 hover:bg-accent/90">
                <a href={FINANCING_URL}>
                  <FileCheck className="mr-2 h-4 w-4" />
                  Ask About Financing
                </a>
              </Button>
              {dealerPhone && (
                <Button asChild size="lg" variant="outline" className="h-12">
                  <a href={`tel:${dealerPhone}`}>
                    <Phone className="mr-2 h-4 w-4" />
                    Call {dealerPhoneText}
                  </a>
                </Button>
              )}
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Call or text first and the team will help you get started.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  icon: ShieldCheck,
                  title: "What You May Need",
                  items: [
                    "Current address & contact",
                    "Employer & income details",
                    "Valid ID",
                    "Optional co-applicant info",
                  ],
                },
                {
                  icon: DollarSign,
                  title: "What Happens Next",
                  items: [
                    "Contact the dealership",
                    "Review financing options",
                    "Choose a vehicle & finalize",
                  ],
                },
              ].map((b) => (
                <div key={b.title} className="rounded-xl bg-surface p-5">
                  <div className="mb-3 grid h-10 w-10 place-items-center rounded-lg bg-accent/10 text-accent">
                    <b.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display font-bold text-ink">{b.title}</h3>
                  <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                    {b.items.map((it) => (
                      <li key={it} className="flex gap-2">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
                        {it}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl bg-primary p-5 text-primary-foreground">
              <div className="font-display font-bold">Simple and straightforward</div>
              <p className="mt-1 text-sm text-primary-foreground/80">
                Have a vehicle in mind? Ask {dealerName} about financing and what to bring.
              </p>
              <Button
                asChild
                className="mt-4 w-full bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <a href={FINANCING_URL}>Contact About Financing</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ───── ABOUT ───── */}
      <section id="about" className="py-20 md:py-24">
        <div className="container-app grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <span className="eyebrow">About us</span>
            <h2 className="mt-3 font-display text-4xl font-bold tracking-tight md:text-5xl">
              Straightforward used car buying in Lemoyne, PA
            </h2>
            <p className="mt-5 text-muted-foreground">
              {dealerName} is a newly established car dealership located in Lemoyne, PA.
            </p>
            <p className="mt-3 text-muted-foreground">
              We sell used vehicles ranging from sedans, trucks, SUVs, and more. Inventory updates
              automatically from the connected marketplace sync.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild className="bg-accent text-accent-foreground shadow-md shadow-accent/20 hover:bg-accent/90">
                <a href={generalSmsHref}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Text Us
                </a>
              </Button>
              {dealerPhone && (
                <Button variant="outline" asChild>
                  <a href={`tel:${dealerPhone}`}>
                    <Phone className="mr-2 h-4 w-4" />
                    Call {dealerPhoneText}
                  </a>
                </Button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { k: locationText, v: "Local dealer", Icon: MapPin },
              { k: dealerPhoneText || "—", v: "Call or text", Icon: Phone },
              { k: "9:30–4:30", v: "Mon–Fri", Icon: Clock },
              { k: "9:30–3", v: "Saturday", Icon: Clock },
            ].map((s) => (
              <div
                key={s.v}
                className="group rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md"
              >
                <s.Icon className="h-5 w-5 text-accent" />
                <div className="mt-3 font-display text-lg font-bold leading-tight text-ink">
                  {s.k}
                </div>
                <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                  {s.v}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── REVIEWS ───── */}
      <section
        id="reviews"
        className="relative overflow-hidden bg-primary py-20 text-primary-foreground md:py-24"
      >
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="container-app relative">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-5 flex justify-center gap-1.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className="h-7 w-7 fill-accent text-accent drop-shadow-[0_0_10px_color-mix(in_oklab,var(--accent)_60%,transparent)]"
                  style={{
                    animation: "star-pop 1.8s ease-in-out infinite",
                    animationDelay: `${i * 120}ms`,
                  }}
                />
              ))}
            </div>
            <span className="eyebrow !text-accent/90">Reviews</span>
            <h2 className="mt-3 font-display text-4xl font-bold tracking-tight md:text-5xl">
              What customers say
            </h2>
            <p className="mt-3 text-primary-foreground/70">
              Real feedback from local buyers and customers.
            </p>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                name: "Wilson Talavera",
                text: "Purchased my Dodge Ram from this place. I have had it for almost a year and have not had a problem yet. I love my Dodge and use it daily for work.",
              },
              {
                name: "iishababy101",
                text: "Love my car. I have had it for 7 months with no major issues. I found them on Marketplace and they work with you.",
              },
              {
                name: "Ahmed Foda",
                text: "Super reliable and skilled mechanic. Fixed my car quickly and explained everything clearly. Honest pricing and great service.",
              },
              {
                name: "Abdelillah Moubarik",
                text: "They are very nice. Excellent service.",
              },
            ].map((review) => (
              <figure
                key={review.name}
                className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-accent/40 hover:bg-white/[0.07]"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent font-display text-lg font-bold uppercase text-accent-foreground shadow-md shadow-accent/30">
                    {review.name[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{review.name}</div>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-accent text-accent" />
                      ))}
                    </div>
                  </div>
                </div>
                <blockquote className="mt-5 text-sm leading-relaxed text-primary-foreground/85">
                  "{review.text}"
                </blockquote>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ───── CONTACT ───── */}
      <section id="contact" className="bg-background py-20 md:py-24">
        <div className="container-app">
          <div className="rounded-3xl border border-border bg-card p-8 shadow-xl md:p-12">
            <div className="grid gap-10 md:grid-cols-[1fr_1.2fr] md:items-start">
              <div>
                <span className="eyebrow">Get in touch</span>
                <h2 className="mt-3 font-display text-4xl font-bold tracking-tight md:text-5xl">
                  Come see us.
                </h2>
                <p className="mt-4 max-w-md text-muted-foreground">
                  Text or call first, then stop by the lot to see what's available in person.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button
                    asChild
                    className="bg-accent text-accent-foreground hover:bg-accent/90"
                  >
                    <a href={generalSmsHref}>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Text Us
                    </a>
                  </Button>
                  {dealerPhone && (
                    <Button asChild variant="outline">
                      <a href={`tel:${dealerPhone}`}>
                        <Phone className="mr-2 h-4 w-4" />
                        Call
                      </a>
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  {
                    icon: MapPin,
                    label: "Visit",
                    value: dealerData.address || locationText,
                    href: undefined as string | undefined,
                  },
                  {
                    icon: Phone,
                    label: "Call",
                    value: dealerPhone ? dealerPhoneText : "Use the text button",
                    href: dealerPhone ? `tel:${dealerPhone}` : undefined,
                  },
                  {
                    icon: MessageSquare,
                    label: "Text",
                    value: "Ask what's available",
                    href: generalSmsHref,
                  },
                ].map((c) => {
                  const Body = (
                    <>
                      <span className="grid h-10 w-10 place-items-center rounded-lg bg-accent/10 text-accent">
                        <c.icon className="h-5 w-5" />
                      </span>
                      <div className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {c.label}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-ink">{c.value}</div>
                    </>
                  );
                  return c.href ? (
                    <a
                      key={c.label}
                      href={c.href}
                      className="block rounded-2xl border border-border bg-surface p-5 transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md"
                    >
                      {Body}
                    </a>
                  ) : (
                    <div
                      key={c.label}
                      className="rounded-2xl border border-border bg-surface p-5"
                    >
                      {Body}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───── FOOTER ───── */}
      <footer className="border-t border-border bg-surface">
        <div className="container-app flex flex-col items-center justify-between gap-3 py-8 text-sm text-muted-foreground md:flex-row">
          <div className="flex items-center gap-3">
            <img src={dealerLogo} alt="" className="h-8 w-auto" />
            <span>
              © {new Date().getFullYear()} {dealerName}
            </span>
          </div>
          <div>
            {locationText}
            {dealerPhoneText ? ` · ${dealerPhoneText}` : ""}
          </div>
        </div>
      </footer>

      {/* ───── MOBILE STICKY CTAs ───── */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 grid gap-2 border-t border-border bg-background/95 p-3 shadow-2xl backdrop-blur-md md:hidden ${
          dealerPhone ? "grid-cols-2" : "grid-cols-1"
        }`}
      >
        <Button asChild className="h-11 min-w-0 bg-accent text-accent-foreground hover:bg-accent/90">
          <a href={generalSmsHref}>
            <MessageSquare className="mr-2 h-4 w-4 shrink-0" />
            Text Us
          </a>
        </Button>
        {dealerPhone && (
          <Button asChild variant="outline" className="h-11 min-w-0">
            <a href={`tel:${dealerPhone}`}>
              <Phone className="mr-2 h-4 w-4 shrink-0" />
              Call Us
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

function DealerLogo() {
  return (
    <span className="flex h-12 w-[8rem] shrink-0 items-center overflow-visible sm:w-[9.5rem]">
      <img
        src={dealerLogo}
        alt="Hummel Auto Sales LLC"
        className="h-12 w-auto origin-left object-contain"
        style={{ maxWidth: "none" }}
      />
    </span>
  );
}

function VehicleCard({
  vehicle: v,
  dealerPhone,
  dealerPhoneDisplay,
  locationText,
}: {
  vehicle: any;
  dealerPhone: string;
  dealerPhoneDisplay: string;
  locationText: string;
}) {
  const photos: string[] = v.permanent_photos ?? [];
  const [idx, setIdx] = useState(0);

  const priceNum = (() => {
    const digits = String(v.price ?? "").replace(/[^0-9.]/g, "");
    const n = parseFloat(digits);
    return Number.isFinite(n) ? n : null;
  })();
  const isAvailable = !v.is_sold;

  const isPlaceholder = (x: any) => !x || /^(not found|see fb listing)$/i.test(String(x).trim());
  const showMileage = !isPlaceholder(v.mileage);
  const showTrans = !isPlaceholder(v.transmission);
  const d = v.details || {};
  const isTitleStatusText = (x: any) =>
    /\b(clean|salvage|rebuilt|lien|lemon)\s+title\b/i.test(String(x || ""));
  const exteriorColor = isTitleStatusText(d.exterior_color) ? "" : d.exterior_color;
  const interiorColor = isTitleStatusText(d.interior_color) ? "" : d.interior_color;
  const hasAbout =
    showMileage ||
    showTrans ||
    exteriorColor ||
    interiorColor ||
    d.fuel_economy ||
    d.title_status;

  const prev = (e: React.MouseEvent) => {
    e.preventDefault();
    setIdx((i) => (i - 1 + photos.length) % photos.length);
  };
  const next = (e: React.MouseEvent) => {
    e.preventDefault();
    setIdx((i) => (i + 1) % photos.length);
  };

  const cover = photos[0];
  const smsHref = dealerPhone
    ? `sms:${dealerPhone}?&body=${encodeURIComponent(
        `Hi, I'm interested in the ${v.title}. Is it still available?`,
      )}`
    : "#contact";

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Card className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-xl border-border/80 bg-card p-0 transition-all hover:-translate-y-1 hover:border-accent/50 hover:shadow-xl">
          <div className="relative aspect-[4/3] overflow-hidden bg-muted">
            {v.is_sold ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/55">
                <span className="rotate-[-18deg] rounded border-4 border-red-500 px-5 py-1 font-display text-2xl font-black tracking-widest text-red-500">
                  SOLD
                </span>
              </div>
            ) : isAvailable ? (
              <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-accent-foreground shadow">
                <span className="h-1.5 w-1.5 rounded-full bg-white" /> Available
              </span>
            ) : null}
            {cover ? (
              <img
                src={cover}
                alt={v.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No photo
              </div>
            )}
            {photos.length > 1 && (
              <span className="absolute bottom-3 right-3 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                {photos.length} photos
              </span>
            )}
          </div>
          <CardContent className="flex flex-1 flex-col gap-2 p-4">
            <h3 className="line-clamp-1 font-display text-base font-bold leading-tight text-ink">
              {v.title}
            </h3>
            <div className="mt-auto flex items-baseline gap-2 pt-1">
              <span
                className={`font-display text-xl font-extrabold text-accent${
                  v.is_sold ? " line-through opacity-60" : ""
                }`}
              >
                {v.price}
              </span>
              {priceNum !== null && (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  OBO
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </DialogTrigger>

      <DialogContent className="w-[95vw] max-w-5xl gap-0 overflow-hidden border-0 p-0 max-h-[92vh] md:h-[86vh]">
        <div className="flex max-h-[92vh] flex-col overflow-y-auto md:grid md:h-full md:max-h-none md:grid-cols-[1.2fr_1fr] md:overflow-hidden">
          {/* LEFT — gallery */}
          <div className="flex min-w-0 flex-col bg-black md:min-h-0">
            <div className="relative flex min-h-0 flex-1 items-center justify-center">
              {v.is_sold && (
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/40">
                  <span className="rotate-[-20deg] rounded border-4 border-red-500 px-5 py-1 text-3xl font-black tracking-widest text-red-500">
                    SOLD
                  </span>
                </div>
              )}
              {photos.length > 0 ? (
                <>
                  <img
                    key={idx}
                    src={photos[idx]}
                    alt={`${v.title} photo ${idx + 1}`}
                    className="max-h-[50vh] w-full object-contain md:max-h-full"
                  />
                  {photos.length > 1 && (
                    <>
                      <button
                        onClick={prev}
                        className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-2 text-gray-800 shadow-lg hover:bg-white"
                        aria-label="Previous photo"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        onClick={next}
                        className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/90 p-2 text-gray-800 shadow-lg hover:bg-white"
                        aria-label="Next photo"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </>
                  )}
                </>
              ) : (
                <div className="flex h-full w-full items-center justify-center py-24 text-sm text-white/60">
                  No photo
                </div>
              )}
            </div>
            {photos.length > 1 && (
              <div className="flex shrink-0 gap-1 bg-black/90 p-2">
                {photos.map((ph, i) => (
                  <button
                    key={i}
                    onClick={() => setIdx(i)}
                    className={`aspect-[4/3] min-w-0 flex-1 overflow-hidden rounded border-2 ${
                      i === idx
                        ? "border-accent"
                        : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                    aria-label={`Photo ${i + 1}`}
                  >
                    <img src={ph} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT — details */}
          <div className="min-w-0 bg-card p-6 sm:p-7 md:min-h-0 md:overflow-y-auto">
            <DialogTitle className="pr-8 font-display text-2xl font-bold leading-snug text-ink">
              {v.title}
            </DialogTitle>
            <div className="mt-2 flex items-baseline gap-2">
              <span
                className={`font-display text-3xl font-extrabold text-accent${
                  v.is_sold ? " line-through opacity-60" : ""
                }`}
              >
                {v.price}
              </span>
              {priceNum !== null && (
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  OBO
                </span>
              )}
            </div>
            <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> {locationText}
            </p>

            {v.is_sold ? (
              <div className="mt-5 rounded-lg border border-border bg-muted py-3 text-center text-sm font-medium text-muted-foreground">
                This vehicle has sold
              </div>
            ) : (
              <div className="mt-6 flex flex-col gap-2">
                <Button
                  asChild
                  size="lg"
                  className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  <a href={smsHref}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Text About This Car
                  </a>
                </Button>
                {dealerPhone && (
                  <Button asChild variant="outline" size="lg" className="w-full">
                    <a href={`tel:${dealerPhone}`}>
                      <Phone className="mr-2 h-4 w-4" />
                      Call {dealerPhoneDisplay}
                    </a>
                  </Button>
                )}
              </div>
            )}

            {hasAbout && (
              <div className="mt-7 border-t border-border pt-5">
                <h4 className="mb-4 font-display text-base font-bold text-ink">
                  About this vehicle
                </h4>
                <div className="grid grid-cols-1 gap-x-5 gap-y-3 text-sm text-muted-foreground sm:grid-cols-2">
                  {showMileage && (
                    <div className="flex items-center gap-2.5">
                      <Gauge className="h-4 w-4 shrink-0 text-accent" />
                      <span>
                        {/^\d/.test(String(v.mileage))
                          ? `Driven ${v.mileage}`
                          : v.mileage}
                      </span>
                    </div>
                  )}
                  {showTrans && (
                    <div className="flex items-center gap-2.5">
                      <Settings className="h-4 w-4 shrink-0 text-accent" />
                      <span>
                        {/transmission/i.test(String(v.transmission))
                          ? v.transmission
                          : `${v.transmission} transmission`}
                      </span>
                    </div>
                  )}
                  {(exteriorColor || interiorColor) && (
                    <div className="flex items-center gap-2.5">
                      <Palette className="h-4 w-4 shrink-0 text-accent" />
                      <span>
                        {exteriorColor ? `Exterior: ${exteriorColor}` : ""}
                        {exteriorColor && interiorColor ? " · " : ""}
                        {interiorColor ? `Interior: ${interiorColor}` : ""}
                      </span>
                    </div>
                  )}
                  {v.details?.fuel_economy && (
                    <div className="flex items-center gap-2.5">
                      <Fuel className="h-4 w-4 shrink-0 text-accent" />
                      <span>{v.details.fuel_economy}</span>
                    </div>
                  )}
                  {v.details?.title_status && (
                    <div className="flex items-start gap-2.5">
                      <FileCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      <span>
                        <span className="capitalize">{v.details.title_status}</span>
                        {/clean/i.test(String(v.details.title_status)) && (
                          <span className="block text-xs">
                            This vehicle has no significant damage or problems.
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {v.description && (
              <div className="mt-7 border-t border-border pt-5">
                <h4 className="mb-2 font-display text-base font-bold text-ink">Description</h4>
                <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {v.description}
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
