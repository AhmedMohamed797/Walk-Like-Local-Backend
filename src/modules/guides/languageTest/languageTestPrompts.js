import {
  getLanguageDisplayName,
  LANGUAGE_TEST_CONFIG,
  QUESTION_TYPE,
} from "../../../constants/languageTestConstants.js";

export const buildQuestionGenerationPrompt = (languageCode) => {
  const language = getLanguageDisplayName(languageCode);

  return `
You are creating a language proficiency test for licensed Egyptian tour guides.
These guides lead tourists across Egypt's major destinations: the Giza Pyramids, the Egyptian Museum, Luxor and Karnak temples, the Valley of the Kings, Abu Simbel, Islamic Cairo, Coptic Cairo, Alexandria, the Nile, and Red Sea resorts.

Generate exactly ${LANGUAGE_TEST_CONFIG.QUESTIONS_COUNT} questions in ${language}:
- ${LANGUAGE_TEST_CONFIG.WRITTEN_QUESTIONS_COUNT} written questions (type: "written")
- ${LANGUAGE_TEST_CONFIG.SPOKEN_QUESTIONS_COUNT} spoken questions (type: "spoken") that the guide must answer by voice

Written question requirements — vary across these categories:
- Egyptian history and heritage: pharaonic dynasties, Islamic history, Coptic history, famous monuments, archaeological facts
- Tourism vocabulary: terms a guide uses daily when describing sites, artefacts, or itineraries
- Practical scenarios: a tourist asks a difficult question on-site, a group is running late, handling cultural misunderstandings
- Cultural sensitivity: local customs, dress codes at religious sites, Ramadan etiquette, tipping norms in Egypt

Spoken question requirements — must be natural, pronunciation-friendly, and reflect real guiding situations:
- Welcoming a group and introducing a major Egyptian site
- Explaining the significance of a specific monument or artefact out loud
- Handling a tourist complaint or unexpected situation on a tour
- Describing Egyptian food, traditions, or daily life to foreign visitors

Rules:
- All questions must be written entirely in ${language}
- Do not include answers or hints
- Do not repeat the same site or scenario across questions
- Keep each question clear and realistic for an active Egyptian tour guide

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
};

export const buildEvaluationPrompt = (languageCode, questions, answers) => {
  const language = getLanguageDisplayName(languageCode);

  return `
You are evaluating a licensed Egyptian tour guide's ${language} language proficiency test.
This guide works in Egypt and leads tourists at sites such as the Giza Pyramids, Luxor temples, the Egyptian Museum, Islamic Cairo, and Nile cruises.

Score from 0 to 100 using these weighted criteria:

Language accuracy (35 points):
- Grammar and spelling for written answers
- Pronunciation clarity and fluency for spoken answers (judge from transcript)
- Sentence structure and coherence

Egyptian tourism vocabulary (25 points):
- Correct use of terms related to Egyptian history, monuments, and culture
- Ability to describe pharaonic, Islamic, and Coptic heritage accurately
- Use of professional guiding language suitable for international tourists

Practical guiding ability (25 points):
- Answers reflect real on-site guiding experience in Egypt
- Responses are helpful, accurate, and tourist-friendly
- Appropriate handling of cultural topics (religion, customs, history)
- Shows awareness of Egyptian tourism norms (tipping, dress codes, site rules)

Authenticity and originality (15 points):
- Answers sound like a real working guide, not a textbook or AI
- Personal or local detail that only a practicing Egyptian guide would know
- Natural spoken delivery, not a recited script

Deduct points and flag if any of the following are detected:
- Generic or template-like answers with no Egypt-specific detail
- Historically inaccurate statements about Egyptian sites or culture
- Answers that could apply to any country, not specifically Egypt
- Spoken transcripts that sound read from a prepared script
- Responses that appear AI-generated or copied

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
};
