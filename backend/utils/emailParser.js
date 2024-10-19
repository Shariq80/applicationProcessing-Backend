const simpleParser = require('mailparser').simpleParser;
const { Base64 } = require('js-base64');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');

const parseEmail = async (emailData) => {
  try {
    const headers = emailData.payload.headers;
    const from = headers.find(header => header.name.toLowerCase() === 'from').value;

    const applicantEmail = extractEmail(from);

    let emailBody = '';
    let attachments = [];

    if (emailData.payload.parts) {
      emailBody = extractEmailBody(emailData.payload.parts);
      attachments = await extractAttachments(emailData.payload.parts);
    } else if (emailData.payload.body.data) {
      emailBody = Base64.decode(emailData.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
    }

    const parsedEmail = await simpleParser(emailBody);

    const resumeAttachment = findResumeAttachment(attachments);
    let resumeText = '';
    if (resumeAttachment) {
      console.log('Resume attachment found:', resumeAttachment.filename);
      resumeText = await extractTextFromAttachment(resumeAttachment);
    }

    if (!resumeText) {
      console.log('Using email body as resume text');
      resumeText = parsedEmail.text;
    }

    return {
      applicantEmail,
      resumeText,
    };
  } catch (error) {
    console.error('Error parsing email:', error);
    throw new Error('Failed to parse email: ' + error.message);
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

const extractAttachments = async (parts) => {
  let attachments = [];
  for (const part of parts) {
    if (part.filename && part.body) {
      const attachment = {
        filename: part.filename,
        mimeType: part.mimeType,
        size: part.body.size,
        data: part.body.attachmentId ? null : part.body.data
      };
      attachments.push(attachment);
    } else if (part.parts) {
      attachments = attachments.concat(await extractAttachments(part.parts));
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

module.exports = { parseEmail };
