const OpenAI = require('openai');

const openai = new OpenAI(process.env.OPENAI_API_KEY);

const processResume = async (resumeText, jobDescription) => {
  const prompt = `You are a recruiter assessing the attached resume against the provided job description. Analyze the resume objectively, highlighting matches and achievements, as well as missing aspects.
Consider the following parameters, with more weight given to critical parameters like industry relevance, key skills, and years of experience:

1. Key Skills: Exact match with the job description (JD) should get the highest weight. Penalize for skills not listed from the JD or irrelevant skills.
2. Academic Qualifications: Compare the required qualifications with actual qualifications. Lower the score for qualifications that are not relevant to the field.
3. Achievements: Focus only on achievements directly related to the JD.
4. Responsibilities: Match the responsibilities listed in the JD with those in the resume. Responsibilities not listed from the JD should penalize the score.
5. Years of Experience: Exact experience in the required field and technologies is critical. Penalize if the experience is in a different field or irrelevant technology.
6. Industry: Relevance of the candidate's industry experience to the job opening is crucial. If the candidate has no relevant industry experience, the score should be low.

Provide the following in your response:
1. A single digit numeric overall score from 1 to 10, where 1 is no match and 10 is a perfect match.
2. A 3-4 line summary of the resume against the job description, indicating whether the education and experience are relevant or not.
3. A bullet-point list of key skills or qualifications missing from the candidate's resume that are listed in the job description.

Job Description:
${jobDescription}

Resume:
${resumeText}

Response Format:
Score: [single digit numeric score]
Summary: [3-4 line summary]
Missing Skills:
- [skill 1]
- [skill 2]
- [skill 3]
`;

  const response = await openai.completions.create({
    model: "text-davinci-002",
    prompt: prompt,
    max_tokens: 300,
    n: 1,
    stop: null,
    temperature: 0.5,
  });

  const result = response.choices[0].text.trim();
  const [scorePart, summaryPart, ...skillsParts] = result.split('\n');

  const score = parseInt(scorePart.split(':')[1].trim());
  const summary = summaryPart.split(':')[1].trim();
  const missingSkills = skillsParts
    .filter(part => part.startsWith('-'))
    .map(part => part.slice(1).trim());

  return { score, summary, missingSkills };
};

module.exports = { processResume };
