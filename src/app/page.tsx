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
    <main className="pb-bg flex min-h-dvh w-full flex-col">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
        <header className="flex flex-col items-center gap-2 text-center">
          <Bomb size={150} className="pb-wobble" />
          <h1
            className="font-display text-[3.6rem] leading-none text-[#ffe066] sm:text-7xl"
            style={{ WebkitTextStroke: "4px #1d0842", paintOrder: "stroke fill", textShadow: "0 7px 0 #ff006e" }}
          >
            PIKABOOM
          </h1>
          <p className="font-extrabold text-white/75">Juegos de fiesta con una bomba. ¡Pasa el teléfono antes de que explote!</p>
        </header>

        <AdultToggle />

        <section className="grid grid-cols-2 gap-4">
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

        <Link href="/charades" className="pb-btn mt-auto h-16 w-full text-3xl" style={{ ["--btn" as string]: "#06d6a0" }}>
          JUGAR CHARADAS
        </Link>
      </div>
    </main>
  );
}
