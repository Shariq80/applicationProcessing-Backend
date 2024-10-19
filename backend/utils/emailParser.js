const simpleParser = require('mailparser').simpleParser;
const { Base64 } = require('js-base64');

const parseEmail = async (emailData) => {
  try {
    const headers = emailData.payload.headers;
    const subject = headers.find(header => header.name.toLowerCase() === 'subject').value;
    const from = headers.find(header => header.name.toLowerCase() === 'from').value;

    const applicantName = extractName(from);
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

    return {
      subject,
      applicantName,
      applicantEmail,
      emailBody: parsedEmail.text,
      htmlBody: parsedEmail.html,
      attachments
    };
  } catch (error) {
    console.error('Error parsing email:', error);
    throw new Error('Failed to parse email');
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

module.exports = { parseEmail, findResumeAttachment };