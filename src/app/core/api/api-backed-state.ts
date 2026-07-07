export abstract class ApiBackedState {
  private loaded = false;
  private reloadPromise: Promise<void> | null = null;

  clearLoadState(): void {
    this.loaded = false;
    this.reloadPromise = null;
  }

  ensureLoaded(): Promise<void> {
    return this.loaded ? Promise.resolve() : this.reload();
  }

  reload(): Promise<void> {
    if (!this.reloadPromise) {
      this.reloadPromise = this.loadFromApi()
        .then(() => {
          this.loaded = true;
        })
        .finally(() => {
          this.reloadPromise = null;
        });
    }

    return this.reloadPromise;
  }

  protected markLoaded(): void {
    this.loaded = true;
  }

  protected abstract loadFromApi(): Promise<void>;
}
