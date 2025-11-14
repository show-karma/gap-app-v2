import { reduceText } from "../reduceText"

describe("reduceText", () => {
  it("should reduce text to default 20 words", () => {
    const text =
      "one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty twentyone twentytwo"
    const result = reduceText(text)
    const wordCount = result.split(" ").length
    expect(wordCount).toBe(20)
    expect(result).toBe(
      "one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty"
    )
  })

  it("should reduce text to specified number of words", () => {
    const text = "word1 word2 word3 word4 word5 word6 word7 word8 word9 word10"
    const result = reduceText(text, 5)
    expect(result).toBe("word1 word2 word3 word4 word5")
  })

  it("should return all words if text is shorter than limit", () => {
    const text = "just a few words"
    const result = reduceText(text, 20)
    expect(result).toBe(text)
  })

  it("should handle single word", () => {
    const text = "word"
    const result = reduceText(text, 5)
    expect(result).toBe("word")
  })

  it("should handle empty string", () => {
    const text = ""
    const result = reduceText(text)
    expect(result).toBe("")
  })

  it("should handle text with exactly the word limit", () => {
    const text = "one two three four five"
    const result = reduceText(text, 5)
    expect(result).toBe(text)
  })

  it("should handle text with multiple spaces", () => {
    const text = "word1  word2   word3    word4"
    const result = reduceText(text, 2)
    expect(result).toBe("word1 ")
  })

  it("should handle special characters in words", () => {
    const text = "hello@world test#123 foo$bar baz%qux"
    const result = reduceText(text, 2)
    expect(result).toBe("hello@world test#123")
  })

  it("should handle text with newlines and tabs", () => {
    const text = "word1\nword2\tword3 word4 word5"
    const result = reduceText(text, 3)
    // Split by space, so \n and \t are part of the words
    const words = result.split(" ")
    expect(words.length).toBe(3)
  })

  it("should reduce to 1 word", () => {
    const text = "first second third fourth"
    const result = reduceText(text, 1)
    expect(result).toBe("first")
  })

  it("should reduce to 0 words", () => {
    const text = "some words here"
    const result = reduceText(text, 0)
    expect(result).toBe("")
  })

  it("should handle long words", () => {
    const longWord = "a".repeat(1000)
    const text = `${longWord} word2 word3`
    const result = reduceText(text, 2)
    expect(result).toBe(`${longWord} word2`)
  })

  it("should handle text with punctuation", () => {
    const text = "Hello, world! How are you? I am fine, thank you."
    const result = reduceText(text, 5)
    expect(result).toBe("Hello, world! How are you?")
  })

  it("should preserve word order", () => {
    const text = "first second third fourth fifth"
    const result = reduceText(text, 3)
    expect(result).toBe("first second third")
  })

  it("should handle unicode characters", () => {
    const text = "你好 世界 how are you doing today"
    const result = reduceText(text, 4)
    expect(result).toBe("你好 世界 how are")
  })

  it("should handle emoji in text", () => {
    const text = "😀 😃 😄 😁 😆 😅 🤣 😂"
    const result = reduceText(text, 3)
    expect(result).toBe("😀 😃 😄")
  })

  it("should not add ellipsis or truncation indicator", () => {
    const text = "one two three four five six"
    const result = reduceText(text, 3)
    expect(result).toBe("one two three")
    expect(result.endsWith("...")).toBe(false)
  })

  it("should handle very long text", () => {
    const text = Array(1000).fill("word").join(" ")
    const result = reduceText(text, 10)
    const wordCount = result.split(" ").length
    expect(wordCount).toBe(10)
  })

  it("should handle text with leading/trailing spaces", () => {
    const text = "  word1 word2 word3 word4  "
    const result = reduceText(text, 2)
    // Leading space becomes first "word", then word1
    expect(result.split(" ").filter((w) => w !== "").length).toBeLessThanOrEqual(2)
  })

  it("should handle negative word count", () => {
    const text = "one two three four"
    const result = reduceText(text, -1)
    // Negative slice takes from end, -1 excludes last word
    expect(result).toBe("one two three")
  })

  it("should handle decimal word count by truncating", () => {
    const text = "one two three four five"
    const result = reduceText(text, 2.7)
    // slice(0, 2.7) converts to slice(0, 2)
    const wordCount = result.split(" ").length
    expect(wordCount).toBe(2)
  })

  it("should correctly join words with single space", () => {
    const text = "a b c d e f"
    const result = reduceText(text, 4)
    expect(result).toBe("a b c d")
    expect(result.split("  ").length).toBe(1) // No double spaces
  })
})
