export class LocalStorageRepository<T> {
  constructor(
    private readonly key: string,
    private readonly defaults: T,
  ) {}

  read(): T {
    if (!this.hasLocalStorage()) {
      return this.clone(this.defaults);
    }

    const storedValue = localStorage.getItem(this.key);

    if (!storedValue) {
      this.write(this.defaults);
      return this.clone(this.defaults);
    }

    try {
      return JSON.parse(storedValue) as T;
    } catch {
      this.write(this.defaults);
      return this.clone(this.defaults);
    }
  }

  write(value: T): void {
    if (!this.hasLocalStorage()) {
      return;
    }

    localStorage.setItem(this.key, JSON.stringify(value));
  }

  private hasLocalStorage(): boolean {
    return typeof localStorage !== 'undefined';
  }

  private clone(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }
}
