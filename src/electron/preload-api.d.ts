export interface AceFileResult<T> {
  readonly success: true;
  readonly value: T;
}
export interface AceFileError {
  readonly success: false;
  readonly error: string;
}

export type AceFileResponse<T> = AceFileResult<T> | AceFileError;

export interface AceStat {
  readonly size: number;
  readonly createdAt: number;
  readonly modifiedAt: number;
}

export interface AceWriteResult {
  readonly success: boolean;
  readonly error?: string;
}

export interface AceMediaPick {
  readonly name: string;
  readonly path: string;
  readonly bytes: Uint8Array;
}

export interface AceFileApi {
  read(path: string): Promise<AceFileResponse<Uint8Array>>;
  write(path: string, data: Uint8Array): Promise<AceWriteResult>;
  exists(path: string): Promise<AceFileResponse<boolean>>;
  stat(path: string): Promise<AceFileResponse<AceStat>>;
  delete(path: string): Promise<AceWriteResult>;
  list(dir: string): Promise<AceFileResponse<string[]>>;
  move(src: string, dest: string): Promise<AceWriteResult>;
}

export interface AceApi {
  readonly file: AceFileApi;
  readonly pickMedia: () => Promise<AceFileResponse<AceMediaPick> | null>;
}

declare global {
  interface Window {
    readonly ace?: AceApi;
  }
}
