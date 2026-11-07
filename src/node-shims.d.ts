// Ambient Node.js >= 20 type declarations for zero-dependency builds
declare module 'node:crypto' {
  export function createHash(algorithm: string): {
    update(data: string): { digest(encoding: 'hex'): string };
  };
}

declare module 'node:fs' {
  export function existsSync(path: string): boolean;
  export function mkdirSync(path: string, options?: { recursive?: boolean }): void;
  export function readFileSync(path: string, encoding: 'utf8'): string;
  export function writeFileSync(path: string, data: string, encoding?: 'utf8'): void;
}

declare module 'node:path' {
  export function join(...paths: string[]): string;
  export function dirname(path: string): string;
}

declare module 'node:os' {
  export function homedir(): string;
}

declare module 'node:readline' {
  export interface Interface {
    on(event: 'line', listener: (line: string) => void): this;
  }
  export function createInterface(options: {
    input: unknown;
    output?: unknown;
    terminal?: boolean;
    crlfDelay?: number;
  }): Interface;
}

declare module 'node:http' {
  export interface IncomingMessage {
    url?: string;
    method?: string;
    headers: Record<string, string | undefined>;
    on(event: 'data', listener: (chunk: Buffer) => void): void;
    on(event: 'end', listener: () => void): void;
    on(event: 'error', listener: (err: Error) => void): void;
  }
  export interface ServerResponse {
    setHeader(name: string, value: string): void;
    writeHead(statusCode: number, headers?: Record<string, string>): void;
    end(data?: string): void;
  }
  export interface Server {
    listen(port: number, hostOrCb?: string | (() => void), cb?: () => void): this;
    close(cb?: (err?: Error) => void): this;
    address(): { port: number } | string | null;
  }
  export function createServer(
    requestListener: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>
  ): Server;
}

declare module 'node:test' {
  export function describe(name: string, fn: () => void | Promise<void>): void;
  export function it(name: string, fn: () => void | Promise<void>): void;
}

declare module 'node:assert/strict' {
  const assert: {
    equal<T>(actual: T, expected: T, message?: string): void;
    notEqual<T>(actual: T, expected: T, message?: string): void;
    deepEqual<T>(actual: T, expected: T, message?: string): void;
    ok(value: unknown, message?: string): asserts value;
    throws(fn: () => unknown, expected?: unknown, message?: string): void;
  };
  export default assert;
}

interface Buffer {
  toString(encoding?: string): string;
}
declare const Buffer: {
  concat(list: Buffer[]): Buffer;
};

declare const process: {
  argv: string[];
  env: Record<string, string | undefined>;
  cwd(): string;
  stdin: unknown;
  stdout: { write(str: string): void };
};

declare const console: {
  log(...args: unknown[]): void;
  error(...args: unknown[]): void;
};

declare class URL {
  pathname: string;
  constructor(url: string, base?: string);
}

declare function fetch(
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  }
): Promise<{
  ok: boolean;
  status: number;
  json(): Promise<any>;
  text(): Promise<string>;
}>;
