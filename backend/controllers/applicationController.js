const Application = require('../models/Application');
const Job = require('../models/Job');
const path = require('path');
const fs = require('fs');

const getApplications = async (req, res) => {
  try {
    const { jobTitle } = req.params;
    const job = await Job.findOne({ title: jobTitle });
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    const applications = await Application.find({ job: job._id });
    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


const downloadAttachment = async (req, res) => {
  try {
    const { id } = req.params;
    const application = await Application.findById(id);
    
    if (!application) {
      console.log('Application not found');
      return res.status(404).json({ message: 'Application not found' });
    }
    
    if (!application.attachmentData) {
      console.log('Attachment not found');
      return res.status(404).json({ message: 'Attachment not found' });
    }
    
    console.log(`Sending attachment: ${application.attachmentFilename}, ${application.attachmentContentType}`);
    res.set('Content-Type', application.attachmentContentType);
    res.set('Content-Disposition', `attachment; filename="${application.attachmentFilename}"`);
    res.send(application.attachmentData);
  } catch (error) {
    console.error('Error downloading attachment:', error);
    res.status(500).json({ message: error.message });
  }
};

const deleteApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    
    // Find the application
    const application = await Application.findById(applicationId);
    
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }
    
    // Check if the user is authorized to delete this application
    const job = await Job.findById(application.job);
    if (!job || job.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this application' });
    }
    
    // Delete the application
    await Application.findByIdAndDelete(applicationId);
    
    // Delete associated attachment if it exists
    if (application.attachmentFilename) {
      const attachmentPath = path.join(__dirname, '..', 'attachments', `${application.emailId}_${application.attachmentFilename}`);
      if (fs.existsSync(attachmentPath)) {
        fs.unlinkSync(attachmentPath);
      }
    }
    
    res.json({ message: 'Application deleted successfully' });
  } catch (error) {
    console.error('Error deleting application:', error);
    res.status(500).json({ message: 'Error deleting application', error: error.message });
  }
};

const parseResume = async (req, res) => {
  try {
    const { id } = req.params;
    const application = await Application.findById(id);
    
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (!application.attachmentData) {
      return res.status(400).json({ message: 'No attachment found for this application' });
    }

    const resumeText = await extractTextFromAttachment({
      data: application.attachmentData.toString('base64'),
      mimeType: application.attachmentContentType,
      filename: application.attachmentFilename
    });

    if (!resumeText) {
      return res.status(500).json({ message: 'Failed to extract text from the resume' });
    }

    application.resumeText = resumeText;
    await application.save();

    res.json({ message: 'Resume parsed successfully', resumeText });
  } catch (error) {
    console.error('Error parsing resume:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getApplications, downloadAttachment, deleteApplication, parseResume };
