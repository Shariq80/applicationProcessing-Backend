const OpenAI = require('openai');
const { getCachedAnalysis, setCachedAnalysis } = require('./cacheService');

const openai = new OpenAI(process.env.OPENAI_API_KEY);

const truncateText = (text, maxLength = 4000) => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

const processResume = async (resumeText, jobDescription) => {
  try {
    const cachedAnalysis = getCachedAnalysis(resumeText, jobDescription);
    if (cachedAnalysis) {
      return cachedAnalysis;
    }

    const prompt = `Please analyze the attached resume against the job description:

Key Skills: Match with JD gets top priority. Penalize missing or irrelevant skills.
Education: Reduce points if the candidate's education is irrelevant to the field.
Achievements: Focus on JD-related accomplishments.
Responsibilities: Compare listed duties with JD.
Experience: Assess experience in required technologies.
Industry Fit: Check relevance to the industry.

Provide:
A score from 1 to 10.
A 2-3 line summary of fit with JD.
A list of missing key skills or qualifications.

Job Description:
${jobDescription}

Resume:
${truncateText(resumeText)}

Response Format:
Score: [single digit numeric score]
Summary: [3-4 line summary]
Missing Skills:
- [skill 1]
- [skill 2]
- [skill 3]
`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful assistant that analyzes resumes." },
        { role: "user", content: prompt }
      ],
      max_tokens: 500,
      n: 1,
      temperature: 0.5,
    });

    const analysis = response.choices[0].message.content;
    const [score, summary, missingSkills] = parseAnalysis(analysis);

    const result = { score, summary, missingSkills };
    setCachedAnalysis(resumeText, jobDescription, result);
    return result;
  } catch (error) {
    console.error('Error processing resume with OpenAI:', error);
    throw error;
  }
};

const parseAnalysis = (analysis) => {
  const lines = analysis.split('\n');
  let score = 0;
  let summary = '';
  let missingSkills = [];

  for (const line of lines) {
    if (line.startsWith('Score:')) {
      score = parseInt(line.split(':')[1].trim());
    } else if (line.startsWith('Summary:')) {
      summary = line.split(':')[1].trim();
    } else if (line.startsWith('- ')) {
      missingSkills.push(line.substring(2).trim());
    }
  }

  return [score, summary, missingSkills];
};

module.exports = { processResume };
