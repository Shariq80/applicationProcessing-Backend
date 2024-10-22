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


    let resumeAttachment = null;
    if (emailData.payload.parts) {
      attachments = await extractAttachments(emailData.payload.parts, gmail, messageId);
      resumeAttachment = findResumeAttachment(attachments);
    }

    let resumeText = '';
    let attachmentFilename = '';
    let attachmentData = null;
    let attachmentContentType = '';

    if (resumeAttachment && resumeAttachment.data) {
      attachmentFilename = resumeAttachment.filename;
      attachmentData = Buffer.from(resumeAttachment.data, 'base64');
      attachmentContentType = resumeAttachment.mimeType;

      // Extract text from the attachment
      resumeText = await extractTextFromAttachment(resumeAttachment);
    }

    return {
      applicantEmail,
      extractedJobTitle,
      resumeText,
      attachmentFilename,
      attachmentData,
      attachmentContentType,
      emailId: messageId
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
    let extractedText = '';

    if (attachment.mimeType === 'application/pdf') {
      const pdfData = await pdfParse(buffer);
      extractedText = pdfData.text;
    } else if (attachment.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
    } else if (attachment.mimeType === 'application/msword') {
      // For .doc files, you might need to use a different library or convert to .docx first
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
