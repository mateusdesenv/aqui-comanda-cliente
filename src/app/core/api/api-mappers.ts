export function mapApiEntity<T extends Record<string, any>>(entity: T): T & { id: string } {
  return {
    ...entity,
    id: String(entity['id'] ?? entity['_id'] ?? entity['legacyId'] ?? ''),
  };
}

export function mapApiList<T extends Record<string, any>>(items: T[]): Array<T & { id: string }> {
  return items.map((item) => mapApiEntity(item));
}

export function friendlyApiError(error: unknown, fallback = 'Não foi possível concluir a operação.'): string {
  if (typeof error === 'object' && error !== null && 'error' in error) {
    const body = (error as { error?: { message?: string } }).error;
    if (body?.message) {
      return body.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
