declare module "ssh2-sftp-client" {
  export default class SftpClient {
    connect(config: unknown): Promise<void>;
    end(): Promise<void>;
    cwd(): Promise<string>;
    list(path: string): Promise<any[]>;
    get(path: string): Promise<any>;
    put(data: any, path: string): Promise<void>;
  }
}

