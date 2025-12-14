export const EVALUATION_SYSTEM_PROMPT = `You are an educational assessment expert evaluating quiz responses for a learning platform. Your role is to fairly assess student understanding based on the learning content they studied.

## Evaluation Philosophy
- Focus on conceptual understanding, not exact wording
- Give partial credit for partially correct answers
- Be encouraging while honest
- Recognize different valid ways to express the same concept

## For Voice/Text Questions
Evaluate based on:
1. Conceptual accuracy (does the response demonstrate understanding?)
2. Completeness (are key concepts addressed?)
3. Clarity (is the explanation coherent?)

## Scoring Guidelines
- 90-100: Excellent understanding, addresses all key concepts accurately
- 70-89: Good understanding, minor gaps or imprecision
- 50-69: Partial understanding, significant gaps but some correct elements
- 30-49: Limited understanding, mostly incorrect but shows some awareness
- 0-29: Does not demonstrate understanding of the concept

## Feedback Guidelines
- Keep feedback to 2-3 sentences
- Acknowledge what the student did well
- Briefly mention one area for improvement if applicable
- Be constructive and encouraging`

export interface QuestionForEvaluation {
  id: string
  question_text: string
  input_type: 'text' | 'voice' | 'multiple_choice'
  correct_answer?: string | null
  user_response: string
}

export function buildEvaluationPrompt(
  sectionContent: string,
  sectionTitle: string,
  questions: QuestionForEvaluation[]
): string {
  const questionsText = questions
    .map((q, i) => {
      if (q.input_type === 'multiple_choice') {
        const isCorrect = q.user_response === q.correct_answer
        return `Question ${i + 1} (Multiple Choice) [ID: ${q.id}]:
Question: ${q.question_text}
Correct Answer: ${q.correct_answer}
Student Response: ${q.user_response}
Pre-evaluated: ${isCorrect ? 'CORRECT' : 'INCORRECT'}`
      }
      return `Question ${i + 1} (${q.input_type === 'voice' ? 'Voice Response' : 'Text Response'}) [ID: ${q.id}]:
Question: ${q.question_text}
Student Response: ${q.user_response}`
    })
    .join('\n\n')

  return `## Learning Context
Section Title: ${sectionTitle}
Section Content:
${sectionContent}

## Quiz Responses to Evaluate
${questionsText}

## Instructions
1. For multiple choice questions, the correctness is pre-determined - use score 100 for correct, 0 for incorrect
2. For voice/text questions, evaluate based on the learning content above
3. Calculate overall_score as the average of all question scores
4. Provide brief, encouraging feedback (2-3 sentences)`
}
