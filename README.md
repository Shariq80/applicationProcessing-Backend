# Application Processing Backend

## Introduction

This backend system is designed to automate the process of fetching, parsing, and analyzing job applications received via email. It integrates with Gmail API for email fetching, uses OpenAI's GPT model for resume analysis, and stores processed applications in a MongoDB database.

## System Overview

The system performs the following main functions:

- Fetches unread emails from a specified Gmail account
- Parses emails to extract resume information
- Analyzes resumes using OpenAI's GPT model
- Stores processed applications in a database
- Provides APIs for managing and retrieving applications

## API Routes

### Authentication Routes

* `POST /login`: Login to the application
* `GET /google`: Authenticate with Google
* `GET /google/callback`: Handle Google authentication callback
* `GET /google/url`: Get the Google authentication URL

### Job Routes

* `POST /api/jobs`: Create a new job
* `GET /api/jobs`: Get all jobs
* `GET /api/jobs/:id`: Get a job by ID
* `PUT /api/jobs/:id`: Update a job
* `DELETE /api/jobs/:id`: Delete a job

### Application Routes

* `GET /api/applications`: Get all applications
* `GET /api/applications/:id`: Get an application by ID
* `POST /api/applications/:jobId/process-emails`: Process emails for a job
* `GET /api/applications/:id/attachment/:attachmentId`: Download an attachment for an application
* `DELETE /api/applications/:applicationId`: Delete an application

### Email Routes

* `POST /api/emails/:jobId/process-emails`: Process emails for a job
* `GET /api/emails/download-attachments/:jobId`: Download attachments for a job

### Dashboard Routes

* `GET /api/dashboard`: Get dashboard data

## Key Components

- Email Controller (emailController.js)
- Email Parser (emailParser.js)
- OpenAI Service (openaiService.js)
- Application Controller (applicationController.js)
- Data Models (Application, Job, User, GoogleCredential)

## Detailed Component Explanation

1. Email Controller (emailController.js)

The Email Controller is responsible for fetching and processing emails. Key functions include:

- fetchOAuthCredentialsFromDB: Retrieves the most recent OAuth credentials from the database.
- fetchAndProcessEmails: Fetches unread emails using Gmail API.
- Processes each email by parsing and analyzing the resume.
- Creates new Application documents in the database.
- Marks processed emails as read.
- downloadAttachments: Downloads and organizes resume attachments for a specific job.

2. Email Parser (emailParser.js)

The Email Parser extracts relevant information from emails. Key functions include:

- parseEmail: Extracts sender, subject, and body from the email.
- extractTextFromAttachment: Handles different file types (PDF, DOCX, etc.) for text extraction.

3. OpenAI Service (openaiService.js)

This service uses OpenAI's GPT model to analyze resumes. Key functions include:

- processResume: Cleans and truncates resume text.
- Sends resume and job description to OpenAI for analysis.
- Parses the API response to extract score, summary, and missing skills.
- Implements caching to avoid redundant API calls.

4. Application Controller (applicationController.js)

Handles CRUD operations for applications. Key functions include:

- getApplications: Retrieves applications for a specific job.
- updateApplicationStatus: Updates the status of an application.
- downloadAttachment: Provides functionality to download resume attachments.

## Improvements and Enhancements

- Implement batch processing for better performance with large numbers of emails.
- Add more robust error handling and logging throughout the application.
- Implement a message queue system (e.g., RabbitMQ, Redis) for better scalability of email processing.
- Enhance job title extraction logic in the email parser for improved accuracy.
- Implement more sophisticated resume parsing before sending to OpenAI, potentially using dedicated resume parsing libraries.
- Add customizable scoring criteria based on specific job requirements.
- Implement fallback analysis methods for when the OpenAI API is unavailable.
- Add pagination and more detailed filtering options for fetching applications.
- Implement API versioning for better maintainability.
- Add rate limiting to prevent API abuse.
- Implement more granular access control for different user roles.
- Set up comprehensive unit and integration testing.
- Implement continuous integration and deployment pipelines.
- Optimize database queries and implement caching where appropriate.
- Add support for multiple languages in resume processing.
- Implement a feedback mechanism to improve AI-based resume scoring over time.
