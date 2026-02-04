export const env = {
    aws: {
        REGION: '{AWS_REGION}',
        credentials: {
            ACCESS_KEY_ID: '{AWS_ACCESS_KEY_ID}',
            SECRET_ACCESS_KEY: '{AWS_SECRET_ACCESS_KEY}'
        },
        services: {
            rekognition: {
                COLLECTION_ID: '{REKOGNITION_COLLECTION_ID}',
                FACE_MATCH_THRESHOLD: 80
            }
        }
    },
    express: {
        PORT: '~{PORT}'
    },
    analysis: {
        CAPTURE_INTERVAL_SECONDS: 1.5
    },
    auth: {
        PASSWORD: '{PASSWORD}'
    }
}