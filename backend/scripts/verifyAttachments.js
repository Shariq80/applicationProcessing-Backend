const mongoose = require('mongoose');
const Application = require('../models/Application');

mongoose.connect('your_mongodb_connection_string', { useNewUrlParser: true, useUnifiedTopology: true });

async function verifyAttachments() {
  try {
    const applications = await Application.find({});
    
    applications.forEach(app => {
      console.log(`Application ID: ${app._id}`);
      console.log(`Number of attachments: ${app.attachments.length}`);
      
      app.attachments.forEach((attachment, index) => {
        console.log(`  Attachment ${index}:`);
        console.log(`    Filename: ${attachment.filename}`);
        console.log(`    Content Type: ${attachment.contentType}`);
        console.log(`    Data length: ${attachment.data ? attachment.data.length : 'N/A'}`);
      });
      
      console.log('---');
    });
  } catch (error) {
    console.error('Error verifying attachments:', error);
  } finally {
    mongoose.disconnect();
  }
}

verifyAttachments();
