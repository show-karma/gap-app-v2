// Mock for multiformats/cid to avoid ESM import issues in Jest

export class CID {
  code: number;
  version: number;
  multihash: Uint8Array;
  bytes: Uint8Array;

  constructor(version: number, code: number, multihash: Uint8Array, bytes?: Uint8Array) {
    this.version = version;
    this.code = code;
    this.multihash = multihash;
    this.bytes = bytes || new Uint8Array();
  }

  static parse(cid: string): CID {
    return new CID(1, 0, new Uint8Array(), new Uint8Array());
  }

  static create(version: number, code: number, multihash: Uint8Array): CID {
    return new CID(version, code, multihash);
  }

  toString(): string {
    return "mock-cid";
  }

  toJSON(): object {
    return {
      version: this.version,
      code: this.code,
      multihash: this.multihash,
    };
  }
}

// Export as both named and default
module.exports = { CID };
module.exports.CID = CID;
