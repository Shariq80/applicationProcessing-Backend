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
    const { id, attachmentId } = req.params;
    const application = await Application.findById(id);
    
    if (!application) {
      console.log('Application not found');
      return res.status(404).json({ message: 'Application not found' });
    }
    
    const attachment = application.attachments.id(attachmentId);
    
    if (!attachment) {
      console.log('Attachment not found');
      return res.status(404).json({ message: 'Attachment not found' });
    }
    
    console.log(`Sending attachment: ${attachment.filename}, ${attachment.contentType}`);
    res.set('Content-Type', attachment.contentType);
    res.set('Content-Disposition', `attachment; filename="${attachment.filename}"`);
    res.send(attachment.data);
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

module.exports = { getApplications, downloadAttachment, deleteApplication };
