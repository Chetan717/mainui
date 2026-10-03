import {
  Banknote,
  Cake,
  Gift,
  Heart,
  Medal,
  Monitor,
  PackageOpen,
  Sparkles,
  Sun,
  Trophy,
  Volume2,
} from "lucide-react";
import { EVERYDAY_MOMENTS_GROUP_KEY } from "../../../utils/everydayMoments";
import { RANK_PROMOTION_TYPES } from "../../../utils/templateTypeConfig";

export const HOME_CATEGORY_ITEMS = Object.freeze([
  { type: "Product", label: "Product", Icon: PackageOpen },
  { type: "Motivational", label: "Motivational", Icon: Volume2 },
  { type: "Bonanza", label: "Bonanza", Icon: Gift },
  { type: "Meeting", label: "Meeting", Icon: Monitor },
  { type: "Income", label: "Income", Icon: Banknote },
  { type: "Welcome_Closing", label: "Welcome & Closing", Icon: Trophy },
  { type: "General_Meeting", label: "General Meeting", Icon: Monitor },
  { type: "Achievements", label: "Achievements", Icon: Medal },
  { type: "Anniversary_Birthday", label: "Birthday & Anniversary", Icon: Cake },
  { type: "ThankYou_Banner_B", label: "Thank You", Icon: Heart },
  {
    type: "ThankYou_Birthday_Anniversary",
    label: "Thank You Birthday & Anniversary",
    Icon: Heart,
  },
  { type: RANK_PROMOTION_TYPES[0], label: "Rank Promotion", Icon: Trophy },
  { type: RANK_PROMOTION_TYPES[1], label: "Rank Promotion B", Icon: Medal },
  { type: "Domestic_Trip", label: "Domestic Trip", Icon: Gift },
  { type: "Training", label: "Training", Icon: Monitor },
  { type: "Capping", label: "Capping", Icon: Sparkles },
  {
    type: EVERYDAY_MOMENTS_GROUP_KEY,
    label: "Everyday Moments",
    Icon: Sun,
    everydayGroup: true,
  },
  { type: "Today_Trending", label: "Today Trending", Icon: Sparkles },
]);

export function isEverydayCategory(item) {
  return Boolean(item?.everydayGroup) || item?.type === EVERYDAY_MOMENTS_GROUP_KEY;
}
