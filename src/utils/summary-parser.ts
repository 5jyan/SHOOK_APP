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

const normalizeLine = (value: string) => value
  .replace(/^#{1,6}\s*/, '')
  .replace(/^\*\*(.+)\*\*$/, '$1')
  .trim();

const stripBoldMarkers = (value: string) => value.replace(/\*\*([^*]+)\*\*/g, '$1');

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
  const lines = summary
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(normalizeLine)
    .filter(Boolean);
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

    const numberedMatch = line.match(/^\d{1,2}[.):]\s*(.+)$/);
    if (numberedMatch) {
      const rawTitle = stripBoldMarkers(numberedMatch[1] ?? '');
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

    const hasBulletMarker = /^[-*•]\s*/.test(line);
    const content = line.replace(/^[-*•]\s*/, '').trim();
    if (!content) continue;

    const appendContent = (target: string[]) => {
      if (!hasBulletMarker && target.length > 0) {
        target[target.length - 1] = `${target[target.length - 1]} ${content}`;
      } else {
        target.push(content);
      }
    };

    if (mode === 'overview') appendContent(result.overview);
    else if (mode === 'keyFacts') appendContent(result.keyFacts);
    else if (mode === 'conclusion') appendContent(result.conclusion);
    else if (mode === 'sections' && currentSection) appendContent(currentSection.bullets);
    else appendContent(result.fallback);
  }

  return result;
}
