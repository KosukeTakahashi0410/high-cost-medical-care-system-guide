import { useEffect, useRef, useState } from 'preact/hooks';
import type { Answers } from '../lib/answers';
import { visibleOptions, visibleQuestions } from '../lib/questions';
import { scrollToElement } from './scroll';

interface Props {
  answers: Answers;
  prevAnswers?: Answers;
  onChange: (a: Answers) => void;
  onDone: () => void;
  onCancel: () => void;
}

const pad = (n: number) => String(n).padStart(2, '0');

export default function Wizard({ answers, prevAnswers, onChange, onDone, onCancel }: Props) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<'forward' | 'back'>('forward');
  const questions = visibleQuestions(answers);
  const index = Math.min(step, questions.length - 1);
  const question = questions[index];
  const options = visibleOptions(question, answers);
  const isLast = index === questions.length - 1;
  const root = useRef<HTMLElement>(null);

  // 次の質問に進んだとき、質問の先頭が画面外なら戻す
  useEffect(() => {
    scrollToElement(root.current, true);
  }, [index]);

  function move(to: number) {
    setDir(to > index ? 'forward' : 'back');
    setStep(to);
  }

  return (
    <section class="section wizard" ref={root}>
      <div class="progress" aria-hidden="true">
        <div class="progress-bar" style={{ transform: `scaleX(${(index + 1) / questions.length})` }} />
      </div>
      <div class="wizard-head">
        <p class="eyebrow">
          質問 {pad(index + 1)} / {pad(questions.length)}
        </p>
        {index > 0 && !isLast && (
          <button class="btn-text small" onClick={onDone}>
            残りを飛ばして結果へ
          </button>
        )}
      </div>

      <div class="step" data-dir={dir} key={question.key}>
        <fieldset>
          <legend>
            <h2 class="question">{question.title}</h2>
          </legend>
          {question.help && <p class="help">{question.help}</p>}
          <ul class="options">
            {options.map((o) => {
              const selected = answers[question.key] === o.value;
              const wasPrev = prevAnswers !== undefined && prevAnswers[question.key] === o.value;
              return (
                <li key={String(o.value)}>
                  <label class={`option${selected ? ' selected' : ''}`}>
                    <input
                      type="radio"
                      name={question.key}
                      checked={selected}
                      onChange={() => onChange({ ...answers, [question.key]: o.value })}
                    />
                    <span class="radio" aria-hidden="true" />
                    <span class="option-label">{o.label}</span>
                    {wasPrev && <span class="option-prev">前回の答え</span>}
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      </div>

      <div class="actions">
        <button class="btn btn-primary" onClick={() => (isLast ? onDone() : move(index + 1))}>
          {isLast ? '結果を見る' : '次へ'}
        </button>
        <button class="btn" onClick={() => (index === 0 ? onCancel() : move(index - 1))}>
          {index === 0 ? 'やめる' : '戻る'}
        </button>
      </div>
    </section>
  );
}
