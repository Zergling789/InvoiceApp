export type CreatedDocumentTarget = {
  id: string;
  type: "offer" | "invoice";
};

export type DocumentRefreshState = {
  refreshDocuments?: number;
  highlightDocument?: CreatedDocumentTarget;
};
