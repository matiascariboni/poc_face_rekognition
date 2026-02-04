# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-02-04

### Added

- Face recognition POC using AWS Rekognition
- Real-time facial analysis with webcam integration
- Identity matching against AWS Rekognition collections
- Facial attributes detection:
  - Gender detection with confidence
  - Age range estimation
  - Emotion analysis (top 3 emotions)
  - Smile detection
  - Eyeglasses/Sunglasses detection
  - Beard/Mustache detection
  - Eyes open/closed detection
  - Mouth open/closed detection
- Auto-capture system with configurable interval (default 1.5 seconds)
- Simple password-based authentication system
- Session management (in-memory, resets on server restart)
- Responsive UI optimized for widescreen displays (16:9)
- Global Smart IoT branding and design system integration
- Environment-based configuration via `env.js`
- Comprehensive logging system for debugging (console.log throughout the application)

### Technical Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Node.js with Express.js (ES6 modules)
- **AWS Services**: 
  - Amazon Rekognition (DetectFaces, SearchFacesByImage)
  - Amazon S3 (private bucket for face images storage)
- **Package Manager**: pnpm
- **Architecture**: Monolithic application (single Express server)

### Configuration

- Configurable AWS region and credentials
- Configurable Rekognition collection ID and face match threshold
- Configurable analysis capture interval
- Configurable authentication password
- S3 bucket configuration

### Security

- Password-based access control
- Session-based authentication
- Private S3 bucket (no public access required)
- IAM-based AWS resource access

[Unreleased]: https://github.com/Global-Smart-IoT/poc_face_rekognition/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/Global-Smart-IoT/poc_face_rekognition/releases/tag/v1.0.0