const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

/** Warns while payments run in test mode, or when the live setup is missing. */
export function PaymentTestModeBanner() {
  if (!clientToken) {
    return (
      <div className="w-full border-b border-destructive/40 bg-destructive/15 px-4 py-2 text-center text-sm text-destructive">
        Os pagamentos reais ainda não estão configurados.
      </div>
    );
  }
  if (clientToken.startsWith("pk_test_")) {
    return (
      <div className="w-full border-b border-primary/40 bg-primary/10 px-4 py-2 text-center text-sm text-primary">
        Pagamentos em modo de teste. Nenhuma cobrança real é feita.
      </div>
    );
  }
  return null;
}
