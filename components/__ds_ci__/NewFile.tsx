// GOLDEN POSITIVE — DS001 arbitrary-color-class. Expect 6 DS001 errors, 0 of any other rule.
export function Ds001Pos() {
  return (
    <div>
      <div className="bg-[#123456] p-2" />
      <span className="text-[#f0f]">x</span>
      <div className="border-[rgb(12,34,56)]" />
      <div className="ring-[hsla(210,50%,40%,0.4)]" />
      <div className="dark:hover:bg-[oklch(0.7_0.1_200)]/70" />
      <div className="shadow-[0_1px_2px_rgba(0,0,0,0.4)]" />
    </div>
  );
}
