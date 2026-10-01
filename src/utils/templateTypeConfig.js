export const RANK_PROMOTION_TYPES = Object.freeze([
  "Rank_Promotion",
  "Rank_Promotion_B",
]);

const RANK_PROMOTION_TYPE_SET = new Set(RANK_PROMOTION_TYPES);

export function isRankPromotionType(type) {
  return RANK_PROMOTION_TYPE_SET.has(type);
}


export const BONANZA_FLOW_TYPES = Object.freeze([
  "Bonanza",
  "Domestic_Trip",
]);

const BONANZA_FLOW_TYPE_SET = new Set(BONANZA_FLOW_TYPES);

export function isBonanzaFlowType(type) {
  return BONANZA_FLOW_TYPE_SET.has(type);
}
