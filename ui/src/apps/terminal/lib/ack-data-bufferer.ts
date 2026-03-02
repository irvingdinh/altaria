const CHAR_COUNT_ACK_SIZE = 5000;

export class AckDataBufferer {
  #unsentCharCount = 0;
  #callback: (charCount: number) => void;

  constructor(callback: (charCount: number) => void) {
    this.#callback = callback;
  }

  ack(charCount: number): void {
    this.#unsentCharCount += charCount;
    while (this.#unsentCharCount >= CHAR_COUNT_ACK_SIZE) {
      this.#unsentCharCount -= CHAR_COUNT_ACK_SIZE;
      this.#callback(CHAR_COUNT_ACK_SIZE);
    }
  }

  flush(): void {
    if (this.#unsentCharCount > 0) {
      this.#callback(this.#unsentCharCount);
      this.#unsentCharCount = 0;
    }
  }
}
