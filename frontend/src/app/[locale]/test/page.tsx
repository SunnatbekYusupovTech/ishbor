'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Clock, Check, Layers, Info } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { api, tokenStore, ApiError } from '@/lib/api';
import { ResultCard } from '@/components/ResultCard';
import { AntiCheatBanner } from '@/components/AntiCheatBanner';
import { ViolationDialog } from '@/components/ViolationDialog';
import { useHeartbeat } from '@/hooks/useHeartbeat';
import { useAntiCheat } from '@/hooks/useAntiCheat';
import { useFullscreen } from '@/hooks/useFullscreen';
import { useExamLockdown } from '@/hooks/useExamLockdown';
import { LevelBadge } from '@/components/badges';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Catalog, Direction } from '@/types/domain';
import { cn } from '@/lib/utils';

type Phase = 'select' | 'loading' | 'active' | 'submitting' | 'result';
const DIFFICULTIES = ['junior', 'middle', 'senior'] as const;
type Difficulty = typeof DIFFICULTIES[number];

const DIRECTIONS: Direction[] = ['frontend', 'backend', 'fullstack', 'mobile'];

export default function TestPage() {
  const t = useTranslations('test');
  const td = useTranslations('directions');
  const tt = useTranslations('technologies');
  const locale = useLocale();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>('select');
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [direction, setDirection] = useState<Direction | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [techs, setTechs] = useState<Set<string>>(new Set());

  const [session, setSession] = useState<StartTestResponse | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { userAnswer?: number, userTextAnswer?: string }>>({});
  const [secondsLeft, setSecondsLeft] = useState(20);
  const [result, setResult] = useState<SubmitTestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [violationOpen, setViolationOpen] = useState(false);
  const [isQaTester, setIsQaTester] = useState(false);

  const sessionRef = useRef<StartTestResponse | null>(null);
  const answersRef = useRef<Record<string, { userAnswer?: number, userTextAnswer?: string }>>({});
  const indexRef = useRef(0);
  const submittingRef = useRef(false);
  const [customTech, setCustomTech] = useState('');
  // Read by the countdown tick so we can pause without resetting the clock.
  const violationOpenRef = useRef(false);
  const lastViolationCountRef = useRef(0);

  useEffect(() => {
    violationOpenRef.current = violationOpen;
  }, [violationOpen]);

  // Sound effects
  const playSound = useCallback((type: 'correct' | 'wrong' | 'click') => {
    try {
      const audio = new Audio();
      if (type === 'correct') audio.src = 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3';
      else if (type === 'wrong') audio.src = 'https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3';
      else if (type === 'click') audio.src = 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3';
      audio.volume = 0.5;
      void audio.play();
    } catch (e) {}
  }, []);

  const restart = useCallback(() => {
    void fullscreen.exit();
    setPhase('select');
    setSession(null);
    sessionRef.current = null;
    setDirection(null);
    setDifficulty(null);
    setTechs(new Set());
    setViolationOpen(false);
    lastViolationCountRef.current = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The server killed the session (heartbeat lost / violation limit exceeded).
  // No submit call is made — the session is already terminated server-side —
  // we just render the same terminal screen submitTest would have produced.
  const handleTerminated = useCallback(() => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    void fullscreen.exit();
    const s = sessionRef.current;
    setResult({
      sessionId: s?.sessionId ?? '',
      status: 'terminated',
      score: 0,
      maxScore: 0,
      percentage: 0,
      correctCount: 0,
      totalQuestions: s?.questions.length ?? 0,
      awardedLevel: 'none',
      passedCount: 0,
      technologies: [],
      tabSwitchCount: 0,
      late: false,
    });
    setPhase('result');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { socket, connected } = useHeartbeat({
    sessionId: session?.sessionId ?? '',
    enabled: phase === 'active',
    onTerminated: handleTerminated,
  });

  // Proctoring: tab-switch/focus-loss, clipboard, right-click, PrintScreen,
  // DevTools, and bot detection — REST-authoritative, socket is belt-and-suspenders.
  const anti = useAntiCheat({
    sessionId: session?.sessionId ?? '',
    enabled: phase === 'active',
    socket,
    onTerminated: handleTerminated,
  });

  // Leaving fullscreen (opening another window, a second monitor, Esc, ...) is
  // routed through the SAME channel as a tab-switch — it's the same integrity
  // signal (left the locked-down exam viewport) and sharing the debounce lock
  // means a single alt-tab that fires both `blur` and `fullscreenchange`
  // within the same tick is counted once, not twice.
  const fullscreen = useFullscreen({
    enabled: phase === 'active',
    onExit: () => void anti.report(),
  });

  // Best-effort client-side deterrents (blocks common devtools/save/print
  // shortcuts, text selection). Not a security boundary on its own — the
  // server-side counters above are — but it raises the effort bar and is
  // one of the few signals that doesn't depend on a network round-trip.
  useExamLockdown({ enabled: phase === 'active' });

  // Surface a mandatory warning each time the authoritative count rises.
  useEffect(() => {
    const total = anti.tabSwitchCount + anti.violationCount;
    if (total > lastViolationCountRef.current) {
      lastViolationCountRef.current = total;
      setViolationOpen(true);
    }
  }, [anti.tabSwitchCount, anti.violationCount]);

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
    // Only a QA/anti-cheat testing account gets the auto-finish shortcut
    // below — silently ignored for everyone else.
    api
      .me()
      .then((me) => setIsQaTester(!!me.isQaTester))
      .catch(() => setIsQaTester(false));
  }, [router, t]);

  const submit = useCallback(async () => {
    const s = sessionRef.current;
    if (!s || submittingRef.current) return;
    submittingRef.current = true;
    setPhase('submitting');

    const arr = Object.entries(answersRef.current).map(([questionId, ans]) => ({
      questionId,
      userAnswer: ans.userAnswer,
      userTextAnswer: ans.userTextAnswer,
    }));

    try {
      const res = await api.submitTest({ sessionId: s.sessionId, answers: arr });
      void fullscreen.exit();
      setResult(res);
      setPhase('result');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('submitFailed'));
      submittingRef.current = false;
      setPhase('active');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  // QA-tester-only shortcut — instantly finishes with a perfect score so a
  // tester can inspect the post-test flow (ResultCard, badge award, ...) in
  // each locale without answering 5 real questions every anti-cheat run.
  const autoFinish = useCallback(async () => {
    const s = sessionRef.current;
    if (!s || submittingRef.current) return;
    submittingRef.current = true;
    setPhase('submitting');
    try {
      const res = await api.autoCompleteTest(s.sessionId);
      void fullscreen.exit();
      setResult(res);
      setPhase('result');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('submitFailed'));
      submittingRef.current = false;
      setPhase('active');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Per-question countdown: resets each question, auto-advances at zero. While a
  // violation dialog is open the tick holds (so the modal never "presses Next").
  useEffect(() => {
    if (phase !== 'active') return;
    const perQ = sessionRef.current?.perQuestionSeconds ?? 20;
    setSecondsLeft(perQ);
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (violationOpenRef.current) return s; // paused
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

  const addCustomTech = () => {
    const t = customTech.trim().toLowerCase();
    if (t) {
      toggleTech(t);
      setCustomTech('');
    }
  };

  const start = async () => {
    if (!direction || !difficulty || techs.size === 0) return;
    setError(null);
    setResult(null);
    submittingRef.current = false;
    lastViolationCountRef.current = 0;
    setPhase('loading');
    // Fire synchronously, still inside the click's user-activation window —
    // fullscreen requests made after an `await` can be silently rejected by
    // the browser once that activation has expired.
    void fullscreen.request();
    try {
      const res = await api.startTest({ direction, technologies: Array.from(techs), difficulty, locale });
      sessionRef.current = res;
      answersRef.current = {};
      indexRef.current = 0;
      setSession(res);
      setAnswers({});
      setIndex(0);
      setPhase('active');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('couldNotStart'));
      setPhase('select');
    }
  };

  const select = (questionId: string, optIndex: number, correctIndex?: number) => {
    // Only allow selection if not already answered
    if (answersRef.current[questionId]?.userAnswer !== undefined) return;
    
    answersRef.current = { ...answersRef.current, [questionId]: { userAnswer: optIndex } };
    setAnswers(answersRef.current);

    if (correctIndex !== undefined) {
      if (optIndex === correctIndex) playSound('correct');
      else playSound('wrong');
    } else {
      playSound('click');
    }
  };

  const writeText = (questionId: string, text: string) => {
    answersRef.current = { ...answersRef.current, [questionId]: { userTextAnswer: text } };
    setAnswers(answersRef.current);
  };

  // ---------------- RENDER ----------------

  if (phase === 'result' && result) {
    return <ResultCard result={result} onRestart={restart} />;
  }

  if (phase === 'loading') {
    return (
      <div className="mx-auto max-w-2xl py-24 text-center space-y-4">
        <h2 className="text-xl font-semibold">AI siz uchun maxsus savollar tayyorlamoqda...</h2>
        <p className="text-muted-foreground">Bu jarayon 10-30 soniya vaqt olishi mumkin.</p>
        <div className="flex justify-center"><Layers className="h-8 w-8 animate-spin text-primary" /></div>
      </div>
    );
  }

  if (phase === 'select') {
    const availableTechs = direction && catalog ? catalog.directions[direction] : [];
    const noTech = techs.size === 0;
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
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
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

        {/* Step 2: difficulty */}
        {direction && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  2
                </span>
                Darajangizni tanlang
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={cn(
                      'flex items-center justify-center rounded-lg border p-3 text-sm font-medium transition-colors capitalize',
                      difficulty === d ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-accent',
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: technologies */}
        {difficulty && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  3
                </span>
                {t('chooseTech')}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {t('techHint', { count: catalog?.questionsPerTech ?? 5 })}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {Array.from(new Set([...availableTechs, ...Array.from(techs)])).map((tech) => {
                  const selected = techs.has(tech);
                  const count = catalog?.perTech[tech] ?? 0;
                  return (
                    <button
                      key={tech}
                      onClick={() => toggleTech(tech)}
                      disabled={count === 0 && !selected} // we allow custom ones already selected
                      aria-pressed={selected}
                      className={cn(
                        'flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors disabled:opacity-40',
                        selected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'hover:bg-accent',
                      )}
                    >
                      {selected && <Check className="h-3.5 w-3.5" />}
                      {tt(tech) === tech ? tech : tt(tech)}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 mt-4 max-w-sm">
                 <input 
                   type="text"
                   className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
                   placeholder="Yoki o'zingiz boshqa stack yozing..." 
                   value={customTech}
                   onChange={e => setCustomTech(e.target.value)}
                   onKeyDown={e => e.key === 'Enter' && addCustomTech()}
                 />
                 <Button type="button" size="sm" onClick={addCustomTech}>Qo'shish</Button>
              </div>

              <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm text-muted-foreground">
                  {t('selectedSummary', {
                    techs: techs.size,
                    questions: techs.size * (catalog?.questionsPerTech ?? 5),
                  })}
                </span>
                <Button
                  size="lg"
                  disabled={noTech || !difficulty}
                  onClick={start}
                  className="w-full sm:w-auto"
                >
                  {t('startTest')}
                </Button>
              </div>
              {noTech && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  {t('selectAtLeastOne')}
                </p>
              )}
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
  const perQ = session.perQuestionSeconds || 20;
  const timePercent = (secondsLeft / perQ) * 100;
  const urgent = secondsLeft <= 10;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <AntiCheatBanner
        tabSwitchCount={anti.tabSwitchCount}
        maxTabSwitches={anti.maxTabSwitches}
        violationCount={anti.violationCount}
        maxViolations={anti.maxViolations}
        connected={connected}
      />
      {isQaTester && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={autoFinish}
          disabled={phase === 'submitting'}
          className="w-full border-dashed"
        >
          {t('qaAutoFinish')}
        </Button>
      )}
      <ViolationDialog
        open={anti.violationDialog !== null}
        type={anti.violationDialog ?? 'tab-switch'}
        onAcknowledge={anti.acknowledgeViolation}
        count={anti.violationDialog === 'tab-switch' ? anti.tabSwitchCount : anti.violationCount}
        maxCount={anti.violationDialog === 'tab-switch' ? anti.maxTabSwitches : anti.maxViolations}
      />
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
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
            <CardTitle className="text-base leading-snug sm:text-lg">{question.text}</CardTitle>
            <LevelBadge level={question.difficulty} />
          </div>
        </CardHeader>
        <CardContent>
          {question.type === 'open-ended' || !question.options ? (
            <textarea
              className="w-full min-h-[200px] p-3 rounded-md border bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Amaliy javobingizni shu yerga batafsil yozing..."
              value={selected?.userTextAnswer || ''}
              onChange={(e) => writeText(question._id, e.target.value)}
            />
          ) : (
            <fieldset className="space-y-2">
              <legend className="sr-only">{question.text}</legend>
              {question.options.map((option, optIndex) => {
                const isSelected = selected?.userAnswer === optIndex;
                const isCorrect = question.correctAnswer === optIndex;
                const hasAnswered = selected?.userAnswer !== undefined;

                return (
                  <label
                    key={optIndex}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors hover:bg-accent',
                      !hasAnswered && isSelected && 'border-primary bg-accent',
                      hasAnswered && isCorrect && 'border-green-500 bg-green-50 text-green-900',
                      hasAnswered && isSelected && !isCorrect && 'border-destructive bg-destructive/10 text-destructive',
                      hasAnswered && !isSelected && !isCorrect && 'opacity-60 cursor-not-allowed',
                    )}
                  >
                    <input
                      type="radio"
                      name={question._id}
                      checked={isSelected}
                      disabled={hasAnswered}
                      onChange={() => select(question._id, optIndex, question.correctAnswer)}
                      className="h-4 w-4 shrink-0 accent-primary"
                    />
                    <span className="text-sm">{option}</span>
                  </label>
                );
              })}
            </fieldset>
          )}
        </CardContent>
        <CardFooter className="flex-col gap-3 sm:flex-row sm:justify-between">
          <span className="text-xs text-muted-foreground">
            {(selected?.userAnswer === undefined && !selected?.userTextAnswer) ? t('notAnswered') : t('answered')}
          </span>
          <Button
            onClick={advance}
            disabled={phase === 'submitting'}
            className="w-full sm:w-auto"
          >
            {phase === 'submitting' ? t('submitting') : isLast ? t('finish') : t('next')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
