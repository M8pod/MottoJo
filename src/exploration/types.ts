/** A chi appartiene il Deck attualmente in ascolto — mai il nome libero dell'umano (vedi narration). */
export type DeckListener = { readonly kind: "self" } | { readonly kind: "opponent"; readonly name: string };
