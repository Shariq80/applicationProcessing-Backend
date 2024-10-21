const simpleParser = require('mailparser').simpleParser;
const { Base64 } = require('js-base64');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');

const parseEmail = async (emailData, jobTitle, gmail, messageId) => {
  try {
    const headers = emailData.payload.headers;
    const from = headers.find(header => header.name.toLowerCase() === 'from').value;
    const subject = headers.find(header => header.name.toLowerCase() === 'subject').value;

    const applicantEmail = extractEmail(from);
    const extractedJobTitle = extractJobTitle(subject, jobTitle);

    if (!extractedJobTitle || !applicantEmail || applicantEmail.includes('noreply') || applicantEmail.includes('no-reply')) {
      console.log(`Skipping email ${messageId}: Not a valid job application`);
      return null;
    }

    let emailBody = '';
    let attachments = [];

    if (emailData.payload.parts) {
      emailBody = extractEmailBody(emailData.payload.parts);
      attachments = await extractAttachments(emailData.payload.parts, gmail, messageId);
    } else if (emailData.payload.body.data) {
      emailBody = Base64.decode(emailData.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
    }

    const parsedEmail = await simpleParser(emailBody);

    let resumeText = '';
    const resumeAttachment = findResumeAttachment(attachments);
    if (resumeAttachment && resumeAttachment.data) {
      console.log('Resume attachment found:', resumeAttachment.filename);
      resumeText = await extractTextFromAttachment(resumeAttachment);
    }

    if (!resumeText.trim()) {
      console.log('Using email body as resume text');
      resumeText = parsedEmail.text;
    }

    if (!resumeText.trim()) {
      console.log('No resume text found in email or attachments');
      return null;
    }

    return {
      applicantEmail,
      resumeText,
      extractedJobTitle,
      attachments,
    };
  } catch (error) {
    console.error('Error parsing email:', error);
    return null;
  }
};

const extractName = (from) => {
  const match = from.match(/^"?(.+?)"?\s*<.+>/);
  return match ? match[1] : from.split('@')[0];
};

const extractEmail = (from) => {
  const match = from.match(/<(.+)>/);
  return match ? match[1] : from;
};

const extractEmailBody = (parts) => {
  let body = '';
  for (const part of parts) {
    if (part.mimeType === 'text/plain' && part.body.data) {
      body += Base64.decode(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
    } else if (part.parts) {
      body += extractEmailBody(part.parts);
    }
  }
  return body;
};

const extractAttachments = async (parts, gmail, messageId) => {
  let attachments = [];
  for (const part of parts) {
    if (part.filename && part.body) {
      let attachmentData;
      if (part.body.attachmentId) {
        const attachment = await gmail.users.messages.attachments.get({
          userId: 'me',
          messageId: messageId,
          id: part.body.attachmentId
        });
        attachmentData = Buffer.from(attachment.data.data, 'base64');
      } else {
        attachmentData = Buffer.from(part.body.data, 'base64');
      }
      attachments.push({
        filename: part.filename,
        contentType: part.mimeType,
        data: attachmentData
      });
    }
  }
  return attachments;
};

const isResumeFile = (filename) => {
  const resumeExtensions = ['.pdf', '.doc', '.docx', '.txt', '.rtf'];
  return resumeExtensions.some(ext => filename.toLowerCase().endsWith(ext));
};

const findResumeAttachment = (attachments) => {
  return attachments.find(attachment => isResumeFile(attachment.filename));
};

const extractTextFromAttachment = async (attachment) => {
  if (!attachment || !attachment.data) {
    console.log('No attachment data found');
    return null;  // Return null instead of an empty string
  }

  const buffer = Buffer.from(attachment.data, 'base64');
  
  try {
    if (attachment.mimeType === 'application/pdf') {
      const data = await pdf(buffer);
      return data.text;
    } else if (attachment.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } else {
      return buffer.toString('utf8');
    }
  } catch (error) {
    console.error('Error extracting text from attachment:', error);
    return null;  // Return null if extraction fails
  }
};

const extractJobTitle = (subject, jobTitle) => {
  const subjectLower = subject.toLowerCase();
  const jobTitleLower = jobTitle.toLowerCase();
  const jobTitleWords = jobTitleLower.split(' ');
  
  if (subjectLower.includes(jobTitleLower)) {
    return jobTitle;
  }
  
  const matchedWords = jobTitleWords.filter(word => subjectLower.includes(word));
  if (matchedWords.length >= Math.ceil(jobTitleWords.length / 2) && subjectLower.includes('application')) {
    return jobTitle;
  }
  
  return null;
};

module.exports = { parseEmail };
