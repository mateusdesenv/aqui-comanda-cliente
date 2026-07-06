export function normalizeCpf(value: unknown): string {
  return String(value ?? '').replace(/\D/g, '');
}

export function formatCpf(value: unknown): string {
  const cpf = normalizeCpf(value).slice(0, 11);
  return cpf
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
}

export function isValidCpf(value: unknown): boolean {
  const cpf = normalizeCpf(value);

  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  const digits = cpf.split('').map(Number);
  const firstCheck = calculateDigit(digits.slice(0, 9), 10);
  const secondCheck = calculateDigit([...digits.slice(0, 9), firstCheck], 11);

  return digits[9] === firstCheck && digits[10] === secondCheck;
}

function calculateDigit(numbers: number[], factor: number): number {
  const total = numbers.reduce((sum, number) => {
    const next = sum + number * factor;
    factor -= 1;
    return next;
  }, 0);
  const remainder = (total * 10) % 11;
  return remainder === 10 ? 0 : remainder;
}
