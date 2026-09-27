import Link from "next/link";
import { AdultToggle } from "@/components/game/AdultToggle";
import { Bomb } from "@/components/game/Bomb";

const GAMES = [
  { href: "/charades", title: "Charadas", emoji: "🎭", blurb: "Actúalo. ¡Sin hablar!", color: "#ff4d6d", ready: true },
  { href: "#", title: "Palabra Bomba", emoji: "🔤", blurb: "Próximamente", color: "#3a86ff", ready: false },
  { href: "#", title: "Dibújalo", emoji: "🎨", blurb: "Próximamente", color: "#06d6a0", ready: false },
  { href: "#", title: "Tararéalo", emoji: "🎵", blurb: "Próximamente", color: "#ffbe0b", ready: false },
];

export default function Home() {
  return (
    <main className="pb-bg flex pb-screen w-full flex-col overflow-hidden">
      <div className="pb-safe mx-auto flex h-full w-full max-w-md flex-col gap-4">
        <header className="flex shrink-0 flex-col items-center gap-1 text-center">
          <Bomb size={104} className="pb-wobble" />
          <h1
            className="font-display text-[3.6rem] leading-none text-[#ffe066] sm:text-7xl"
            style={{ WebkitTextStroke: "4px #1d0842", paintOrder: "stroke fill", textShadow: "0 7px 0 #ff006e" }}
          >
            PIKABOOM
          </h1>
          <p className="text-sm font-extrabold text-white/75">Juegos de fiesta con una bomba. ¡Pasa el teléfono antes de que explote!</p>
        </header>

        <div className="shrink-0">
          <AdultToggle />
        </div>

        {/* The only scrollable area in the app — room for more mini games */}
        <section
          aria-label="Minijuegos"
          className="pb-scroll -mx-2 grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-4 px-2 pt-1 pb-3"
          style={{ maskImage: "linear-gradient(transparent, #000 12px, #000 calc(100% - 16px), transparent)" }}
        >
          {GAMES.map((g) => {
            const card = (
              <div
                className={`relative flex aspect-[4/5] flex-col justify-between overflow-hidden rounded-3xl p-4 shadow-xl transition ${g.ready ? "active:scale-95" : "opacity-50 grayscale-[.6]"}`}
                style={{ background: g.color, boxShadow: `0 8px 0 color-mix(in oklab, ${g.color} 65%, black)` }}
              >
                <span className="text-6xl drop-shadow-lg">{g.emoji}</span>
                <div>
                  <h2 className="font-display text-3xl leading-none text-[#1d0842]">{g.title}</h2>
                  <p className="mt-1 text-sm font-black text-[#1d0842]/70">{g.blurb}</p>
                </div>
                {!g.ready && <span className="absolute right-3 top-3 text-2xl">🔒</span>}
              </div>
            );
            return g.ready ? (
              <Link key={g.title} href={g.href}>
                {card}
              </Link>
            ) : (
              <div key={g.title} aria-disabled>
                {card}
              </div>
            );
          })}
        </section>

        <Link href="/charades" className="pb-btn h-16 w-full shrink-0 text-3xl" style={{ ["--btn" as string]: "#06d6a0" }}>
          JUGAR CHARADAS
        </Link>
      </div>
    </main>
  );
}
