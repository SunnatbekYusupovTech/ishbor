'use client';

import type { UseFormRegister } from 'react-hook-form';
import type { AnswersForm, PublicQuestion } from '@/types/test';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface QuestionCardProps {
  question: PublicQuestion;
  index: number;
  register: UseFormRegister<AnswersForm>;
}

const difficultyStyles: Record<PublicQuestion['difficulty'], string> = {
  junior: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  middle: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  senior: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
};

/** A single question rendered inside a shadcn Card, wired into React Hook Form. */
export function QuestionCard({ question, index, register }: QuestionCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-base font-semibold">
            <span className="mr-2 text-muted-foreground">{index + 1}.</span>
            {question.text}
          </h3>
          <span
            className={cn(
              'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
              difficultyStyles[question.difficulty],
            )}
          >
            {question.difficulty}
          </span>
        </div>
      </CardHeader>

      <CardContent>
        <fieldset className="space-y-2">
          <legend className="sr-only">Question {index + 1} options</legend>
          {question.options.map((option, optIndex) => (
            <label
              key={optIndex}
              className="flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors hover:bg-accent has-[:checked]:border-primary has-[:checked]:bg-accent"
            >
              <input
                type="radio"
                value={optIndex}
                {...register(question._id)}
                className="h-4 w-4 accent-primary"
              />
              <span className="text-sm">{option}</span>
            </label>
          ))}
        </fieldset>
      </CardContent>
    </Card>
  );
}
