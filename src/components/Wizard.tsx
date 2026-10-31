import { useState } from 'preact/hooks';
import type { Answers } from '../lib/answers';
import { optionLabel, visibleOptions, visibleQuestions } from '../lib/questions';

interface Props {
  answers: Answers;
  prevAnswers?: Answers;
  onChange: (a: Answers) => void;
  onDone: () => void;
  onCancel: () => void;
}

export default function Wizard({ answers, prevAnswers, onChange, onDone, onCancel }: Props) {
  const [step, setStep] = useState(0);
  const questions = visibleQuestions(answers);
  const index = Math.min(step, questions.length - 1);
  const question = questions[index];
  const options = visibleOptions(question, answers);
  const isLast = index === questions.length - 1;

  return (
    <section class="card wizard" aria-live="polite">
      <div class="progress" aria-hidden="true">
        <div class="progress-bar" style={{ width: `${((index + 1) / questions.length) * 100}%` }} />
      </div>
      <p class="muted small">
        質問 {index + 1} / {questions.length}
      </p>
      <fieldset>
        <legend>
          <h2>{question.title}</h2>
        </legend>
        {question.help && <p class="help">{question.help}</p>}
        <div class="options">
          {options.map((o) => {
            const selected = answers[question.key] === o.value;
            const wasPrev = prevAnswers !== undefined && prevAnswers[question.key] === o.value;
            return (
              <label class={`option${selected ? ' selected' : ''}`} key={String(o.value)}>
                <input
                  type="radio"
                  name={question.key}
                  checked={selected}
                  onChange={() => onChange({ ...answers, [question.key]: o.value })}
                />
                <span>{o.label}</span>
                {wasPrev && <span class="badge">前回の答え</span>}
              </label>
            );
          })}
        </div>
      </fieldset>
      {prevAnswers && (
        <p class="muted small">前回：{optionLabel(question.key, prevAnswers[question.key])}</p>
      )}
      <div class="actions">
        <button onClick={() => (index === 0 ? onCancel() : setStep(index - 1))}>{index === 0 ? 'やめる' : '戻る'}</button>
        <button class="primary" onClick={() => (isLast ? onDone() : setStep(index + 1))}>
          {isLast ? '結果を見る' : '次へ'}
        </button>
      </div>
      {index > 0 && !isLast && (
        <p class="small">
          <button class="link" onClick={onDone}>
            残りは今の答えのままで結果を見る
          </button>
        </p>
      )}
    </section>
  );
}
