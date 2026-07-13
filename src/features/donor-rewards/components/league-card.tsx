"use client";

import { Shield } from "lucide-react";
import React, { useMemo } from "react";
import { LEAGUE_PEERS } from "../data/mock-data";
import { useRewards } from "../state/rewards-context";
import type { LeaguePeer } from "../types";
import { formatNumber } from "../utils/format";

const PEER_POINTS = [2890, 2610, 2380, 2050, 1740, 1420, 980];

const LeagueRow = React.memo(function LeagueRow({
  peer,
  rank,
}: {
  peer: LeaguePeer;
  rank: number;
}) {
  return (
    <li
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
        peer.isUser
          ? "bg-emerald-50 ring-2 ring-emerald-400 dark:bg-emerald-950/40 dark:ring-emerald-600"
          : ""
      }`}
    >
      <span
        className={`w-6 text-center font-mono text-sm font-bold ${
          rank <= 3 ? "text-amber-500" : "text-stone-400 dark:text-stone-500"
        }`}
      >
        {rank}
      </span>
      <span className="text-xl">{peer.emoji}</span>
      <span
        className={`flex-1 truncate text-sm ${
          peer.isUser
            ? "font-bold text-emerald-800 dark:text-emerald-300"
            : "font-medium text-stone-700 dark:text-stone-300"
        }`}
      >
        {peer.isUser ? "You" : peer.alias}
      </span>
      <span className="font-mono text-sm font-semibold text-stone-500 dark:text-stone-400">
        {formatNumber(peer.points)}
      </span>
    </li>
  );
});

export function LeagueCard() {
  const { state } = useRewards();

  const standings = useMemo(() => {
    const peers: LeaguePeer[] = LEAGUE_PEERS.map((peer, index) => ({
      ...peer,
      points: PEER_POINTS[index],
      isUser: false,
    }));
    peers.push({ id: "you", alias: "You", emoji: "🦉", points: state.xp, isUser: true });
    return peers.sort((a, b) => b.points - a.points);
  }, [state.xp]);

  const userRank = standings.findIndex((peer) => peer.isUser) + 1;
  const percentile = Math.max(1, Math.round((userRank / standings.length) * 100));

  return (
    <section
      aria-label="Giving league"
      className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900"
    >
      <div className="flex items-center gap-3">
        <Shield className="h-5 w-5 text-emerald-700 dark:text-emerald-500" aria-hidden="true" />
        <div>
          <h2 className="[font-family:var(--font-display)] text-xl font-medium text-stone-900 dark:text-white">
            Emerald League
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Top {percentile}% most consistent givers among accounts your size
          </p>
        </div>
      </div>

      <ol className="mt-4 flex flex-col gap-1">
        {standings.map((peer, index) => (
          <LeagueRow key={peer.id} peer={peer} rank={index + 1} />
        ))}
      </ol>

      <p className="mt-4 text-xs text-stone-400 dark:text-stone-500">
        Rankings are based on giving consistency, never dollar amounts. Aliases keep everyone
        anonymous.
      </p>
    </section>
  );
}
