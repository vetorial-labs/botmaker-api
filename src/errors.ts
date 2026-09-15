export class BotmakerApiError extends Error {
  readonly status: number;
  readonly url: string;
  readonly body: string;

  constructor(status: number, url: string, body: string) {
    super(`HTTP ${status} ${url}: ${body.slice(0, 400)}`);
    this.name = "BotmakerApiError";
    this.status = status;
    this.url = url;
    this.body = body;
  }
}
