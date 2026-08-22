import type { TFunction } from "i18next";

/** Canonical catalog names (Simplified) → i18n slugs. */
export const PRINCIPLE_SLUG_BY_NAME: Record<string, string> = {
  做个早期采用者: "be_early_adopter",
  别把目标太当回事: "dont_fetishize_goals",
  不停地学: "keep_learning",
  守住底线: "hold_the_line",
  正面心态: "positive_mindset",
  让有限的资源发挥出价值: "stretch_limited_resources",
  别只盯着钱: "not_just_money",
  性格冷静: "stay_calm",
  "搞长期、双赢的关系或合作": "long_term_win_win",
  专注: "stay_focused",
  "远离「有毒」的关系": "avoid_toxic_ties",
  别被标签糊弄: "ignore_labels",
  看懂这个世界: "understand_the_world",
  别浪费时间: "dont_waste_time",
  "快速推进，或者放弃": "ship_or_quit",
  以身作则: "lead_by_example",
  永远不要做微观管理: "no_micromanage",
  淘汰末位: "rank_and_yank",
  用产出当目标: "output_as_goal",
  招聘看资历之后看成果: "hire_for_results",
  团队大于个人: "team_over_ego",
  别试图激励没自驱力的人: "dont_motivate_the_unmotivated",
  让生意简单点: "keep_business_simple",
  始终要有终止条款: "always_have_exit",
  始终有限责任: "limited_liability",
  拒绝独家: "no_exclusivity",
  被动做业务拓展: "passive_bd",
  "早点对无用合作说「不」": "say_no_early",
  专注于用户: "focus_on_users",
  只做能扩大的产品: "scalable_only",
  "不延迟发布，好了就宣布": "ship_when_ready",
  人人都是产品经理: "everyone_is_pm",
  快速推进: "move_fast",
  快速回应负面新闻: "reply_to_bad_news",
  回应记者: "talk_to_press",
  硬规则: "hard_rules",
  // Traditional aliases if a draft stored localized zh-TW names
  做個早期採用者: "be_early_adopter",
  別把目標太當回事: "dont_fetishize_goals",
  不停地學: "keep_learning",
  守住底線: "hold_the_line",
  正面心態: "positive_mindset",
  讓有限的資源發揮出價值: "stretch_limited_resources",
  別只盯著錢: "not_just_money",
  性格冷靜: "stay_calm",
  "搞長期、雙贏的關係或合作": "long_term_win_win",
  專注: "stay_focused",
  "遠離「有毒」的關係": "avoid_toxic_ties",
  別被標籤糊弄: "ignore_labels",
  看懂這個世界: "understand_the_world",
  別浪費時間: "dont_waste_time",
  "快速推進，或者放棄": "ship_or_quit",
  以身作則: "lead_by_example",
  永遠不要做微觀管理: "no_micromanage",
  用產出當目標: "output_as_goal",
  招聘看資歷之後看成果: "hire_for_results",
  團隊大於個人: "team_over_ego",
  別試圖激勵沒自驅力的人: "dont_motivate_the_unmotivated",
  讓生意簡單點: "keep_business_simple",
  始終要有終止條款: "always_have_exit",
  始終有限責任: "limited_liability",
  拒絕獨家: "no_exclusivity",
  被動做業務拓展: "passive_bd",
  "早點對無用合作說「不」": "say_no_early",
  專注於用戶: "focus_on_users",
  只做能擴大的產品: "scalable_only",
  "不延遲發布，好了就宣布": "ship_when_ready",
  人人都是產品經理: "everyone_is_pm",
  快速推進: "move_fast",
  快速回應負面新聞: "reply_to_bad_news",
  回應記者: "talk_to_press",
  硬規則: "hard_rules",
};

export function localizedPrincipleLabel(name: string, t: TFunction): string {
  const raw = `${name || ""}`.trim();
  if (!raw) return "";
  const slug = PRINCIPLE_SLUG_BY_NAME[raw];
  if (!slug) return raw;
  const key = `chronicle.principleLabels.${slug}`;
  const out = t(key, { defaultValue: "" });
  if (out && out !== key) return out;
  return raw;
}
