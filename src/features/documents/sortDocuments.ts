type DatedDocument = {
  id: string;
  date: string;
  createdAt?: string;
};

const getTimestamp = (value?: string) => {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
};

const getDocumentTimestamp = (document: DatedDocument) =>
  getTimestamp(document.createdAt) ?? getTimestamp(document.date) ?? 0;

export const sortDocumentsNewestFirst = <T extends DatedDocument>(documents: T[]) =>
  [...documents].sort((a, b) => {
    const timestampDifference = getDocumentTimestamp(b) - getDocumentTimestamp(a);
    return timestampDifference || a.id.localeCompare(b.id);
  });
