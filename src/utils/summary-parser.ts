export interface SummarySection {
  title: string;
  bullets: string[];
  timestampSeconds?: number;
}

export interface ParsedSummary {
  overview: string[];
  keyFacts: string[];
  sections: SummarySection[];
  conclusion: string[];
  fallback: string[];
}

type SummaryMode = 'overview' | 'keyFacts' | 'sections' | 'conclusion' | 'fallback';

const isOverviewHeading = (line: string) => line === '한눈에 보기';
const isDetailsHeading = (line: string) => line === '핵심 내용';
const isKeyFactsHeading = (line: string) =>
  line === '주요 숫자' || line === '중요 숫자·일정' || line === '중요 숫자/일정';
const isConclusionHeading = (line: string) => line === '결론';

const parseTimestamp = (value: string): number | undefined => {
  const parts = value.split(':').map(Number);
  if (parts.some(Number.isNaN) || (parts.length !== 2 && parts.length !== 3)) return undefined;
  if (parts.length === 3) {
    return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0);
  }
  return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
};

export function parseSummary(summary: string): ParsedSummary {
  const result: ParsedSummary = {
    overview: [],
    keyFacts: [],
    sections: [],
    conclusion: [],
    fallback: [],
  };
  const lines = summary.split('\n').map((line) => line.trim()).filter(Boolean);
  let mode: SummaryMode = 'fallback';
  let currentSection: SummarySection | null = null;

  for (const line of lines) {
    if (isOverviewHeading(line)) {
      mode = 'overview';
      currentSection = null;
      continue;
    }
    if (isDetailsHeading(line)) {
      mode = 'sections';
      currentSection = null;
      continue;
    }
    if (isKeyFactsHeading(line)) {
      mode = 'keyFacts';
      currentSection = null;
      continue;
    }
    if (isConclusionHeading(line)) {
      mode = 'conclusion';
      currentSection = null;
      continue;
    }

    const numberedMatch = line.match(/^\d+\.\s*(.+)$/);
    if (numberedMatch) {
      const rawTitle = numberedMatch[1] ?? '';
      const timestampMatch = rawTitle.match(/\s*\[((?:\d{1,2}:)?\d{1,2}:\d{2})\]\s*$/);
      const timestampSeconds = timestampMatch?.[1]
        ? parseTimestamp(timestampMatch[1])
        : undefined;
      const section: SummarySection = {
        title: timestampMatch ? rawTitle.slice(0, timestampMatch.index).trim() : rawTitle,
        bullets: [],
        ...(timestampSeconds !== undefined ? { timestampSeconds } : {}),
      };
      currentSection = section;
      result.sections.push(section);
      mode = 'sections';
      continue;
    }

    const content = line.replace(/^[-*•]\s*/, '').trim();
    if (!content) continue;

    if (mode === 'overview') result.overview.push(content);
    else if (mode === 'keyFacts') result.keyFacts.push(content);
    else if (mode === 'conclusion') result.conclusion.push(content);
    else if (mode === 'sections' && currentSection) currentSection.bullets.push(content);
    else result.fallback.push(content);
  }

  return result;
}
