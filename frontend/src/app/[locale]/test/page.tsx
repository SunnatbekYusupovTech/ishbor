'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Clock, Check, Layers } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { api, tokenStore, ApiError } from '@/lib/api';
import { ResultCard } from '@/components/ResultCard';
import { LevelBadge } from '@/components/badges';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { StartTestResponse, SubmitTestResponse } from '@/types/test';
import type { Catalog, Direction } from '@/types/domain';
import { cn } from '@/lib/utils';

type Phase = 'select' | 'active' | 'submitting' | 'result';

const DIRECTIONS: Direction[] = ['frontend', 'backend', 'fullstack', 'mobile'];

export default function TestPage() {
  const t = useTranslations('test');
  const td = useTranslations('directions');
  const tt = useTranslations('technologies');
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>('select');
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [direction, setDirection] = useState<Direction | null>(null);
  const [techs, setTechs] = useState<Set<string>>(new Set());

  const [session, setSession] = useState<StartTestResponse | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [result, setResult] = useState<SubmitTestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef<StartTestResponse | null>(null);
  const answersRef = useRef<Record<string, number>>({});
  const indexRef = useRef(0);
  const submittingRef = useRef(false);

  // Guard + load taxonomy.
  useEffect(() => {
    if (!tokenStore.get()) {
      router.replace(('/login?next=/test') as '/login');
      return;
    }
    api
      .getCatalog()
      .then(setCatalog)
      .catch((err) => setError(err instanceof ApiError ? err.message : t('couldNotStart')));
  }, [router, t]);

  const submit = useCallback(async () => {
    const s = sessionRef.current;
    if (!s || submittingRef.current) return;
    submittingRef.current = true;
    setPhase('submitting');

    const arr = Object.entries(answersRef.current).map(([questionId, userAnswer]) => ({
      questionId,
      userAnswer,
    }));

    try {
      const res = await api.submitTest({ sessionId: s.sessionId, answers: arr });
      setResult(res);
      setPhase('result');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('submitFailed'));
      submittingRef.current = false;
      setPhase('active');
    }
  }, [t]);

  const advance = useCallback(() => {
    const s = sessionRef.current;
    if (!s) return;
    const cur = indexRef.current;
    if (cur + 1 >= s.questions.length) {
      void submit();
    } else {
      indexRef.current = cur + 1;
      setIndex(cur + 1);
    }
  }, [submit]);

  // Per-question countdown: resets each question, auto-advances at zero.
  useEffect(() => {
    if (phase !== 'active') return;
    const perQ = sessionRef.current?.perQuestionSeconds ?? 30;
    setSecondsLeft(perQ);
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          advance();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, index, advance]);

  const toggleTech = (tech: string) => {
    setTechs((prev) => {
      const next = new Set(prev);
      if (next.has(tech)) next.delete(tech);
      else next.add(tech);
      return next;
    });
  };

  const chooseDirection = (d: Direction) => {
    setDirection(d);
    setTechs(new Set());
  };

  const start = async () => {
    if (!direction || techs.size === 0) return;
    setError(null);
    setResult(null);
    submittingRef.current = false;
    try {
      const res = await api.startTest({ direction, technologies: Array.from(techs) });
      sessionRef.current = res;
      answersRef.current = {};
      indexRef.current = 0;
      setSession(res);
      setAnswers({});
      setIndex(0);
      setPhase('active');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('couldNotStart'));
    }
  };

  const select = (questionId: string, optIndex: number) => {
    answersRef.current = { ...answersRef.current, [questionId]: optIndex };
    setAnswers(answersRef.current);
  };

  const restart = () => {
    setPhase('select');
    setSession(null);
    sessionRef.current = null;
    setDirection(null);
    setTechs(new Set());
  };

  // ---------------- RENDER ----------------

  if (phase === 'result' && result) {
    return <ResultCard result={result} onRestart={restart} />;
  }

  if (phase === 'select') {
    const availableTechs = direction && catalog ? catalog.directions[direction] : [];
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('selectIntro')}</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step 1: direction */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                1
              </span>
              {t('chooseDirection')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {DIRECTIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => chooseDirection(d)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-lg border p-4 text-sm font-medium transition-colors',
                    direction === d ? 'border-primary bg-accent' : 'hover:bg-accent',
                  )}
                >
                  <Layers className="h-5 w-5" />
                  {td(d)}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Step 2: technologies */}
        {direction && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  2
                </span>
                {t('chooseTech')}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {t('techHint', { count: catalog?.questionsPerTech ?? 5 })}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {availableTechs.map((tech) => {
                  const selected = techs.has(tech);
                  const count = catalog?.perTech[tech] ?? 0;
                  return (
                    <button
                      key={tech}
                      onClick={() => toggleTech(tech)}
                      disabled={count === 0}
                      className={cn(
                        'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors disabled:opacity-40',
                        selected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'hover:bg-accent',
                      )}
                    >
                      {selected && <Check className="h-3.5 w-3.5" />}
                      {tt(tech)}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between border-t pt-4">
                <span className="text-sm text-muted-foreground">
                  {t('selectedSummary', {
                    techs: techs.size,
                    questions: techs.size * (catalog?.questionsPerTech ?? 5),
                  })}
                </span>
                <Button size="lg" disabled={techs.size === 0} onClick={start}>
                  {t('startTest')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // active / submitting
  if (!session) return null;
  const question = session.questions[index];
  const total = session.questions.length;
  const selected = answers[question._id];
  const isLast = index + 1 >= total;
  const perQ = session.perQuestionSeconds || 30;
  const timePercent = (secondsLeft / perQ) * 100;
  const urgent = secondsLeft <= 10;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            {t('progress', { current: index + 1, total })}
          </span>
          <span
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold tabular-nums',
              urgent ? 'bg-destructive/10 text-destructive' : 'bg-muted text-foreground',
            )}
          >
            <Clock className="h-4 w-4" />
            {secondsLeft}s
          </span>
        </div>
        <Progress
          value={timePercent}
          className={cn(urgent && '[&>*]:bg-destructive')}
          aria-label={t('timeLeft')}
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <CardTitle className="text-lg leading-snug">{question.text}</CardTitle>
            <LevelBadge level={question.difficulty} />
          </div>
        </CardHeader>
        <CardContent>
          <fieldset className="space-y-2">
            <legend className="sr-only">{question.text}</legend>
            {question.options.map((option, optIndex) => (
              <label
                key={optIndex}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors hover:bg-accent',
                  selected === optIndex && 'border-primary bg-accent',
                )}
              >
                <input
                  type="radio"
                  name={question._id}
                  checked={selected === optIndex}
                  onChange={() => select(question._id, optIndex)}
                  className="h-4 w-4 accent-primary"
                />
                <span className="text-sm">{option}</span>
              </label>
            ))}
          </fieldset>
        </CardContent>
        <CardFooter className="justify-between">
          <span className="text-xs text-muted-foreground">
            {selected === undefined ? t('notAnswered') : t('answered')}
          </span>
          <Button onClick={advance} disabled={phase === 'submitting'}>
            {phase === 'submitting' ? t('submitting') : isLast ? t('finish') : t('next')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
