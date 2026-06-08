import {
  LANGUAGE_TEST_CONFIG,
  QUESTION_TYPE,
} from "../../../constants/languageTestConstants.js";

export const buildQuestionGenerationPrompt = (language) => `
You are creating a language proficiency test for tour guides.
Generate exactly ${LANGUAGE_TEST_CONFIG.QUESTIONS_COUNT} questions in ${language}:
- ${LANGUAGE_TEST_CONFIG.WRITTEN_QUESTIONS_COUNT} written questions (type: "written")
- ${LANGUAGE_TEST_CONFIG.SPOKEN_QUESTIONS_COUNT} spoken questions (type: "spoken") that the guide must answer by voice

Requirements:
- Written questions: grammar, vocabulary, short scenarios, translation.
- Spoken questions: natural spoken responses, pronunciation-friendly prompts, tour-guide scenarios.
- Do not include answers.
- Keep each question clear.

Return ONLY valid JSON:
{
  "questions": [
    {
      "id": "q1",
      "type": "written",
      "question": "Question text here"
    },
    {
      "id": "q4",
      "type": "spoken",
      "question": "Spoken question text here"
    }
  ]
}
`.trim();

export const buildEvaluationPrompt = (language, questions, answers) => `
You are evaluating a tour guide's ${language} language proficiency test.

Score from 0 to 100 based on:
- grammar and spelling (written answers)
- pronunciation clarity and fluency (spoken answers — use transcripts)
- vocabulary range
- suitability for guiding tourists

Also assess whether written answers appear AI-generated or copied rather than original:
- overly formal or template-like phrasing
- generic textbook responses with no personal/local detail
- unnatural perfection inconsistent with a live guide response
- spoken transcripts that sound read aloud from prepared text

Pass threshold: ${LANGUAGE_TEST_CONFIG.PASS_SCORE}/100.

Questions and answers:
${questions
  .map((question, index) => {
    const answer = answers.find((item) => item.questionId === question.id);
    const answerLabel =
      question.type === QUESTION_TYPE.SPOKEN
        ? answer?.transcript || answer?.answer || "[no spoken answer]"
        : answer?.answer || "[no answer]";

    return `Q${index + 1} (${question.type}): ${question.question}
A${index + 1}: ${answerLabel}`;
  })
  .join("\n\n")}

Return ONLY valid JSON:
{
  "overallScore": 0,
  "pass": false,
  "feedback": "Short overall feedback for the guide",
  "issues": ["optional list of specific issues"],
  "likelyAiGenerated": false,
  "aiDetectionDetails": "Brief note if answers seem AI-generated or copied, otherwise empty string"
}
`.trim();
