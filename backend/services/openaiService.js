const OpenAI = require('openai');
const { getCachedAnalysis, setCachedAnalysis } = require('./cacheService');

const openai = new OpenAI(process.env.OPENAI_API_KEY);

const truncateText = (text, maxLength) => {
  if (text.length <= maxLength) return text;
  return text.substr(0, maxLength) + '...';
};

const processResume = async (resumeText, jobDescription) => {
  try {
    if (!resumeText || !resumeText.trim()) {
      console.log('Invalid resume text, unable to process');
      return {
        score: 0,
        summary: "Unable to process the resume. The resume text is empty or invalid.",
        missingSkills: []
      };
    }

    // Remove any non-printable characters or PDF artifacts
    resumeText = cleanText(resumeText);

    if (resumeText.length < 50) {  // Adjust this threshold as needed
      console.log('Resume text too short, might be invalid');
      return {
        score: 0,
        summary: "The extracted resume text is too short. Please review the original document manually.",
        missingSkills: []
      };
    }

    const cachedAnalysis = getCachedAnalysis(resumeText, jobDescription);
    if (cachedAnalysis) {
      if (cachedAnalysis.score === 0 && cachedAnalysis.summary === "No summary provided by AI. Please review the application manually.") {
      } else {
        return cachedAnalysis;
      }
    }

    const cleanedResumeText = cleanText(resumeText);
    const truncatedResumeText = truncateText(cleanedResumeText, 3000); // Truncate to 3000 characters
    const prompt = `Analyze the following resume against the job description and provide a score and summary and missing skills after analysis:

Job Description:
${jobDescription}

Resume (truncated):
${truncatedResumeText}

If the resume text appears to be unreadable or contains non-text content, please indicate this in your analysis.

Provide a response in the following format:
Score: [single digit numeric score from 1 to 10]
Summary: [2 line summary of the candidate's fit with the job description]
Missing Skills:
- [skill 1]
- [skill 2]
- [skill 3]

Ensure that you always provide a response in this format, even if the resume content is unclear or incomplete.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful assistant that analyzes resumes." },
        { role: "user", content: prompt }
      ],
      max_tokens: 500,
      n: 1,
      temperature: 0.5,
    });


    const analysis = response.choices[0].message.content;

    let [score, summary, missingSkills] = parseAnalysis(analysis);

    // Ensure summary is not empty
    if (!summary || summary.trim() === '') {
      summary = "No summary provided by AI. Please review the application manually.";
    }

    const result = { score, summary, missingSkills };
    setCachedAnalysis(resumeText, jobDescription, result);
    return result;
  } catch (error) {
    console.error('Error processing resume with OpenAI:', error);
    if (error.response) {
      console.error('OpenAI API response:', error.response.data);
    }
    return {
      score: 0,
      summary: "Error occurred while processing the resume. Please review manually.",
      missingSkills: []
    };
  }
};

const parseAnalysis = (analysis) => {
  const lines = analysis.split('\n');
  let score = 0;
  let summary = '';
  let missingSkills = [];
  let inMissingSkills = false;

  for (const line of lines) {
    if (line.startsWith('Score:')) {
      score = parseInt(line.split(':')[1].trim()) || 0;
    } else if (line.startsWith('Summary:')) {
      summary = line.split(':').slice(1).join(':').trim();
    } else if (line.startsWith('Missing Skills:')) {
      inMissingSkills = true;
    } else if (inMissingSkills && line.trim().startsWith('-')) {
      missingSkills.push(line.trim().slice(1).trim());
    }
  }

  if (score === 0 || !summary) {
    console.log('Invalid analysis result:', { score, summary, missingSkills });
    throw new Error('Invalid analysis result');
  }

  return [score, summary, missingSkills];
};

const cleanText = (text) => {
  // Remove any remaining non-printable characters
  return text.replace(/[^\x20-\x7E\n]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

module.exports = { processResume };
