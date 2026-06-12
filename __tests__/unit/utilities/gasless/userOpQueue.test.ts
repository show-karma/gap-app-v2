import { serializeBySender, withUserOpSerialization } from "@/utilities/gasless/utils/userOpQueue";

const SENDER_A = "0xAAAA000000000000000000000000000000000000";
const SENDER_B = "0xBBBB000000000000000000000000000000000000";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe("serializeBySender", () => {
  it("runs ops for the same sender one at a time, in order", async () => {
    const events: string[] = [];
    const first = deferred<void>();

    const op1 = serializeBySender(SENDER_A, async () => {
      events.push("1:start");
      await first.promise;
      events.push("1:end");
    });

    const op2 = serializeBySender(SENDER_A, async () => {
      events.push("2:start");
      events.push("2:end");
    });

    // Op2 must not begin until op1 resolves, even though both were queued.
    await Promise.resolve();
    expect(events).toEqual(["1:start"]);

    first.resolve();
    await Promise.all([op1, op2]);

    expect(events).toEqual(["1:start", "1:end", "2:start", "2:end"]);
  });

  it("does not block a different sender", async () => {
    const events: string[] = [];
    const blockA = deferred<void>();

    const opA = serializeBySender(SENDER_A, async () => {
      events.push("A:start");
      await blockA.promise;
      events.push("A:end");
    });

    const opB = serializeBySender(SENDER_B, async () => {
      events.push("B:done");
    });

    await opB;
    // B finished while A is still pending — senders are independent.
    expect(events).toEqual(["A:start", "B:done"]);

    blockA.resolve();
    await opA;
    expect(events).toEqual(["A:start", "B:done", "A:end"]);
  });

  it("propagates the task's error to the caller", async () => {
    const boom = new Error("AA25");
    await expect(
      serializeBySender(SENDER_A, async () => {
        throw boom;
      })
    ).rejects.toBe(boom);
  });

  it("keeps draining the queue after one op rejects", async () => {
    const order: string[] = [];

    const failing = serializeBySender(SENDER_A, async () => {
      order.push("fail");
      throw new Error("boom");
    });
    const next = serializeBySender(SENDER_A, async () => {
      order.push("next");
      return "ok";
    });

    await expect(failing).rejects.toThrow("boom");
    await expect(next).resolves.toBe("ok");
    expect(order).toEqual(["fail", "next"]);
  });

  it("serializes ops with an undefined sender under the shared fallback key", async () => {
    // When the smart-account address can't be read it's almost always the same
    // wallet in-session, so undefined senders must still serialize together to
    // keep the nonce safe.
    const order: string[] = [];
    const gate = deferred<void>();

    const op1 = serializeBySender(undefined, async () => {
      order.push("1");
      await gate.promise;
    });
    const op2 = serializeBySender(undefined, async () => {
      order.push("2");
    });

    await Promise.resolve();
    expect(order).toEqual(["1"]);

    gate.resolve();
    await Promise.all([op1, op2]);
    expect(order).toEqual(["1", "2"]);
  });
});

describe("withUserOpSerialization", () => {
  it("serializes eth_sendTransaction calls and passes other methods through", async () => {
    const active = { count: 0, max: 0 };
    const gate = deferred<void>();
    let firstSend = true;

    const provider = {
      request: async ({ method }: { method: string; params?: unknown }) => {
        if (method === "eth_sendTransaction") {
          active.count += 1;
          active.max = Math.max(active.max, active.count);
          // Hold the first send open so a second concurrent send would overlap
          // if serialization were not in effect.
          if (firstSend) {
            firstSend = false;
            await gate.promise;
          }
          active.count -= 1;
          return "0xhash";
        }
        return "0xchainid";
      },
    };

    const wrapped = withUserOpSerialization(provider, SENDER_A);

    const send1 = wrapped.request({ method: "eth_sendTransaction" });
    const send2 = wrapped.request({ method: "eth_sendTransaction" });

    // A non-send call resolves immediately, not blocked by the in-flight send.
    await expect(wrapped.request({ method: "eth_chainId" })).resolves.toBe("0xchainid");

    gate.resolve();
    await Promise.all([send1, send2]);

    // Never more than one send running at once.
    expect(active.max).toBe(1);
  });
});
