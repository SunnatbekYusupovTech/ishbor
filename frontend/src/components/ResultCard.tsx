'use client';

import { useTranslations } from 'next-intl';
import { Check, X } from 'lucide-react';
import type { SubmitTestResponse } from '@/types/test';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface ResultCardProps {
  result: SubmitTestResponse;
  onRestart: () => void;
}

const levelTone: Record<SubmitTestResponse['awardedLevel'], string> = {
  none: 'bg-muted text-muted-foreground',
  junior: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  middle: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  senior: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
};

const levelKey: Record<SubmitTestResponse['awardedLevel'], string> = {
  none: 'levelNone',
  junior: 'levelJunior',
  middle: 'levelMiddle',
  senior: 'levelSenior',
};

export function ResultCard({ result, onRestart }: ResultCardProps) {
  const t = useTranslations('result');
  const tt = useTranslations('technologies');
  const passed = result.awardedLevel !== 'none' && !result.late && result.status === 'submitted';

  return (
    <Card className="mx-auto max-w-lg text-center">
      <CardHeader className="items-center">
        <div
          className={cn(
            'mx-auto flex h-20 w-20 items-center justify-center rounded-full text-3xl',
            passed ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950' : 'bg-destructive/10 text-destructive',
          )}
        >
          {passed ? '✓' : '✕'}
        </div>
        <CardTitle className="mt-4 text-2xl">
          {result.status === 'terminated'
            ? t('terminated')
            : passed
              ? t('congrats')
              : t('complete')}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="text-5xl font-bold text-primary">{result.percentage}%</div>
        <p className="text-sm text-muted-foreground">
          {t('correctSummary', {
            correct: result.correctCount,
            total: result.totalQuestions,
            score: result.score,
            max: result.maxScore,
          })}
        </p>
        <span
          className={cn(
            'inline-block rounded-full px-4 py-1.5 text-sm font-semibold',
            levelTone[result.awardedLevel],
          )}
        >
          {t(levelKey[result.awardedLevel])}
        </span>

        <p className="text-sm font-medium">
          {t('passedSummary', {
            passed: result.passedCount,
            total: result.technologies.length,
          })}
        </p>

        {result.technologies.length > 0 && (
          <ul className="space-y-1.5 rounded-lg border p-3 text-left">
            {result.technologies.map((tech) => (
              <li key={tech.technology} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2">
                  {tech.passed ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <X className="h-4 w-4 text-destructive" />
                  )}
                  {tt(tech.technology)}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {tech.correct}/{tech.total}
                </span>
              </li>
            ))}
          </ul>
        )}

        {result.late && (
          <Alert variant="warning" className="text-left">
            <AlertDescription>{t('late')}</AlertDescription>
          </Alert>
        )}
      </CardContent>

      <CardFooter>
        <Button className="w-full" onClick={onRestart}>
          {t('backToStart')}
        </Button>
      </CardFooter>
    </Card>
  );
}
