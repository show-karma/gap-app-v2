import { Bricolage_Grotesque, Spectral } from "next/font/google";

/**
 * Display face used for the brief's masthead, chapter marks, tabular
 * numerals, and section labels. Bricolage carries the editorial
 * authority we want without leaning on a literary serif. Loaded with
 * the full variable axis so we can tighten display tracking and
 * lean on tabular figures.
 */
export const briefDisplay = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-brief-display",
  display: "swap",
});

/**
 * Editorial prose face used inside the lead candidate's long-form
 * paragraph and pull quote. Spectral's italics carry the
 * pull-quote weight; its slight contrast keeps short paragraphs
 * legible without feeling literary-magazine.
 */
export const briefProse = Spectral({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-brief-prose",
  display: "swap",
});
