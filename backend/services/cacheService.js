const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 3600 }); // Cache for 1 hour

const getCachedAnalysis = (resumeText, jobDescription) => {
  const key = `${resumeText.slice(0, 100)}:${jobDescription.slice(0, 100)}`;
  return cache.get(key);
};

const setCachedAnalysis = (resumeText, jobDescription, analysis) => {
  const key = `${resumeText.slice(0, 100)}:${jobDescription.slice(0, 100)}`;
  cache.set(key, analysis);
};

module.exports = { getCachedAnalysis, setCachedAnalysis };

