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

export const getCurrencySymbol = (
  currencyCode: string,
  locale: string = "de-DE",
) =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
  })
    .formatToParts(0)
    .find((part) => part.type === "currency")?.value ?? currencyCode;
