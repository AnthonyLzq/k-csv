declare global {
  interface DownloadFileResponse {
    buffer: Buffer
    name  : string
  }
}

export {}
