const handleDownloadAttachment = async (applicationId, attachmentId) => {
  try {
    const response = await axios.get(`/api/applications/${applicationId}/attachment/${attachmentId}`, {
      responseType: 'blob'
    });
    
    const contentDisposition = response.headers['content-disposition'];
    let filename = 'download';
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    console.error('Error downloading attachment:', error);
    alert('Failed to download attachment');
  }
};
