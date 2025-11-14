"use client"
import type { MarkdownPreviewProps } from "@uiw/react-markdown-preview"
import type React from "react"
import { useEffect, useState } from "react"
import { MarkdownPreview } from "@/components/Utilities/MarkdownPreview"

interface Props {
  words?: any
  children: string
  readMoreText?: string
  readLessText?: string
  side?: "left" | "right"
  markdownClass?: MarkdownPreviewProps["className"]
  markdownComponents?: MarkdownPreviewProps["components"]
  othersideButton?: React.ReactNode
}

export const ReadMore = ({
  words,
  children,
  readMoreText = "Read more",
  readLessText = "Read less",
  side = "right",
  markdownClass,
  markdownComponents,
  othersideButton,
}: Props) => {
  const [isReadMore, setIsReadMore] = useState(true)
  const toggleReadMore = () => {
    setIsReadMore(!isReadMore)
  }

  const text = children ? children : ""

  const getMinimumText = () => {
    let wordsCounter = 400
    for (let i = words || 400; i < text.length; i++) {
      const regex = /\s/
      if (!regex.test(text[i])) {
        wordsCounter++
      } else {
        wordsCounter++
        break
      }
    }
    return wordsCounter
  }

  // Function to safely truncate markdown without breaking syntax elements
  const safelyTruncateMarkdown = (text: string, cutoffLength: number) => {
    if (text.length <= cutoffLength) return text

    // Basic cut position
    let cutPosition = cutoffLength

    // Find all markdown link structures in the text
    const linkMatches: { start: number; end: number }[] = []
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
    let match

    while ((match = linkRegex.exec(text)) !== null) {
      linkMatches.push({
        start: match.index,
        end: match.index + match[0].length,
      })
    }

    // Check if we're cutting in the middle of a link
    let insideLink = false
    let linkStart = -1

    for (const link of linkMatches) {
      if (cutPosition > link.start && cutPosition < link.end) {
        insideLink = true
        linkStart = link.start
        break
      }
    }

    // If we're inside a link, move cut position to before the link
    if (insideLink && linkStart >= 0) {
      // Find the last space before the link
      const lastSpaceBeforeLink = text.lastIndexOf(" ", linkStart)
      if (lastSpaceBeforeLink >= 0) {
        cutPosition = lastSpaceBeforeLink
      } else {
        cutPosition = linkStart
      }
    }

    // Individual markdown characters to track
    const specialChars = [
      { char: "[", closes: "]", importance: 10 }, // Links part 1
      { char: "]", closes: "[", importance: 10 }, // Links part 1 closure
      { char: "(", closes: ")", importance: 9 }, // Links part 2 or Parens
      { char: ")", closes: "(", importance: 9 }, // Links part 2 closure
      { char: "*", importance: 8 }, // Bold/Italic
      { char: "_", importance: 8 }, // Alternate Bold/Italic
      { char: "`", importance: 7 }, // Code
      { char: "~", importance: 6 }, // Strikethrough
      { char: ">", importance: 5 }, // Blockquote
      { char: "#", importance: 5 }, // Heading
    ]

    // Check for unbalanced markdown syntax by tracking the stack of opened elements
    const textBeforeCut = text.substring(0, cutPosition)
    const stack: { char: string; position: number }[] = []

    // Track all special characters in the text before cut
    for (let i = 0; i < textBeforeCut.length; i++) {
      // Look for multi-character patterns
      if (textBeforeCut.substring(i, i + 3) === "```") {
        // Handle code blocks (```)
        const item = { char: "```", position: i }
        const matchingIndex = stack.findIndex((s) => s.char === "```")
        if (matchingIndex !== -1) {
          stack.splice(matchingIndex, 1) // Remove the matching open
        } else {
          stack.push(item) // Add to stack
        }
        i += 2 // Skip next two characters
        continue
      }

      if (textBeforeCut.substring(i, i + 2) === "**") {
        // Handle bold (**)
        const item = { char: "**", position: i }
        const matchingIndex = stack.findIndex((s) => s.char === "**")
        if (matchingIndex !== -1) {
          stack.splice(matchingIndex, 1) // Remove the matching open
        } else {
          stack.push(item) // Add to stack
        }
        i += 1 // Skip next character
        continue
      }

      if (textBeforeCut.substring(i, i + 2) === "__") {
        // Handle alternate bold (__)
        const item = { char: "__", position: i }
        const matchingIndex = stack.findIndex((s) => s.char === "__")
        if (matchingIndex !== -1) {
          stack.splice(matchingIndex, 1) // Remove the matching open
        } else {
          stack.push(item) // Add to stack
        }
        i += 1 // Skip next character
        continue
      }

      // Check for link syntax specifically - this is critical for URLs
      if (i > 0 && textBeforeCut[i] === "(" && textBeforeCut[i - 1] === "]") {
        // We're at the beginning of a URL in a markdown link
        // Find where this URL ends (the closing parenthesis)
        let urlEndPos = -1
        let openParens = 1

        for (let j = i + 1; j < textBeforeCut.length; j++) {
          if (textBeforeCut[j] === "(") {
            openParens++
          } else if (textBeforeCut[j] === ")") {
            openParens--
            if (openParens === 0) {
              urlEndPos = j
              break
            }
          }
        }

        // If we found the end of the URL but it's after our cut position
        if (urlEndPos > cutPosition || urlEndPos === -1) {
          // We're cutting in the middle of a URL, so find the [ that starts this link
          let linkTextStart = -1
          for (let j = i - 2; j >= 0; j--) {
            if (textBeforeCut[j] === "[") {
              linkTextStart = j
              break
            }
          }

          if (linkTextStart >= 0) {
            // Find the last space before the link
            const lastSpaceBeforeLink = text.lastIndexOf(" ", linkTextStart)
            if (lastSpaceBeforeLink >= 0) {
              cutPosition = Math.min(cutPosition, lastSpaceBeforeLink)
            } else {
              cutPosition = Math.min(cutPosition, linkTextStart)
            }

            // Skip the rest of the checks since we've decided to cut before the link
            break
          }
        }

        // If we have a complete URL, skip past it
        if (urlEndPos > 0) {
          i = urlEndPos
          continue
        }
      }

      // Single character checks
      for (const special of specialChars) {
        if (textBeforeCut[i] === special.char) {
          // Special handling for nested combinations
          if (special.char === "(" && i > 0 && textBeforeCut[i - 1] === "]") {
            // This is potentially a link - keep track of it
            const item = { char: "](", position: i - 1 }
            stack.push(item)
          } else if (special.closes) {
            // This is a character that can be closed
            const matchingIndex = stack.findIndex((s) => s.char === special.closes)
            if (matchingIndex !== -1) {
              stack.splice(matchingIndex, 1) // Remove the matching open
            } else {
              stack.push({ char: special.char, position: i })
            }
          } else {
            // Standalone special character
            if (special.char === "*" || special.char === "_") {
              // Check if it's a single * or a ** (already handled)
              if (i + 1 < textBeforeCut.length && textBeforeCut[i + 1] === special.char) {
                continue // Skip - this is part of ** or __ which is handled above
              }

              // Single * or _ - find matching single character
              const item = { char: special.char, position: i }
              const matchingIndex = stack.findIndex((s) => s.char === special.char)
              if (matchingIndex !== -1) {
                stack.splice(matchingIndex, 1) // Remove the matching open
              } else {
                stack.push(item) // Add to stack
              }
            } else {
              stack.push({ char: special.char, position: i })
            }
          }
          break
        }
      }
    }

    // If we have unbalanced elements, find the earliest one
    if (stack.length > 0) {
      // Sort by position, earliest first
      stack.sort((a, b) => a.position - b.position)

      // Find the earliest position of all unbalanced markdown elements
      const earliestPosition = stack[0].position

      // Find the last space before this position
      const lastSpaceBeforeMarkdown = textBeforeCut.lastIndexOf(" ", earliestPosition)

      if (lastSpaceBeforeMarkdown !== -1) {
        cutPosition = Math.min(cutPosition, lastSpaceBeforeMarkdown)
      } else if (earliestPosition > 0) {
        // If no space, just cut before the earliest markdown
        cutPosition = Math.min(cutPosition, earliestPosition)
      }
    } else if (!insideLink) {
      // Even if balanced and not inside a link, still find a good break point
      const lastSpaceBeforeCut = text.lastIndexOf(" ", cutPosition)
      if (lastSpaceBeforeCut > 0 && cutPosition - lastSpaceBeforeCut < 20) {
        cutPosition = lastSpaceBeforeCut
      }
    }

    return text.slice(0, cutPosition)
  }

  useEffect(() => {
    if (text && text.length - 1 < getMinimumText()) {
      setIsReadMore(false)
    } else {
      setIsReadMore(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])

  return (
    <div className="w-full max-w-full">
      {isReadMore ? (
        <MarkdownPreview
          className={markdownClass}
          source={
            safelyTruncateMarkdown(text, getMinimumText()) +
            (text.length >= getMinimumText() ? "..." : "")
          }
        />
      ) : (
        <MarkdownPreview className={markdownClass} source={text} />
      )}
      {text.length - 1 > getMinimumText() ? (
        <div onClick={toggleReadMore} className="read-or-hide mt-2">
          {isReadMore ? (
            <>
              <div
                className="text-sm font-semibold leading-tight text-blue-600 dark:text-blue-300 w-full flex flex-row justify-between"
                style={{
                  flexDirection: side === "left" ? "row" : "row-reverse",
                }}
              >
                <span className="cursor-pointer">{readMoreText}</span>
                {othersideButton}
              </div>
            </>
          ) : (
            <div
              className="text-sm font-semibold leading-tight text-blue-600 dark:text-blue-300 w-full flex flex-row justify-between"
              style={{
                flexDirection: side === "left" ? "row" : "row-reverse",
              }}
            >
              <span className="cursor-pointer">{readLessText}</span>
              {othersideButton}
            </div>
          )}
        </div>
      ) : othersideButton ? (
        <div
          className="text-sm font-semibold leading-tight text-blue-600 dark:text-blue-300 w-full flex flex-row justify-between"
          style={{
            flexDirection: side === "left" ? "row-reverse" : "row",
          }}
        >
          {othersideButton}
        </div>
      ) : null}
    </div>
  )
}
