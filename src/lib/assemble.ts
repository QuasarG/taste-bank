import type { Meta, Tokens } from './schema';

// tokens.json → 作用域在 [data-style="<slug>"] 下的 CSS 变量块
export function tokensToCss(slug: string, tokens: Tokens): string {
  const lines: string[] = [`[data-style="${slug}"] {`];
  const groups: Array<[string, Record<string, string>]> = [
    ['color', tokens.color],
    ['font', tokens.font as Record<string, string>],
    ['size', tokens.size],
    ['space', tokens.space],
    ['radius', tokens.radius],
    ['shadow', tokens.shadow],
  ];
  for (const [prefix, group] of groups) {
    for (const [k, v] of Object.entries(group)) {
      if (v !== undefined) lines.push(`  --sl-${prefix}-${k}: ${v};`);
    }
  }
  lines.push(`  --sl-duration: ${tokens.motion.duration};`);
  lines.push(`  --sl-easing: ${tokens.motion.easing};`);
  lines.push('}');
  return lines.join('\n');
}

// 测试台实际注入的样式 = 变量块 + 可选的 pack 专属修饰
export function fullCss(slug: string, tokens: Tokens, overrides: string | null): string {
  const base = tokensToCss(slug, tokens);
  return overrides ? `${base}\n\n${overrides}` : base;
}

// SKILL.md 原文 + 自动生成的 Tokens 附录，单一事实来源
export function assembleSkill(meta: Meta, tokens: Tokens, skillRaw: string): string {
  const css = tokensToCss(meta.slug, tokens);
  return `${skillRaw.trim()}\n\n## Tokens（由 tokens.json 自动生成，勿手改）\n\n\`\`\`css\n${css}\n\`\`\`\n`;
}
