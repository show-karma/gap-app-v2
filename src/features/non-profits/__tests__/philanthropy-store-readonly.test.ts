import { beforeEach, describe, expect, it } from "vitest";
import { usePhilanthropyStore } from "../store/philanthropy";

/**
 * `readOnly` is set when persistence returns 403 (the conversation belongs to
 * another account); the ChatView disables the composer and shows a read-only
 * notice. These guard the flag's default and — importantly — that `reset()`
 * clears it (reset spreads initialState, so the field must live there too).
 */
describe("usePhilanthropyStore readOnly", () => {
  beforeEach(() => {
    usePhilanthropyStore.getState().reset();
  });

  it("defaults to false", () => {
    expect(usePhilanthropyStore.getState().readOnly).toBe(false);
  });

  it("setReadOnly flips the flag", () => {
    usePhilanthropyStore.getState().setReadOnly(true);
    expect(usePhilanthropyStore.getState().readOnly).toBe(true);
  });

  it("reset() clears the flag (e.g. on New chat)", () => {
    usePhilanthropyStore.getState().setReadOnly(true);
    usePhilanthropyStore.getState().reset();
    expect(usePhilanthropyStore.getState().readOnly).toBe(false);
  });
});

describe("usePhilanthropyStore notFound", () => {
  beforeEach(() => {
    usePhilanthropyStore.getState().reset();
  });

  it("defaults to false", () => {
    expect(usePhilanthropyStore.getState().notFound).toBe(false);
  });

  it("setNotFound flips the flag", () => {
    usePhilanthropyStore.getState().setNotFound(true);
    expect(usePhilanthropyStore.getState().notFound).toBe(true);
  });

  it("reset() clears the flag", () => {
    usePhilanthropyStore.getState().setNotFound(true);
    usePhilanthropyStore.getState().reset();
    expect(usePhilanthropyStore.getState().notFound).toBe(false);
  });
});

describe("usePhilanthropyStore conversationFull", () => {
  beforeEach(() => {
    usePhilanthropyStore.getState().reset();
  });

  it("defaults to false", () => {
    expect(usePhilanthropyStore.getState().conversationFull).toBe(false);
  });

  it("setConversationFull flips the flag", () => {
    usePhilanthropyStore.getState().setConversationFull(true);
    expect(usePhilanthropyStore.getState().conversationFull).toBe(true);
  });

  it("reset() clears the flag", () => {
    usePhilanthropyStore.getState().setConversationFull(true);
    usePhilanthropyStore.getState().reset();
    expect(usePhilanthropyStore.getState().conversationFull).toBe(false);
  });
});

describe("usePhilanthropyStore loginRequired", () => {
  beforeEach(() => {
    usePhilanthropyStore.getState().reset();
  });

  it("defaults to false", () => {
    expect(usePhilanthropyStore.getState().loginRequired).toBe(false);
  });

  it("setLoginRequired flips the flag", () => {
    usePhilanthropyStore.getState().setLoginRequired(true);
    expect(usePhilanthropyStore.getState().loginRequired).toBe(true);
  });

  it("reset() clears the flag (e.g. on New chat)", () => {
    usePhilanthropyStore.getState().setLoginRequired(true);
    usePhilanthropyStore.getState().reset();
    expect(usePhilanthropyStore.getState().loginRequired).toBe(false);
  });
});
