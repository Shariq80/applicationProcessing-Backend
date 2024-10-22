const simpleParser = require('mailparser').simpleParser;
const { Base64 } = require('js-base64');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
const { PDFExtract } = require('pdf.js-extract');
const pdfExtract = new PDFExtract();
const fs = require('fs');
const path = require('path');
const sanitize = require('sanitize-filename');

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
    } else if (emailData.payload.body && emailData.payload.body.data) {
      emailBody = Base64.decode(emailData.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
    }


    let resumeText = '';
    let attachmentFilename = '';
    const resumeAttachment = findResumeAttachment(attachments);
    if (resumeAttachment && resumeAttachment.data) {
      attachmentFilename = resumeAttachment.filename;
      
      // Save the attachment to a local directory
      const attachmentsDir = path.join(__dirname, '..', 'attachments');
      if (!fs.existsSync(attachmentsDir)) {
        fs.mkdirSync(attachmentsDir);
      }
      const filePath = path.join(attachmentsDir, `${messageId}_${resumeAttachment.filename}`);
      fs.writeFileSync(filePath, Buffer.from(resumeAttachment.data, 'base64'));
      
      // Store the filename in the parsed email data
      attachmentFilename = resumeAttachment.filename;
      
      // Extract text from the saved PDF
      resumeText = await extractTextFromAttachment(resumeAttachment);
      
      if (!resumeText) {
        console.log('Failed to extract text from attachment');
      }
    }

    if (!resumeText && emailBody && emailBody.trim().length > 0) {
      console.log('Using email body as resume text');
      resumeText = emailBody;
    }

    if (!resumeText) {
      console.log('No valid resume text found in attachment or email body');
      return null;
    }

    return {
      applicantEmail,
      resumeText,
      extractedJobTitle,
      attachmentFilename
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
    if (part.filename) {
      let attachmentData = null;
      if (part.body.attachmentId) {
        const attachment = await gmail.users.messages.attachments.get({
          userId: 'me',
          messageId: messageId,
          id: part.body.attachmentId
        });
        attachmentData = attachment.data.data;
      } else if (part.body.data) {
        attachmentData = part.body.data;
      }
      attachments.push({
        filename: part.filename,
        mimeType: part.mimeType,
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
    return null;
  }

  const buffer = Buffer.from(attachment.data, 'base64');
  
  try {
    console.log(`Attempting to extract text from ${attachment.filename} (${attachment.mimeType})`);
    let extractedText = '';

    if (attachment.mimeType === 'application/pdf') {
      const pdfData = await pdfParse(buffer);
      extractedText = pdfData.text;
    } else if (attachment.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
    } else if (attachment.mimeType === 'application/msword') {
      // For .doc files, you might need to use a different library or convert to .docx first
      console.log('DOC file detected, extraction might be limited');
      extractedText = buffer.toString('utf8');
    } else {
      extractedText = buffer.toString('utf8');
    }

    // Clean up the extracted text
    extractedText = extractedText.replace(/\s+/g, ' ').trim();
    extractedText = extractedText.replace(/[^\x20-\x7E\n]/g, '');
    return extractedText;
  } catch (error) {
    console.error(`Error extracting text from ${attachment.filename}:`, error);
    return null;
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
