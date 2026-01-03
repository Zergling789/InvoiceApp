export const formatMoney = (
  amount: number,
  currencyCode: string,
  locale: string = "de-DE"
) => {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
  }).format(amount);
};
